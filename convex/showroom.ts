import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const get = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("showroom").first();
  },
});

export const save = mutation({
  args: {
    password: v.string(),
    image: v.string(),
    spots: v.array(v.object({
      x: v.number(),
      y: v.number(),
      productName: v.string(),
    }))
  },
  handler: async (ctx, args) => {
    if (args.password !== (process.env.VITE_ADMIN_PASSWORD || 'heirloom2024')) throw new Error("Unauthorized");
    
    const existing = await ctx.db.query("showroom").first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        image: args.image,
        spots: args.spots,
      });
    } else {
      await ctx.db.insert("showroom", {
        image: args.image,
        spots: args.spots,
      });
    }
  },
});
