import { sql } from "@vercel/postgres";
import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { id } = req.query;

    if (!id || typeof id !== "string") {
      return res.status(400).json({ error: "Order ID is required" });
    }

    const result = await sql`SELECT * FROM orders WHERE id = ${id}`;

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Order not found" });
    }

    const order = result.rows[0];
    return res.status(200).json({
      id: order.id,
      email: order.email,
      firstName: order.first_name,
      lastName: order.last_name,
      address: order.address,
      city: order.city,
      state: order.state,
      zip: order.zip,
      items: order.items,
      subtotal: order.subtotal,
      shipping: order.shipping,
      tax: order.tax,
      total: order.total,
      paymentIntentId: order.payment_intent_id,
      status: order.status,
    });
  } catch (err: any) {
    console.error("getOrder error:", err);
    if (err.message?.includes('relation "orders" does not exist')) {
      return res.status(500).json({
        error: "Database not configured. Run the schema setup first.",
        detail: err.message,
      });
    }
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
}
