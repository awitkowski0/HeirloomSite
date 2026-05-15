import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

function getProductName(item: any): string {
  return item.productName ?? item.cribName ?? "";
}

export const get = query({
  args: { useStaged: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    let items = args.useStaged
      ? await ctx.db.query("inventory_staged" as any).collect()
      : await ctx.db.query("inventory").collect();

    items = (items as any[]).sort((a: any, b: any) => (a.order ?? 9999) - (b.order ?? 9999));

    const allImages = await ctx.db.query("images").collect();

    return await Promise.all(items.map(async (item: any) => {
      const productName = getProductName(item);
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
            (img.productName ?? img.cribName) === productName &&
            img.wood === item.wood &&
            img.stainName === stain.name
          )
          .sort((a: any, b: any) => a.order - b.order);

        const gallery = (await Promise.all(matchingImages.map(async (img: any) => {
          try {
            const url = await ctx.storage.getUrl(img.storageId as any);
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
      return { ...item, productName, stains };
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
    await Promise.all(existing.map((doc) => ctx.db.delete(doc._id)));

    await Promise.all(args.inventory.map(async (item: any) => {
      const productName = item.productName ?? item.cribName;
      if (!productName || !item.wood) return;

      await ctx.db.insert("inventory_staged" as any, {
        productName: String(productName),
        cribName: String(productName),
        wood: String(item.wood),
        description: item.description ? String(item.description) : undefined,
        extendedDescription: item.extendedDescription ? String(item.extendedDescription) : undefined,
        basePrice: typeof item.basePrice === 'number' ? item.basePrice : 2499,
        category: item.category ? String(item.category) : undefined,
        order: typeof item.order === 'number' ? item.order : undefined,
        tags: item.tags ? item.tags.map(String) : undefined,
        addons: item.addons ? item.addons.map((a: any) => ({
          name: String(a.name),
          description: a.description ? String(a.description) : undefined,
          price: typeof a.price === 'number' ? a.price : 0,
          priceStained: typeof a.priceStained === 'number' ? a.priceStained : 0,
          image: a.image ? String(a.image) : undefined,
          category: a.category ? String(a.category) : undefined,
          stainable: typeof a.stainable === 'boolean' ? a.stainable : false,
        })) : undefined,
        sku: item.sku ? String(item.sku) : undefined,
        slug: item.slug ? String(item.slug) : undefined,
        dimensions: item.dimensions ? String(item.dimensions) : undefined,
        weight: typeof item.weight === 'number' ? item.weight : undefined,
        stains: (item.stains || []).map((s: any) => ({
          name: s.name ? String(s.name) : "Default",
          inStock: typeof s.inStock === 'boolean' ? s.inStock : true,
          priceAddition: typeof s.priceAddition === 'number' ? s.priceAddition : 0,
          image: s.image ? String(s.image) : undefined
        })),
      });
    }));
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
    await Promise.all(live.map((doc) => ctx.db.delete(doc._id)));

    const staged = await ctx.db.query("inventory_staged" as any).collect();
    await Promise.all(staged.map((item) =>
      ctx.db.insert("inventory", {
        productName: item.productName ?? item.cribName,
        cribName: item.cribName,
        wood: item.wood,
        description: item.description,
        extendedDescription: item.extendedDescription,
        basePrice: item.basePrice,
        category: item.category,
        order: item.order,
        tags: item.tags,
        addons: item.addons,
        sku: item.sku,
        slug: item.slug,
        dimensions: item.dimensions,
        weight: item.weight,
        stains: item.stains,
      })
    ));
  }
});

export const updateCribName = mutation({
  args: { password: v.string(), oldName: v.string(), newName: v.string() },
  handler: async (ctx, args) => {
    if (args.password !== (process.env.VITE_ADMIN_PASSWORD || 'heirloom2024')) throw new Error("Unauthorized");
    const items = await ctx.db.query("inventory_staged" as any).filter((q: any) => q.eq(q.field("cribName"), args.oldName)).collect();
    await Promise.all(items.map((item: any) =>
      ctx.db.patch(item._id, { cribName: args.newName, productName: args.newName })
    ));

    const images = await ctx.db.query("images").withIndex("by_crib", (q: any) => q.eq("cribName", args.oldName)).collect();
    await Promise.all(images.map((img) =>
      ctx.db.patch(img._id, { cribName: args.newName, productName: args.newName })
    ));
  }
});

export const deleteCrib = mutation({
  args: { password: v.string(), cribName: v.string() },
  handler: async (ctx, args) => {
    if (args.password !== (process.env.VITE_ADMIN_PASSWORD || 'heirloom2024')) throw new Error("Unauthorized");

    const stagedItems = await ctx.db.query("inventory_staged" as any).filter((q: any) => q.eq(q.field("cribName"), args.cribName)).collect();
    await Promise.all(stagedItems.map((item: any) => ctx.db.delete(item._id)));

    const images = await ctx.db.query("images").withIndex("by_crib", (q: any) => q.eq("cribName", args.cribName)).collect();
    await Promise.all(images.map(async (img) => {
      await ctx.storage.delete(img.storageId as any);
      await ctx.db.delete(img._id);
    }));
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
    await Promise.all(stagedItems.map((item: any) => ctx.db.delete(item._id)));

    const images = await ctx.db.query("images").withIndex("by_path", (q: any) => q.eq("cribName", args.cribName).eq("wood", args.wood)).collect();
    await Promise.all(images.map(async (img) => {
      await ctx.storage.delete(img.storageId as any);
      await ctx.db.delete(img._id);
    }));
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
    await Promise.all(items.map((item: any) => ctx.db.patch(item._id, { basePrice: args.newPrice })));
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
    const currentImages = [...existingImages];
    const exists = (cribName: string, wood: string, storageId: string) =>
      currentImages.some(i => i.cribName === cribName && i.wood === wood && i.storageId === storageId);

    let count = 0;
    for (const item of inventories) {
      const productName = (item as any).productName ?? (item as any).cribName;
      for (const stain of (item as any).stains || []) {
        const storageId = stain.image;
        if (!storageId || typeof storageId !== 'string' || storageId.startsWith('http')) continue;
        if (exists(productName, (item as any).wood, storageId)) continue;

        const maxOrder = currentImages
          .filter((i: any) => (i.productName ?? i.cribName) === productName && i.wood === (item as any).wood && i.stainName === stain.name)
          .reduce((max: number, i: any) => Math.max(max, i.order), -1);

        const newImage = {
          productName,
          cribName: productName,
          wood: (item as any).wood,
          stainName: stain.name,
          storageId,
          originalName: `${productName}_${(item as any).wood}_${stain.name}.jpg`,
          mimeType: "image/jpeg",
          size: 0,
          order: maxOrder + 1,
          altText: undefined,
          source: "backfill",
        };

        const id = await ctx.db.insert("images", newImage);
        currentImages.push({ ...newImage, _id: id } as any);
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
    await Promise.all(items.map((item: any) => ctx.db.patch(item._id, { order: args.newOrder })));
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
    await Promise.all(items.map((item: any) => ctx.db.patch(item._id, { order: args.newOrder })));
  }
});
