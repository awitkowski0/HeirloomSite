import { sql } from "@vercel/postgres";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { readFileSync } from "fs";
import { join } from "path";

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
    const { email, firstName, lastName, address, city, state, zip, cart, paymentIntentId } = req.body;

    if (!email || !firstName || !lastName || !address || !city || !state || !zip || !cart || !paymentIntentId) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const inventoryPath = join(process.cwd(), "data", "inventory.json");
    let inventory: any[];
    try {
      inventory = JSON.parse(readFileSync(inventoryPath, "utf-8"));
    } catch {
      inventory = [];
    }
    const recalculated = calculateCartTotal(cart, inventory);

    const items = cart.map((item: any) => ({
      productName: item.productName,
      wood: item.wood,
      stainName: item.stainName,
      price: (inventory.find(
        (i: any) => (i.productName ?? i.cribName) === item.productName && i.wood === item.wood
      )?.basePrice || 0) + (inventory.find(
        (i: any) => (i.productName ?? i.cribName) === item.productName && i.wood === item.wood
      )?.stains.find((s: any) => s.name === item.stainName)?.priceAddition || 0),
      image: item.image || "",
      quantity: item.quantity || 1,
      addons: item.addons || [],
    }));

    const result = await sql`
      INSERT INTO orders (email, first_name, last_name, address, city, state, zip, items, subtotal, shipping, tax, total, payment_intent_id, status)
      VALUES (${email}, ${firstName}, ${lastName}, ${address}, ${city}, ${state}, ${zip}, ${JSON.stringify(items)}, ${recalculated.subtotal}, ${recalculated.shipping}, ${recalculated.tax}, ${recalculated.total}, ${paymentIntentId}, 'confirmed')
      RETURNING id
    `;

    return res.status(200).json({ orderId: result.rows[0].id });
  } catch (err: any) {
    console.error("saveOrder error:", err);
    if (err.message?.includes('relation "orders" does not exist')) {
      return res.status(500).json({
        error: "Database not configured. Run the schema setup first.",
        detail: err.message,
      });
    }
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
}
