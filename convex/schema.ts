import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  inventory: defineTable({
    cribName: v.string(),
    wood: v.string(),
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
});
