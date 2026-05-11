import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const get = query({
  args: { useStaged: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const table = args.useStaged ? "inventory_staged" : "inventory";
    const items = await ctx.db.query(table).collect();

    const allImages = await ctx.db.query("images").collect();

    return await Promise.all(items.map(async (item) => {
      const stains = await Promise.all(item.stains.map(async (stain) => {
        let imageUrl = stain.image;
        if (imageUrl && !imageUrl.startsWith('http')) {
          try {
            const url = await ctx.storage.getUrl(imageUrl as any);
            imageUrl = url || imageUrl;
          } catch (e) {
            // keep as-is
          }
        }

        const matchingImages = allImages
          .filter(img =>
            img.cribName === item.cribName &&
            img.wood === item.wood &&
            img.stainName === stain.name
          )
          .sort((a, b) => a.order - b.order);

        const gallery = (await Promise.all(matchingImages.map(async (img) => {
          try {
            const url = await ctx.storage.getUrl(img.storageId as any);
            return url ? { id: img._id, url, originalName: img.originalName } : null;
          } catch {
            return null;
          }
        }))).filter(Boolean) as { id: string; url: string; originalName: string }[];

        return {
          ...stain,
          image: imageUrl || stain.image,
          gallery: gallery.length > 0 ? gallery : undefined,
        };
      }));
      return { ...item, stains };
    }));
  },
});

export const save = mutation({
  args: { 
    password: v.string(),
    inventory: v.array(v.any())
  },
  handler: async (ctx, args) => {
    if (args.password !== (process.env.VITE_ADMIN_PASSWORD || 'heirloom2024')) throw new Error("Unauthorized");
    
    const existing = await ctx.db.query("inventory_staged").collect();
    for (const doc of existing) {
      await ctx.db.delete(doc._id);
    }
    
    for (const item of args.inventory) {
      if (!item.cribName || !item.wood) continue;
      
      await ctx.db.insert("inventory_staged", {
        cribName: String(item.cribName),
        wood: String(item.wood),
        description: item.description ? String(item.description) : undefined,
        basePrice: typeof item.basePrice === 'number' ? item.basePrice : 2499,
        stains: (item.stains || []).map((s: any) => ({
          name: s.name ? String(s.name) : "Default",
          inStock: typeof s.inStock === 'boolean' ? s.inStock : true,
          priceAddition: typeof s.priceAddition === 'number' ? s.priceAddition : 0,
          image: s.image ? String(s.image) : undefined
        })),
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
    
    const live = await ctx.db.query("inventory").collect();
    for (const doc of live) await ctx.db.delete(doc._id);
    
    const staged = await ctx.db.query("inventory_staged").collect();
    for (const item of staged) {
      await ctx.db.insert("inventory", {
        cribName: item.cribName,
        wood: item.wood,
        description: item.description,
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

    const images = await ctx.db.query("images").withIndex("by_crib", q => q.eq("cribName", args.oldName)).collect();
    for (const img of images) {
      await ctx.db.patch(img._id, { cribName: args.newName });
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
