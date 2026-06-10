import Stripe from "stripe";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { readFileSync } from "fs";
import { join } from "path";
import crypto from "crypto";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-12-18.acacia" as any,
});

function lookupPrices(cart: any[], inventory: any[]) {
  return cart.map((item: any) => {
    const config = inventory.find(
      (i: any) => i.productName === item.productName && i.wood === item.wood
    );
    if (!config) throw new Error(`Product not found: ${item.productName} / ${item.wood}`);
    const stain = config.stains.find((s: any) => s.name === item.stainName);
    if (!stain) throw new Error(`Stain not found: ${item.stainName}`);

    // Security enhancement: Prevent logic bypass via tampered quantity
    let quantity = 1;
    if (item.quantity !== undefined) {
      if (typeof item.quantity !== 'number' || !Number.isInteger(item.quantity) || item.quantity <= 0) {
        throw new Error(`Invalid quantity provided for ${item.productName}`);
      }
      quantity = item.quantity;
    }

    const price = (config.basePrice || 0) + (stain.priceAddition || 0);
    return { price, quantity };
  });
}

function calculateCartTotal(cart: any[], inventory: any[]) {
  const priced = lookupPrices(cart, inventory);
  const subtotal = priced.reduce((sum: number, p: any) => sum + p.price * p.quantity, 0);
  const shipping = 150;
  const tax = Math.round(subtotal * 0.08);
  return { priced, subtotal, shipping, tax, total: subtotal + shipping + tax };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { cart, email, firstName, lastName, address, city, state, zip } = req.body;

    if (!cart || !Array.isArray(cart) || cart.length === 0) {
      return res.status(400).json({ error: "Cart is required" });
    }
    if (!email || !firstName || !lastName || !address || !city || !state || !zip) {
      return res.status(400).json({ error: "Shipping information is required" });
    }

    const inventoryPath = join(process.cwd(), "public", "data", "inventory.json");
    let inventory: any[];
    try {
      inventory = JSON.parse(readFileSync(inventoryPath, "utf-8"));
    } catch {
      inventory = [];
    }
    const { priced, subtotal, shipping, tax, total } = calculateCartTotal(cart, inventory);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: total * 100,
      currency: "usd",
      automatic_payment_methods: { enabled: true },
      metadata: {
        email,
        firstName,
        lastName,
        address,
        city,
        state,
        zip,
        subtotal: String(subtotal),
        shipping: String(shipping),
        tax: String(tax),
        total: String(total),
        items: JSON.stringify(cart.map((item: any, i: number) => ({
          productName: item.productName,
          wood: item.wood,
          stainName: item.stainName,
          price: priced[i].price,
          image: item.image,
          quantity: priced[i].quantity,
          addons: item.addons || [],
        }))),
      },
    });

    const token = crypto
      .createHmac("sha256", process.env.STRIPE_SECRET_KEY!)
      .update(paymentIntent.id)
      .digest("hex");

    return res.status(200).json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      token,
    });
  } catch (err: any) {
    console.error("createPaymentIntent error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
