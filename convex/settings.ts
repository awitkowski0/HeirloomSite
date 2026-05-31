import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const get = query({
  args: {},
  handler: async (ctx) => {
    const settings = await ctx.db.query("settings").first();
    return settings || { paymentProvider: "paypal" };
  },
});

export const save = mutation({
  args: { password: v.string(), paymentProvider: v.string() },
  handler: async (ctx, args) => {
    if (!process.env.ADMIN_PASSWORD || args.password !== process.env.ADMIN_PASSWORD) throw new Error("Unauthorized");
    const existing = await ctx.db.query("settings").first();
    if (existing) {
      await ctx.db.patch(existing._id, { paymentProvider: args.paymentProvider });
    } else {
      await ctx.db.insert("settings", { paymentProvider: args.paymentProvider });
    }
  },
});

export const verifyPassword = mutation({
  args: { password: v.string() },
  handler: async (_ctx, args) => {
    return !!process.env.ADMIN_PASSWORD && args.password === process.env.ADMIN_PASSWORD;
  }
});
