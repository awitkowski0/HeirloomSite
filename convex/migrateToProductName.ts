import { internalMutation } from "./_generated/server";

export const run = internalMutation({
  args: {},
  handler: async (ctx): Promise<{ migrated: number }> => {
    let total = 0;

    // 1. Migrate inventory table
    const inventoryDocs = await ctx.db.query("inventory").collect();
    for (const doc of inventoryDocs) {
      if (doc.cribName && !doc.productName) {
        await ctx.db.patch(doc._id, { productName: doc.cribName });
        total++;
      }
    }

    // 2. Migrate inventory_staged
    const staged = await (ctx.db.query as any)("inventory_staged").collect();
    for (const doc of staged as any[]) {
      if (doc.cribName && !doc.productName) {
        await (ctx.db as any).patch(doc._id, { productName: doc.cribName });
        total++;
      }
    }

    // 3. Migrate images table
    const imageDocs = await ctx.db.query("images").collect();
    for (const doc of imageDocs) {
      if (doc.cribName && !doc.productName) {
        await ctx.db.patch(doc._id, { productName: doc.cribName });
        total++;
      }
    }

    // 4. Migrate orders table (nested in items[])
    const orderDocs = await ctx.db.query("orders").collect();
    for (const doc of orderDocs) {
      let changed = false;
      const items = doc.items.map((item: any) => {
        if (item.cribName && !item.productName) {
          changed = true;
          return { ...item, productName: item.cribName };
        }
        return item;
      });
      if (changed) {
        await ctx.db.patch(doc._id, { items });
        total++;
      }
    }

    // 5. Migrate registries table (nested in items[])
    const registryDocs = await ctx.db.query("registries").collect();
    for (const doc of registryDocs) {
      let changed = false;
      const items = doc.items.map((item: any) => {
        if (item.cribName && !item.productName) {
          changed = true;
          return { ...item, productName: item.cribName };
        }
        return item;
      });
      if (changed) {
        await ctx.db.patch(doc._id, { items });
        total++;
      }
    }

    // 6. Migrate showroom table (nested in featured[])
    const showroomDoc = await ctx.db.query("showroom").first();
    if (showroomDoc) {
      const featured = showroomDoc.featured || [];
      let changed = false;
      const newFeatured = featured.map((f: any) => {
        if (f.cribName && !f.productName) {
          changed = true;
          return { ...f, productName: f.cribName };
        }
        return f;
      });
      if (changed) {
        await ctx.db.patch(showroomDoc._id, { featured: newFeatured });
        total++;
      }
    }

    return { migrated: total };
  },
});
