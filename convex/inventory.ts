import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const get = query({
  args: { useStaged: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    let items = args.useStaged
      ? await ctx.db.query("inventory_staged" as any).collect()
      : await ctx.db.query("inventory").collect();

    items = (items as any[]).sort((a: any, b: any) => (a.order ?? 9999) - (b.order ?? 9999));

    const allImages = await ctx.db.query("images").collect();

    return await Promise.all(items.map(async (item: any) => {
      const stains = await Promise.all(item.stains.map(async (stain: any) => {
        let imageUrl = stain.image;
        if (imageUrl && !imageUrl.startsWith('http')) {
          try {
            const url = await ctx.storage.getUrl(imageUrl);
            imageUrl = url || imageUrl;
          } catch (e) {
          }
        }

        const matchingImages = allImages
          .filter((img: any) =>
            img.cribName === item.cribName &&
            img.wood === item.wood &&
            img.stainName === stain.name
          )
          .sort((a: any, b: any) => a.order - b.order);

        const gallery = (await Promise.all(matchingImages.map(async (img: any) => {
          try {
            const url = await ctx.storage.getUrl(img.storageId);
            return url ? { id: img._id, url, originalName: img.originalName } : null;
          } catch {
            return null;
          }
        }))).filter(Boolean);

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
    
    const existing = await ctx.db.query("inventory_staged" as any).collect();
    for (const doc of existing) {
      await ctx.db.delete(doc._id);
    }
    
    for (const item of args.inventory) {
      if (!item.cribName || !item.wood) continue;
      
      await ctx.db.insert("inventory_staged" as any, {
        cribName: String(item.cribName),
        wood: String(item.wood),
        description: item.description ? String(item.description) : undefined,
        basePrice: typeof item.basePrice === 'number' ? item.basePrice : 2499,
        category: item.category ? String(item.category) : undefined,
        order: typeof item.order === 'number' ? item.order : undefined,
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
    
    const staged = await ctx.db.query("inventory_staged" as any).collect();
    for (const item of staged) {
      await ctx.db.insert("inventory", {
        cribName: item.cribName,
        wood: item.wood,
        description: item.description,
        basePrice: item.basePrice,
        category: item.category,
        order: item.order,
        stains: item.stains,
      });
    }
  }
});

export const updateCribName = mutation({
  args: { password: v.string(), oldName: v.string(), newName: v.string() },
  handler: async (ctx, args) => {
    if (args.password !== (process.env.VITE_ADMIN_PASSWORD || 'heirloom2024')) throw new Error("Unauthorized");
    const items = await ctx.db.query("inventory_staged" as any).filter((q: any) => q.eq(q.field("cribName"), args.oldName)).collect();
    for (const item of items) {
      await ctx.db.patch(item._id, { cribName: args.newName });
    }

    const images = await ctx.db.query("images").withIndex("by_crib", (q: any) => q.eq("cribName", args.oldName)).collect();
    for (const img of images) {
      await ctx.db.patch(img._id, { cribName: args.newName });
    }
  }
});

export const deleteCrib = mutation({
  args: { password: v.string(), cribName: v.string() },
  handler: async (ctx, args) => {
    if (args.password !== (process.env.VITE_ADMIN_PASSWORD || 'heirloom2024')) throw new Error("Unauthorized");

    const stagedItems = await ctx.db.query("inventory_staged" as any).filter((q: any) => q.eq(q.field("cribName"), args.cribName)).collect();
    for (const item of stagedItems) {
      await ctx.db.delete(item._id);
    }

    const images = await ctx.db.query("images").withIndex("by_crib", (q: any) => q.eq("cribName", args.cribName)).collect();
    for (const img of images) {
      await ctx.storage.delete(img.storageId as any);
      await ctx.db.delete(img._id);
    }
  }
});

export const deleteWood = mutation({
  args: { password: v.string(), cribName: v.string(), wood: v.string() },
  handler: async (ctx, args) => {
    if (args.password !== (process.env.VITE_ADMIN_PASSWORD || 'heirloom2024')) throw new Error("Unauthorized");

    const stagedItems = await ctx.db.query("inventory_staged" as any)
      .filter((q: any) => q.eq(q.field("cribName"), args.cribName))
      .filter((q: any) => q.eq(q.field("wood"), args.wood))
      .collect();
    for (const item of stagedItems) {
      await ctx.db.delete(item._id);
    }

    const images = await ctx.db.query("images").withIndex("by_path", (q: any) => q.eq("cribName", args.cribName).eq("wood", args.wood)).collect();
    for (const img of images) {
      await ctx.storage.delete(img.storageId as any);
      await ctx.db.delete(img._id);
    }
  }
});

export const updateBasePrice = mutation({
  args: { password: v.string(), cribName: v.string(), wood: v.string(), newPrice: v.number() },
  handler: async (ctx, args) => {
    if (args.password !== (process.env.VITE_ADMIN_PASSWORD || 'heirloom2024')) throw new Error("Unauthorized");
    const items = await ctx.db.query("inventory_staged" as any)
      .filter((q: any) => q.eq(q.field("cribName"), args.cribName))
      .filter((q: any) => q.eq(q.field("wood"), args.wood))
      .collect();
    for (const item of items) {
      await ctx.db.patch(item._id, { basePrice: args.newPrice });
    }
  }
});

export const backfillImages = mutation({
  args: { password: v.string() },
  handler: async (ctx, args) => {
    if (args.password !== (process.env.VITE_ADMIN_PASSWORD || 'heirloom2024')) throw new Error("Unauthorized");

    const inventories = [
      ...await ctx.db.query("inventory").collect(),
      ...await ctx.db.query("inventory_staged" as any).collect(),
    ];

    const existingImages = await ctx.db.query("images").collect();
    const exists = (cribName: string, wood: string, storageId: string) =>
      existingImages.some(i => i.cribName === cribName && i.wood === wood && i.storageId === storageId);

    let count = 0;
    for (const item of inventories) {
      for (const stain of (item as any).stains || []) {
        const storageId = stain.image;
        if (!storageId || typeof storageId !== 'string' || storageId.startsWith('http')) continue;
        if (exists((item as any).cribName, (item as any).wood, storageId)) continue;

        const existingInDb = await ctx.db.query("images").collect();
        const maxOrder = existingInDb
          .filter((i: any) => i.cribName === (item as any).cribName && i.wood === (item as any).wood && i.stainName === stain.name)
          .reduce((max: number, i: any) => Math.max(max, i.order), -1);

        await ctx.db.insert("images", {
          cribName: (item as any).cribName,
          wood: (item as any).wood,
          stainName: stain.name,
          storageId,
          originalName: `${(item as any).cribName}_${(item as any).wood}_${stain.name}.jpg`,
          mimeType: "image/jpeg",
          size: 0,
          order: maxOrder + 1,
          altText: undefined,
          source: "backfill",
        });
        count++;
      }
    }
    return { count };
  }
});

export const reorderCribs = mutation({
  args: { password: v.string(), cribName: v.string(), newOrder: v.number() },
  handler: async (ctx, args) => {
    if (args.password !== (process.env.VITE_ADMIN_PASSWORD || 'heirloom2024')) throw new Error("Unauthorized");
    const items = await ctx.db.query("inventory_staged" as any).filter((q: any) => q.eq(q.field("cribName"), args.cribName)).collect();
    for (const item of items) {
      await ctx.db.patch(item._id, { order: args.newOrder });
    }
  }
});

export const reorderWoods = mutation({
  args: { password: v.string(), cribName: v.string(), wood: v.string(), newOrder: v.number() },
  handler: async (ctx, args) => {
    if (args.password !== (process.env.VITE_ADMIN_PASSWORD || 'heirloom2024')) throw new Error("Unauthorized");
    const items = await ctx.db.query("inventory_staged" as any)
      .filter((q: any) => q.eq(q.field("cribName"), args.cribName))
      .filter((q: any) => q.eq(q.field("wood"), args.wood))
      .collect();
    for (const item of items) {
      await ctx.db.patch(item._id, { order: args.newOrder });
    }
  }
});
