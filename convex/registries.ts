import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const create = mutation({
  args: {
    password: v.optional(v.string()),
    creatorName: v.string(),
    eventDate: v.optional(v.string()),
    message: v.optional(v.string()),
    items: v.array(v.object({
      cribName: v.string(),
      wood: v.string(),
      stainName: v.string(),
      title: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    const slug = args.creatorName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + Math.random().toString(36).substring(2, 6);
    await ctx.db.insert("registries", {
      slug,
      creatorName: args.creatorName,
      eventDate: args.eventDate,
      message: args.message,
      items: args.items,
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
