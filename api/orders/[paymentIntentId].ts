import Stripe from "stripe";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createHmac, timingSafeEqual } from "crypto";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-12-18.acacia" as any,
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { paymentIntentId, token } = req.query;

    if (!paymentIntentId || typeof paymentIntentId !== "string") {
      return res.status(400).json({ error: "PaymentIntent ID is required" });
    }

    if (!token || typeof token !== "string") {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const expectedToken = createHmac("sha256", process.env.STRIPE_SECRET_KEY!)
      .update(paymentIntentId)
      .digest("hex");

    // Prevent IDOR by verifying HMAC capability token. Check buffer byte lengths to prevent timingSafeEqual TypeError.
    const tokenBuffer = Buffer.from(token);
    const expectedTokenBuffer = Buffer.from(expectedToken);
    if (tokenBuffer.length !== expectedTokenBuffer.length || !timingSafeEqual(tokenBuffer, expectedTokenBuffer)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    const meta = paymentIntent.metadata;

    if (!meta.items) {
      return res.status(404).json({ error: "Order not found" });
    }

    return res.status(200).json({
      paymentIntentId: paymentIntent.id,
      status: paymentIntent.status === "succeeded" ? "confirmed" : paymentIntent.status,
      email: meta.email,
      firstName: meta.firstName,
      lastName: meta.lastName,
      address: meta.address,
      city: meta.city,
      state: meta.state,
      zip: meta.zip,
      items: JSON.parse(meta.items),
      subtotal: Number(meta.subtotal),
      shipping: Number(meta.shipping),
      tax: Number(meta.tax),
      total: Number(meta.total),
    });
  } catch (err: any) {
    console.error("getOrder error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
