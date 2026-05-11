import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const save = mutation({
  args: {
    email: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    address: v.string(),
    city: v.string(),
    state: v.string(),
    zip: v.string(),
    items: v.array(v.object({
      cribName: v.string(),
      wood: v.string(),
      stainName: v.string(),
      price: v.number(),
      image: v.string(),
      quantity: v.number(),
    })),
    subtotal: v.number(),
    shipping: v.number(),
    tax: v.number(),
    total: v.number(),
    paymentIntentId: v.string(),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    const orderId = await ctx.db.insert("orders", {
      email: args.email,
      firstName: args.firstName,
      lastName: args.lastName,
      address: args.address,
      city: args.city,
      state: args.state,
      zip: args.zip,
      items: args.items,
      subtotal: args.subtotal,
      shipping: args.shipping,
      tax: args.tax,
      total: args.total,
      paymentIntentId: args.paymentIntentId,
      status: args.status,
    });
    return orderId;
  },
});

export const get = query({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.orderId);
  },
});
