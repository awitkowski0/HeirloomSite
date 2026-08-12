import { readFileSync, writeFileSync, readdirSync, existsSync, statSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const PRODUCTS = join(root, "public", "data", "products");

function getProductDirs() {
  // Must match build-data.mjs exactly. "showroom" is an asset directory that
  // happens to carry a product.json; treating it as a product here wrote slug
  // and title fields into a file that is not, and never becomes, a product.
  return readdirSync(PRODUCTS).filter(
    d => existsSync(join(PRODUCTS, d, "product.json")) && d !== "showroom"
  );
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

const drifted = [];

for (const dirName of getProductDirs()) {
  const filePath = join(PRODUCTS, dirName, "product.json");
  const meta = JSON.parse(readFileSync(filePath, "utf-8"));

  const name = meta.productName;
  const cat = meta.category || "General";
  const desc = categoryDescription(cat);

  /*
   * Slugs are load-bearing and MUST be treated as immutable once published.
   * Every /product/<slug> URL is statically prerendered, indexed by Google, and
   * linked from Babylist registry entries, so silently rewriting one 404s a
   * live page. build-data.mjs guards against missing and duplicate slugs, but
   * it cannot detect a slug that merely *changed* - so the protection has to be
   * here: fill in a slug only when one is absent, never overwrite.
   */
  const derived = slug(name);
  if (!derived) {
    console.error(`  SKIPPED (name yields an empty slug): ${name}`);
    continue;
  }

  if (meta.slug && meta.slug !== derived) {
    drifted.push({ name, current: meta.slug, derived });
  }

  const updated = {
    ...meta,
    slug: meta.slug || derived,
    title: meta.title || `${name} — Heirloom Cribs and More`,
    metaDescription:
      meta.metaDescription ||
      meta.description ||
      `Shop our ${desc} ${name.toLowerCase()}. Handcrafted in the USA from premium solid hardwoods.`,
    category: cat,
  };

  writeFileSync(filePath, JSON.stringify(updated, null, 2) + "\n");
  console.log(`${(meta.slug || derived).padEnd(50)} ${name.substring(0, 30)}`);
}

if (drifted.length > 0) {
  console.warn(`\n  ${drifted.length} product(s) have a slug that no longer matches their name.`);
  console.warn("  These were left UNCHANGED on purpose - changing them would 404 a live URL.");
  console.warn("  If you genuinely want to move one, edit product.json by hand and add a");
  console.warn("  redirect from the old path in next.config.ts first.\n");
  for (const d of drifted) {
    console.warn(`    ${d.name}\n      keeping: ${d.current}\n      name now implies: ${d.derived}`);
  }
}

console.log("\nDone");
