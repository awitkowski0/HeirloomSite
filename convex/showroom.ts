import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const get = query({
  args: { useStaged: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const table = args.useStaged ? "showroom_staged" : "showroom";
    const data = await ctx.db.query(table).first();
    if (!data) return null;
    
    // Resolve storage ID if it's not a URL
    let image = data.image;
    if (image && !image.startsWith('http')) {
      try {
        const url = await ctx.storage.getUrl(image);
        image = url || image;
      } catch (e) {
        console.error("Failed to resolve showroom image", e);
      }
    }
    
    return { ...data, image };
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
    
    // Always save to staged when using the admin tool
    const existing = await ctx.db.query("showroom_staged").first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        image: args.image,
        spots: args.spots,
      });
    } else {
      await ctx.db.insert("showroom_staged", {
        image: args.image,
        spots: args.spots,
      });
    }
  },
});

export const publish = mutation({
  args: { password: v.string() },
  handler: async (ctx, args) => {
    if (args.password !== (process.env.VITE_ADMIN_PASSWORD || 'heirloom2024')) throw new Error("Unauthorized");
    
    const staged = await ctx.db.query("showroom_staged").first();
    if (!staged) throw new Error("No staged showroom to publish");
    
    const live = await ctx.db.query("showroom").first();
    if (live) {
      await ctx.db.patch(live._id, {
        image: staged.image,
        spots: staged.spots,
      });
    } else {
      await ctx.db.insert("showroom", {
        image: staged.image,
        spots: staged.spots,
      });
    }
  },
});
