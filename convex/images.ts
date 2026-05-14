import { query, mutation } from "./_generated/server";
import { v } from "convex/values";


export const list = query({
  args: {
    cribName: v.optional(v.string()),
    wood: v.optional(v.string()),
    stainName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let items = await ctx.db.query("images").collect();
    if (args.cribName) items = items.filter(i => (i.productName ?? i.cribName) === args.cribName);
    if (args.wood) items = items.filter(i => i.wood === args.wood);
    if (args.stainName !== undefined) items = items.filter(i => i.stainName === args.stainName);
    return (await Promise.all(items.map(async (img) => {
      try {
        const url = await ctx.storage.getUrl(img.storageId as any);
        return { ...img, resolvedUrl: url || null };
      } catch {
        return { ...img, resolvedUrl: null };
      }
    }))).sort((a, b) => a.order - b.order);
  },
});

export const listByCrib = query({
  args: { cribName: v.string() },
  handler: async (ctx, args) => {
    const items = await ctx.db.query("images").withIndex("by_crib", q => q.eq("cribName", args.cribName)).collect();
    return (await Promise.all(items.map(async (img) => {
      try {
        const url = await ctx.storage.getUrl(img.storageId as any);
        return { ...img, resolvedUrl: url || null, productName: img.productName ?? img.cribName };
      } catch {
        return { ...img, resolvedUrl: null, productName: img.productName ?? img.cribName };
      }
    }))).sort((a, b) => a.order - b.order);
  },
});

export const listStainImages = query({
  args: { stainName: v.string() },
  handler: async (ctx, args) => {
    const items = await ctx.db.query("images").withIndex("by_stain", q => q.eq("stainName", args.stainName)).collect();
    return (await Promise.all(items.map(async (img) => {
      try {
        const url = await ctx.storage.getUrl(img.storageId as any);
        return { ...img, resolvedUrl: url || null, productName: img.productName ?? img.cribName };
      } catch {
        return { ...img, resolvedUrl: null, productName: img.productName ?? img.cribName };
      }
    }))).sort((a, b) => a.order - b.order);
  },
});

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    const items = await ctx.db.query("images").collect();
    return (await Promise.all(items.map(async (img) => {
      try {
        const url = await ctx.storage.getUrl(img.storageId as any);
        return { ...img, resolvedUrl: url || null, productName: img.productName ?? img.cribName };
      } catch {
        return { ...img, resolvedUrl: null, productName: img.productName ?? img.cribName };
      }
    }))).sort((a, b) => a.order - b.order);
  },
});

export const getFolderTree = query({
  args: {},
  handler: async (ctx) => {
    const items = await ctx.db.query("images").collect();
    const tree: Record<string, Record<string, string[]>> = {};
    for (const img of items) {
      const name = img.productName ?? img.cribName ?? "Unknown";
      if (!tree[name]) tree[name] = {};
      if (!tree[name][img.wood]) tree[name][img.wood] = [];
      if (img.stainName && !tree[name][img.wood].includes(img.stainName)) {
        tree[name][img.wood].push(img.stainName);
      }
    }
    return tree;
  },
});

export const getOrphanCount = query({
  args: {},
  handler: async (ctx) => {
    const items = await ctx.db.query("images").collect();
    return items.filter(i => !i.stainName).length;
  },
});

export const generateUploadUrl = mutation({
  args: { password: v.string() },
  handler: async (ctx, args) => {
    if (!process.env.VITE_ADMIN_PASSWORD || args.password !== process.env.VITE_ADMIN_PASSWORD) throw new Error("Unauthorized");
    return await ctx.storage.generateUploadUrl();
  }
});

async function parseStainName(fileName: string, knownStains: string[]): Promise<string | null> {
  const name = fileName.replace(/\.(jpg|jpeg|png|webp|gif|heic)$/i, "");
  const parts = name.split(/[_\-\s]+/);
  for (let i = parts.length - 1; i >= 0; i--) {
    const candidate = parts.slice(i).join(" ");
    for (const stain of knownStains) {
      if (candidate.toLowerCase() === stain.toLowerCase()) return stain;
    }
  }
  for (let i = parts.length - 1; i >= 0; i--) {
    for (const stain of knownStains) {
      if (parts[i].toLowerCase() === stain.toLowerCase()) return stain;
    }
  }
  for (const stain of knownStains) {
    if (name.toLowerCase().endsWith(stain.toLowerCase())) return stain;
  }
  return null;
}

