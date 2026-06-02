import { readFileSync, writeFileSync, readdirSync, existsSync, statSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const PUBLIC = join(root, "public");
const PRODUCTS = join(PUBLIC, "data", "products");

function readJSON(filePath) {
  if (!existsSync(filePath)) return null;
  return JSON.parse(readFileSync(filePath, "utf-8"));
}

function getProductDirs() {
  if (!existsSync(PRODUCTS)) return [];
  return readdirSync(PRODUCTS).filter(name => {
    const dir = join(PRODUCTS, name);
    return statSync(dir).isDirectory() && existsSync(join(dir, "product.json"));
  });
}

// Read all product files and generate combined index
const productDirs = getProductDirs();
const inventory = [];
const productIndex = [];
let totalImages = 0;

for (const dirName of productDirs) {
  const dir = join(PRODUCTS, dirName);
  const meta = readJSON(join(dir, "product.json"));
  const variants = readJSON(join(dir, "variants.json")) || [];
  const media = readJSON(join(dir, "media.json")) || {};

  if (!meta) continue;

  const productName = meta.productName;
  const imageBase = `/data/products/${encodeURIComponent(dirName)}/`;
  let minPrice = Infinity;

  for (const v of variants) {
    const stains = (v.stains || []).map(stainName => {
      const mediaKey = `${v.variant}||${stainName}`;
      const images = media[mediaKey] || [];
      const firstImage = images[0] ? imageBase + images[0] : null;
      const gallery = images.slice(1).map(url => ({ url: imageBase + url }));

      return {
        name: stainName,
        inStock: true,
        priceAddition: 0,
        image: firstImage,
        gallery: gallery.length > 0 ? gallery : undefined,
      };
    });

    const bp = v.basePrice || 0;
    if (bp < minPrice) minPrice = bp;

    inventory.push({
      productName,
      wood: v.variant,
      category: meta.category || null,
      description: meta.description || null,
      basePrice: bp,
      tags: meta.tags || [],
      stains,
    });
  }

  const firstStain = variants[0]?.stains?.[0];
  const defaultKey = firstStain ? `${variants[0].variant}||${firstStain}` : null;
  const defaultImage = defaultKey && media[defaultKey]?.[0] ? imageBase + media[defaultKey][0] : null;

  productIndex.push({
    productName,
    category: meta.category || null,
    minPrice: minPrice === Infinity ? 0 : minPrice,
    defaultImage,
  });

  // Count images
  for (const paths of Object.values(media)) {
    totalImages += paths.length;
  }
}

// Write combined inventory.json (for search index)
writeFileSync(join(PUBLIC, "data", "inventory.json"), JSON.stringify(inventory, null, 2) + "\n");

// Write product index (for fast listing)
writeFileSync(join(PUBLIC, "data", "products.json"), JSON.stringify(productIndex, null, 2) + "\n");

// Also write images index
const allImages = [];
for (const dirName of productDirs) {
  const dir = join(PRODUCTS, dirName);
  const media = readJSON(join(dir, "media.json")) || {};
  for (const [key, paths] of Object.entries(media)) {
    const [wood, stainName] = key.split("||");
    (paths).forEach((path, idx) => {
      const imageBase = `/data/products/${encodeURIComponent(dirName)}/`;
      allImages.push({
        productName: productNameFromDir(dirName),
        wood,
        stainName: stainName || null,
        path: imageBase + path,
        order: idx,
      });
    });
  }
}
writeFileSync(join(PUBLIC, "data", "images.json"), JSON.stringify(allImages, null, 2) + "\n");

console.log(`Generated from ${productDirs.length} product directories`);
console.log(`  inventory.json: ${inventory.length} items`);
console.log(`  products.json: ${productIndex.length} products`);
console.log(`  images.json: ${allImages.length} images`);

function productNameFromDir(dirName) {
  const meta = readJSON(join(PRODUCTS, dirName, "product.json"));
  return meta?.productName || dirName;
}
