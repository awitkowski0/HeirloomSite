import { readFileSync, writeFileSync, readdirSync, existsSync, statSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const PRODUCTS = join(root, "public", "data", "products");

function getProductDirs() {
  return readdirSync(PRODUCTS).filter(d => existsSync(join(PRODUCTS, d, "product.json")));
}

function slug(text) {
  return text.toLowerCase()
    .replace(/[^\w\s-]/g, "")   // remove special chars
    .replace(/[\s_]+/g, "-")     // spaces and underscores to hyphens
    .replace(/-+/g, "-")         // collapse multiple hyphens
    .replace(/^-|-$/g, "")       // trim hyphens
    .substring(0, 80);
}

function seoTitle(name) {
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function categoryDescription(category) {
  const map = {
    "Cribs": "handcrafted solid wood crib",
    "Dressers": "solid wood dresser",
    "Chests": "solid wood chest",
    "Nightstands": "solid wood nightstand",
    "Changing Tables": "solid wood changing table",
    "Area Rugs": "machine-washable area rug",
    "Lamps": "portable LED lamp",
    "Accessories": "nursery accessory",
    "Guard Rails & Conversions": "crib conversion rail",
  };
  return map[category] || "handcrafted nursery product";
}

for (const dirName of getProductDirs()) {
  const filePath = join(PRODUCTS, dirName, "product.json");
  const meta = JSON.parse(readFileSync(filePath, "utf-8"));

  const name = meta.productName;
  const cat = meta.category || "General";
  const desc = categoryDescription(cat);

  const updated = {
    ...meta,
    slug: slug(name),
    title: `${name} — Heirloom Cribs and More`,
    metaDescription: meta.description || `Shop our ${desc} ${name.toLowerCase()}. Handcrafted in the USA from premium solid hardwoods.`,
    category: cat,
  };

  writeFileSync(filePath, JSON.stringify(updated, null, 2) + "\n");
  console.log(`${slug(name).padEnd(50)} ${name.substring(0, 30)}`);
}

console.log("\nDone");