export const saveImageRecord = mutation({
  args: {
    password: v.string(),
    cribName: v.string(),
    wood: v.string(),
    storageId: v.string(),
    originalName: v.string(),
    mimeType: v.string(),
    size: v.number(),
    stainName: v.optional(v.string()),
    autoLink: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    if (!process.env.VITE_ADMIN_PASSWORD || args.password !== process.env.VITE_ADMIN_PASSWORD) throw new Error("Unauthorized");

    let stainName = args.stainName;

    if (args.autoLink && !stainName) {
      const knownStainsDocs = await ctx.db.query("stain_types").collect();
      const knownStains = knownStainsDocs.map(s => s.name);
      stainName = await parseStainName(args.originalName, knownStains) ?? undefined;
    }

    const existing = await ctx.db.query("images").collect();
    const maxOrder = existing
      .filter(i => i.cribName === args.cribName && i.wood === args.wood && i.stainName === stainName)
      .reduce((max, i) => Math.max(max, i.order), -1);

    await ctx.db.insert("images", {
      productName: args.cribName,
      cribName: args.cribName,
      wood: args.wood,
      stainName: stainName ?? undefined,
      storageId: args.storageId,
      originalName: args.originalName,
      mimeType: args.mimeType,
      size: args.size,
      order: maxOrder + 1,
      altText: undefined,
      source: "upload",
    });
  },
});

export const linkImage = mutation({
  args: {
    password: v.string(),
    imageId: v.id("images"),
    stainName: v.string(),
  },
  handler: async (ctx, args) => {
    if (!process.env.VITE_ADMIN_PASSWORD || args.password !== process.env.VITE_ADMIN_PASSWORD) throw new Error("Unauthorized");
    await ctx.db.patch(args.imageId, { stainName: args.stainName });
  },
});

export const unlinkImage = mutation({
  args: {
    password: v.string(),
    imageId: v.id("images"),
  },
  handler: async (ctx, args) => {
    if (!process.env.VITE_ADMIN_PASSWORD || args.password !== process.env.VITE_ADMIN_PASSWORD) throw new Error("Unauthorized");
    await ctx.db.patch(args.imageId, { stainName: undefined });
  },
});

export const deleteImage = mutation({
  args: {
    password: v.string(),
    imageId: v.id("images"),
  },
  handler: async (ctx, args) => {
    if (!process.env.VITE_ADMIN_PASSWORD || args.password !== process.env.VITE_ADMIN_PASSWORD) throw new Error("Unauthorized");
    const img = await ctx.db.get(args.imageId);
    if (!img) throw new Error("Image not found");
    await ctx.storage.delete(img.storageId as any);
    await ctx.db.delete(args.imageId);
  },
});

export const reorderImages = mutation({
  args: {
    password: v.string(),
    imageIds: v.array(v.id("images")),
  },
  handler: async (ctx, args) => {
    if (!process.env.VITE_ADMIN_PASSWORD || args.password !== process.env.VITE_ADMIN_PASSWORD) throw new Error("Unauthorized");
    for (let i = 0; i < args.imageIds.length; i++) {
      await ctx.db.patch(args.imageIds[i], { order: i });
    }
  },
});

export const bulkUpload = mutation({
  args: {
    password: v.string(),
    uploads: v.array(v.object({
      cribName: v.string(),
      wood: v.string(),
      storageId: v.string(),
      originalName: v.string(),
      mimeType: v.string(),
      size: v.number(),
    })),
    autoLink: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    if (!process.env.VITE_ADMIN_PASSWORD || args.password !== process.env.VITE_ADMIN_PASSWORD) throw new Error("Unauthorized");

    let knownStains: string[] = [];
    if (args.autoLink) {
      const knownStainsDocs = await ctx.db.query("stain_types").collect();
      knownStains = knownStainsDocs.map(s => s.name);
    }

    for (const upload of args.uploads) {
      let stainName: string | undefined;

      if (args.autoLink && knownStains.length > 0) {
        stainName = await parseStainName(upload.originalName, knownStains) ?? undefined;
      }

      const existing = await ctx.db.query("images").collect();
      const maxOrder = existing
        .filter(i => i.cribName === upload.cribName && i.wood === upload.wood && i.stainName === stainName)
        .reduce((max, i) => Math.max(max, i.order), -1);

      await ctx.db.insert("images", {
        productName: upload.cribName,
        cribName: upload.cribName,
        wood: upload.wood,
        stainName: stainName ?? undefined,
        storageId: upload.storageId,
        originalName: upload.originalName,
        mimeType: upload.mimeType,
        size: upload.size,
        order: maxOrder + 1,
        altText: undefined,
        source: "upload",
      });
    }
  },
});
