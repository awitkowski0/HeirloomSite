import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  inventory: defineTable({
    productName: v.optional(v.string()),
    cribName: v.optional(v.string()),
    wood: v.string(),
    category: v.optional(v.string()),
    description: v.optional(v.string()),
    extendedDescription: v.optional(v.string()),
    basePrice: v.number(),
    order: v.optional(v.number()),
    tags: v.optional(v.array(v.string())),
    sku: v.optional(v.string()),
    slug: v.optional(v.string()),
    dimensions: v.optional(v.string()),
    weight: v.optional(v.number()),
    stains: v.array(v.object({
      name: v.string(),
      inStock: v.boolean(),
      priceAddition: v.number(),
      image: v.optional(v.string()),
    })),
  }),
  settings: defineTable({
    paymentProvider: v.string(),
  }),
  showroom: defineTable({
    slides: v.optional(v.array(v.object({
      image: v.string(),
      imageMobile: v.optional(v.string()),
      productId: v.optional(v.string()),
    }))),
    featured: v.optional(v.array(v.object({
      cribName: v.optional(v.string()),
      productName: v.optional(v.string()),
      stainName: v.optional(v.string()),
    }))),
  }),
  orders: defineTable({
    email: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    address: v.string(),
    city: v.string(),
    state: v.string(),
    zip: v.string(),
    items: v.array(v.object({
      productName: v.optional(v.string()),
      cribName: v.optional(v.string()),
      wood: v.string(),
      stainName: v.string(),
      price: v.number(),
      image: v.string(),
      quantity: v.number(),
    })),
    subtotal: v.number(),
    shipping: v.number(),
    tax: v.number(),
    total: v.number(),
    paymentIntentId: v.string(),
    status: v.string(),
  }),
  stain_types: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    color: v.optional(v.string()),
    defaultPriceAddition: v.number(),
  }).index("by_name", ["name"]),
  registries: defineTable({
    slug: v.string(),
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
    createdAt: v.number(),
  }).index("by_slug", ["slug"]),
  images: defineTable({
    productName: v.optional(v.string()),
    cribName: v.optional(v.string()),
    wood: v.string(),
    stainName: v.optional(v.string()),
    storageId: v.string(),
    originalName: v.string(),
    mimeType: v.string(),
    size: v.number(),
    order: v.number(),
    altText: v.optional(v.string()),
    source: v.optional(v.string()),
  }).index("by_path", ["cribName", "wood", "stainName"])
    .index("by_crib", ["cribName"])
    .index("by_stain", ["stainName"])
    .index("by_product", ["productName"]),
});
