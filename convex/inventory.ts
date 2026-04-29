import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const get = query({
  args: { useStaged: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    if (args.useStaged) {
      return await ctx.db.query("inventory_staged").collect();
    }
    return await ctx.db.query("inventory").collect();
  },
});

export const save = mutation({
  args: { 
    password: v.string(),
    inventory: v.array(v.object({
      cribName: v.string(),
      wood: v.string(),
      basePrice: v.number(),
      stains: v.array(v.object({
        name: v.string(),
        inStock: v.boolean(),
        priceAddition: v.number(),
        image: v.optional(v.string())
      }))
    }))
  },
  handler: async (ctx, args) => {
    if (args.password !== (process.env.VITE_ADMIN_PASSWORD || 'heirloom2024')) throw new Error("Unauthorized");
    const existing = await ctx.db.query("inventory_staged").collect();
    for (const doc of existing) {
      await ctx.db.delete(doc._id);
    }
    for (const item of args.inventory) {
      await ctx.db.insert("inventory_staged", {
        cribName: item.cribName,
        wood: item.wood,
        basePrice: item.basePrice,
        stains: item.stains,
      });
    }
  },
});

export const generateUploadUrl = mutation({
  args: { password: v.string() },
  handler: async (ctx, args) => {
    if (args.password !== (process.env.VITE_ADMIN_PASSWORD || 'heirloom2024')) throw new Error("Unauthorized");
    return await ctx.storage.generateUploadUrl();
  }
});

export const publish = mutation({
  args: { password: v.string() },
  handler: async (ctx, args) => {
    if (args.password !== (process.env.VITE_ADMIN_PASSWORD || 'heirloom2024')) throw new Error("Unauthorized");
    
    // Wipe live
    const live = await ctx.db.query("inventory").collect();
    for (const doc of live) await ctx.db.delete(doc._id);
    
    // Copy staged to live
    const staged = await ctx.db.query("inventory_staged").collect();
    for (const item of staged) {
      await ctx.db.insert("inventory", {
        cribName: item.cribName,
        wood: item.wood,
        basePrice: item.basePrice,
        stains: item.stains,
      });
    }
  }
});

export const updateCribName = mutation({
  args: { password: v.string(), oldName: v.string(), newName: v.string() },
  handler: async (ctx, args) => {
    if (args.password !== (process.env.VITE_ADMIN_PASSWORD || 'heirloom2024')) throw new Error("Unauthorized");
    const items = await ctx.db.query("inventory_staged").filter(q => q.eq(q.field("cribName"), args.oldName)).collect();
    for (const item of items) {
      await ctx.db.patch(item._id, { cribName: args.newName });
    }
  }
});

export const updateBasePrice = mutation({
  args: { password: v.string(), cribName: v.string(), wood: v.string(), newPrice: v.number() },
  handler: async (ctx, args) => {
    if (args.password !== (process.env.VITE_ADMIN_PASSWORD || 'heirloom2024')) throw new Error("Unauthorized");
    const items = await ctx.db.query("inventory_staged")
      .filter(q => q.eq(q.field("cribName"), args.cribName))
      .filter(q => q.eq(q.field("wood"), args.wood))
      .collect();
    for (const item of items) {
      await ctx.db.patch(item._id, { basePrice: args.newPrice });
    }
  }
});
