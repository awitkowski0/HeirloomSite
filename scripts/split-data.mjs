import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const PUBLIC = join(root, "public");

// Read current combined data
const inventory = JSON.parse(readFileSync(join(PUBLIC, "data", "inventory.json"), "utf-8"));
const images = JSON.parse(readFileSync(join(PUBLIC, "data", "images.json") , "utf-8"));

// Group inventory items by productName
const productMap = {};
for (const item of inventory) {
  const name = item.productName;
  if (!productMap[name]) productMap[name] = [];
  productMap[name].push(item);
}

console.log(`${Object.keys(productMap).length} products found`);

// Collect unique stains and variants
const allStains = new Map();
const allVariants = new Map();

for (const [name, items] of Object.entries(productMap)) {
  const variants = [];
  for (const item of items) {
    const variantName = item.wood;
    const stainList = item.stains || [];
    
    // Collect stain info
    for (const s of stainList) {
      if (!allStains.has(s.name)) {
        allStains.set(s.name, { name: s.name, color: null, defaultPriceAddition: s.priceAddition || 0 });
      }
    }

    // Build variant entry
    const existing = variants.find(v => v.variant === variantName);
    if (existing) {
      existing.stains = [...new Set([...existing.stains, ...stainList.map(s => s.name)])];
    } else {
      variants.push({
        variant: variantName,
        label: variantName.replace(/([A-Z])/g, " $1").trim(),
        stains: stainList.map(s => s.name),
        basePrice: item.basePrice,
        sku: item.sku || null,
        dimensions: item.dimensions || null,
        weight: item.weight ?? null,
      });
    }

    // Add variant type to shared list
    if (!allVariants.has(variantName)) {
      allVariants.set(variantName, {
        name: variantName,
        label: variantName.replace(/([A-Z])/g, " $1").trim(),
        type: "option",
      });
    }
  }

  // Collect all images for this product per variant/stain
  const media = {};
  for (const item of items) {
    const variant = item.wood;
    for (const s of item.stains || []) {
      const key = `${variant}||${s.name}`;
      if (!media[key]) media[key] = [];
      const imagePath = s.image || null;
      if (imagePath && !media[key].includes(imagePath)) {
        media[key].push(imagePath);
      }
      // Also add gallery images
      for (const g of s.gallery || []) {
        if (g.url && !media[key].includes(g.url)) {
          media[key].push(g.url);
        }
      }
    }
  }

  // Write product directory
  const productDir = join(PUBLIC, "data", "products", sanitize(name));
  mkdirSync(productDir, { recursive: true });

  // Write product.json
  const first = items[0];
  const productJson = {
    productName: name,
    category: first.category || null,
    description: first.description || null,
    extendedDescription: first.extendedDescription || null,
    tags: first.tags || [],
    addons: first.addons || [],
    defaultVariant: items[0]?.wood || null,
  };
  writeFileSync(join(productDir, "product.json"), JSON.stringify(productJson, null, 2) + "\n");

  // Write variants.json
  writeFileSync(join(productDir, "variants.json"), JSON.stringify(variants, null, 2) + "\n");

  // Write media.json
  writeFileSync(join(productDir, "media.json"), JSON.stringify(media, null, 2) + "\n");

  console.log(`  ${name} — ${variants.length} variants, ${Object.keys(media).length} media entries`);
}

// Write shared stains.json
const stainList = Array.from(allStains.values()).sort((a, b) => a.name.localeCompare(b.name));
writeFileSync(join(PUBLIC, "data", "stains.json"), JSON.stringify(stainList, null, 2) + "\n");
console.log(`\nWrote stains.json (${stainList.length} stains)`);

// Write shared variants.json
const variantList = Array.from(allVariants.values()).sort((a, b) => a.name.localeCompare(b.name));
writeFileSync(join(PUBLIC, "data", "variants.json"), JSON.stringify(variantList, null, 2) + "\n");
console.log(`Wrote variants.json (${variantList.length} variants)`);

// Write product index (lightweight list for listing pages)
const productIndex = Object.entries(productMap).map(([name, items]) => {
  const first = items[0];
  const minPrice = Math.min(...items.map(i => i.basePrice));
  const defaultImage = items[0]?.stains?.[0]?.image || null;
  return {
    productName: name,
    category: first.category || null,
    minPrice,
    defaultImage,
    variantCount: items.length,
  };
});
writeFileSync(join(PUBLIC, "data", "products.json"), JSON.stringify(productIndex, null, 2) + "\n");
console.log(`Wrote products.json (${productIndex.length} products)`);

// Also generate a combined inventory.json for the search index
const combined = [];
for (const [, items] of Object.entries(productMap)) {
  for (const item of items) {
    combined.push({
      productName: item.productName,
      wood: item.wood,
      category: item.category || null,
      description: item.description || null,
      basePrice: item.basePrice,
      tags: item.tags || [],
      stains: (item.stains || []).map(s => ({
        name: s.name,
        inStock: s.inStock,
        priceAddition: s.priceAddition || 0,
        image: s.image || null,
      })),
    });
  }
}
writeFileSync(join(PUBLIC, "data", "inventory.json"), JSON.stringify(combined, null, 2) + "\n");
console.log(`Wrote inventory.json (${combined.length} items, for search index)`);

console.log("\nDone! Old inventory.json kept for search. New per-product files created.");

function sanitize(name) {
  return name.replace(/[/\\?%*:|"<>]/g, "-").trim();
}
