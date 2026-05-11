import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  inventory: defineTable({
    cribName: v.string(),
    wood: v.string(),
    description: v.optional(v.string()),
    basePrice: v.number(),
    stains: v.array(v.object({
      name: v.string(),
      inStock: v.boolean(),
      priceAddition: v.number(),
      image: v.optional(v.string()),
    })),
  }),
  inventory_staged: defineTable({
    cribName: v.string(),
    wood: v.string(),
    description: v.optional(v.string()),
    basePrice: v.number(),
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
  settings_staged: defineTable({
    paymentProvider: v.string(),
  }),
  showroom: defineTable({
    image: v.string(),
    spots: v.array(v.object({
      x: v.number(),
      y: v.number(),
      productName: v.string(),
    }))
  }),
  showroom_staged: defineTable({
    image: v.string(),
    spots: v.array(v.object({
      x: v.number(),
      y: v.number(),
      productName: v.string(),
    }))
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
      cribName: v.string(),
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
  images: defineTable({
    cribName: v.string(),
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
    .index("by_stain", ["stainName"]),
});
