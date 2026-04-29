import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const get = query({
  args: { useStaged: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const table = args.useStaged ? "settings_staged" : "settings";
    const settings = await ctx.db.query(table).first();
    return settings || { paymentProvider: "paypal" };
  },
});

export const save = mutation({
  args: { password: v.string(), paymentProvider: v.string() },
  handler: async (ctx, args) => {
    if (args.password !== (process.env.VITE_ADMIN_PASSWORD || 'heirloom2024')) throw new Error("Unauthorized");
    const existing = await ctx.db.query("settings_staged").first();
    if (existing) {
      await ctx.db.patch(existing._id, { paymentProvider: args.paymentProvider });
    } else {
      await ctx.db.insert("settings_staged", { paymentProvider: args.paymentProvider });
    }
  },
});

export const publish = mutation({
  args: { password: v.string() },
  handler: async (ctx, args) => {
    if (args.password !== (process.env.VITE_ADMIN_PASSWORD || 'heirloom2024')) throw new Error("Unauthorized");
    
    // Copy staged to live
    const staged = await ctx.db.query("settings_staged").first();
    if (staged) {
      const live = await ctx.db.query("settings").first();
      if (live) {
        await ctx.db.patch(live._id, { paymentProvider: staged.paymentProvider });
      } else {
        await ctx.db.insert("settings", { paymentProvider: staged.paymentProvider });
      }
    }
  }
});

export const verifyPassword = mutation({
  args: { password: v.string() },
  handler: async (_ctx, args) => {
    return args.password === (process.env.VITE_ADMIN_PASSWORD || 'heirloom2024');
  }
});
