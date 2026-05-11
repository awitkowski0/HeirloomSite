import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const get = query({
  args: {},
  handler: async (ctx) => {
    const data = await ctx.db.query("showroom").first();
    if (!data) return null;

    // Resolve slide images
    let slides = data.slides || [];
    slides = await Promise.all(slides.map(async (slide: any) => {
      let img = slide.image;
      if (img && !img.startsWith('http')) {
        try {
          const url = await ctx.storage.getUrl(img);
          img = url || img;
        } catch (e) {
          console.error("Failed to resolve slide image", e);
        }
      }
      let imgMobile = slide.imageMobile;
      if (imgMobile && !imgMobile.startsWith('http')) {
        try {
          const url = await ctx.storage.getUrl(imgMobile);
          imgMobile = url || imgMobile;
        } catch (e) {
          console.error("Failed to resolve slide mobile image", e);
        }
      }
      return { ...slide, image: img, imageMobile: imgMobile };
    }));

    return { ...data, slides };
  },
});

export const save = mutation({
  args: {
    password: v.string(),
    slides: v.optional(v.array(v.object({
      image: v.string(),
      imageMobile: v.optional(v.string()),
      productId: v.optional(v.string()),
    }))),
    featured: v.optional(v.array(v.object({
      cribName: v.string(),
      stainName: v.optional(v.string()),
    }))),
  },
  handler: async (ctx, args) => {
    if (args.password !== (process.env.VITE_ADMIN_PASSWORD || 'heirloom2024')) throw new Error("Unauthorized");

    const existing = await ctx.db.query("showroom").first();
    const update: any = {};
    if (args.slides !== undefined) update.slides = args.slides;
    if (args.featured !== undefined) update.featured = args.featured;

    if (existing) {
      await ctx.db.patch(existing._id, { ...update, image: undefined, spots: undefined });
    } else {
      await ctx.db.insert("showroom", update);
    }
  },
});
