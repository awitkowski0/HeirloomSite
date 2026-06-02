import Stripe from "stripe";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { readFileSync } from "fs";
import { join } from "path";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-12-18.acacia" as any,
});

function calculateCartTotal(cart: any[], inventory: any[]) {
  let subtotal = 0;
  for (const item of cart) {
    const config = inventory.find(
      (i: any) => (i.productName ?? i.cribName) === item.productName && i.wood === item.wood
    );
    if (!config) throw new Error(`Product not found: ${item.productName} / ${item.wood}`);
    const stain = config.stains.find((s: any) => s.name === item.stainName);
    if (!stain) throw new Error(`Stain not found: ${item.stainName}`);
    const itemPrice = (config.basePrice || 0) + (stain.priceAddition || 0);
    subtotal += itemPrice * (item.quantity || 1);
  }
  const shipping = 150;
  const tax = Math.round(subtotal * 0.08);
  return { subtotal, shipping, tax, total: subtotal + shipping + tax };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { cart } = req.body;
    if (!cart || !Array.isArray(cart) || cart.length === 0) {
      return res.status(400).json({ error: "Cart is required" });
    }

    const inventoryPath = join(process.cwd(), "data", "inventory.json");
    let inventory: any[];
    try {
      inventory = JSON.parse(readFileSync(inventoryPath, "utf-8"));
    } catch {
      inventory = [];
    }
    const { total } = calculateCartTotal(cart, inventory);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: total * 100,
      currency: "usd",
      automatic_payment_methods: { enabled: true },
    });

    return res.status(200).json({ clientSecret: paymentIntent.client_secret });
  } catch (err: any) {
    console.error("createPaymentIntent error:", err);
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
}
