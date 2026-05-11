import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("stain_types").order("asc").collect();
  },
});

export const getByName = query({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db.query("stain_types").withIndex("by_name", q => q.eq("name", args.name)).first();
  },
});

export const save = mutation({
  args: {
    password: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    color: v.optional(v.string()),
    defaultPriceAddition: v.number(),
  },
  handler: async (ctx, args) => {
    if (args.password !== (process.env.VITE_ADMIN_PASSWORD || 'heirloom2024')) throw new Error("Unauthorized");

    const existing = await ctx.db.query("stain_types").withIndex("by_name", q => q.eq("name", args.name)).first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        description: args.description,
        color: args.color,
        defaultPriceAddition: args.defaultPriceAddition,
      });
    } else {
      await ctx.db.insert("stain_types", {
        name: args.name,
        description: args.description,
        color: args.color,
        defaultPriceAddition: args.defaultPriceAddition,
      });
    }
  },
});

export const remove = mutation({
  args: {
    password: v.string(),
    id: v.id("stain_types"),
  },
  handler: async (ctx, args) => {
    if (args.password !== (process.env.VITE_ADMIN_PASSWORD || 'heirloom2024')) throw new Error("Unauthorized");
    await ctx.db.delete(args.id);
  },
});

export const autoDiscover = mutation({
  args: { password: v.string() },
  handler: async (ctx, args) => {
    if (args.password !== (process.env.VITE_ADMIN_PASSWORD || 'heirloom2024')) throw new Error("Unauthorized");

    const items = await ctx.db.query("inventory").collect();
    const stainNames = new Set<string>();
    for (const item of items) {
      for (const stain of item.stains) {
        stainNames.add(stain.name);
      }
    }

    const existingTypes = await ctx.db.query("stain_types").collect();
    const existingNames = new Set(existingTypes.map(s => s.name.toLowerCase()));

    for (const name of stainNames) {
      if (!existingNames.has(name.toLowerCase())) {
        await ctx.db.insert("stain_types", {
          name,
          description: undefined,
          color: undefined,
          defaultPriceAddition: 0,
        });
      }
    }
  },
});

export const populateFromInventory = mutation({
  args: { password: v.string() },
  handler: async (ctx, args) => {
    if (args.password !== (process.env.VITE_ADMIN_PASSWORD || 'heirloom2024')) throw new Error("Unauthorized");

    const items = await ctx.db.query("inventory").collect();
    const existingTypes = await ctx.db.query("stain_types").collect();
    const existingNames = new Set(existingTypes.map(s => s.name.toLowerCase()));

    for (const item of items) {
      for (const stain of item.stains) {
        let stainTypeId: string | null = null;

        if (existingNames.has(stain.name.toLowerCase())) {
          const existing = existingTypes.find(s => s.name.toLowerCase() === stain.name.toLowerCase());
          if (existing) stainTypeId = existing._id;
        } else {
          const newId = await ctx.db.insert("stain_types", {
            name: stain.name,
            description: undefined,
            color: undefined,
            defaultPriceAddition: stain.priceAddition,
          });
          stainTypeId = newId;
          existingNames.add(stain.name.toLowerCase());
          existingTypes.push({ _id: newId as any, name: stain.name, description: undefined, color: undefined, defaultPriceAddition: stain.priceAddition, _creationTime: Date.now() });
        }

        if (stain.image && stainTypeId) {
          const existingImages = await ctx.db.query("images")
            .withIndex("by_stain", q => q.eq("stainName", stain.name))
            .collect();

          if (existingImages.length === 0) {
            await ctx.db.insert("images", {
              cribName: item.cribName,
              wood: item.wood,
              stainName: stain.name,
              storageId: stain.image,
              originalName: `${stain.name}.jpg`,
              mimeType: "image/jpeg",
              size: 0,
              order: 0,
              altText: undefined,
              source: "migration",
            });
          }
        }
      }
    }
  },
});
