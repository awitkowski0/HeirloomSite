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
      image: v.optional(v.string()), // URL to the image
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
      image: v.optional(v.string()), // URL to the image
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
});
