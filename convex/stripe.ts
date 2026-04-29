import { action } from "./_generated/server";
import { v } from "convex/values";
import Stripe from "stripe";

export const createPaymentIntent = action({
  args: { amount: v.number(), currency: v.string() },
  handler: async (_ctx, args) => {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2024-12-18.acacia" as any,
    });
    const paymentIntent = await stripe.paymentIntents.create({
      amount: args.amount,
      currency: args.currency,
      automatic_payment_methods: {
        enabled: true,
      },
    });
    return { clientSecret: paymentIntent.client_secret };
  },
});
