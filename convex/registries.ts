import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const create = mutation({
  args: {
    password: v.optional(v.string()),
    creatorName: v.string(),
    eventDate: v.optional(v.string()),
    message: v.optional(v.string()),
    items: v.array(v.object({
      productName: v.optional(v.string()),
      cribName: v.optional(v.string()),
      wood: v.string(),
      stainName: v.string(),
      title: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    // 🛡️ Security enhancement: Use crypto.randomUUID() instead of Math.random() to prevent weak RNG vulnerabilities when generating URL slugs
    const slug = args.creatorName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + crypto.randomUUID().split('-')[0].substring(0, 4);
    const items = args.items.map(item => ({
      productName: item.productName ?? item.cribName,
      cribName: item.cribName ?? item.productName,
      wood: item.wood,
      stainName: item.stainName,
      title: item.title,
    }));
    await ctx.db.insert("registries", {
      slug,
      creatorName: args.creatorName,
      eventDate: args.eventDate,
      message: args.message,
      items,
      createdAt: Date.now(),
    });
    return slug;
  },
});

export const get = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const items = await ctx.db.query("registries").withIndex("by_slug", q => q.eq("slug", args.slug)).collect();
    if (items.length === 0) return null;
    return items[0];
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("registries").order("desc").collect();
  },
});
