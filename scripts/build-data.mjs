import { readFileSync, writeFileSync, readdirSync, existsSync, statSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const PUBLIC = join(root, "public");
const PRODUCTS = join(PUBLIC, "data", "products");

// The site statically prerenders one page per product slug. If this script
// silently produces a short or slug-less product list, the build succeeds and
// ships a deploy where every /product/<slug> URL 404s -- including URLs that
// are already indexed by Google and linked from Babylist registries. Failing
// loudly here is the only cheap place to catch that.
//
// This is a tripwire, not a guess: it is the exact current product count.
// Adding products raises the count and passes. Intentionally REMOVING a
// product is a deliberate one-line edit here, which is the point -- an
// accidental removal should never build.
/**
 * Collapse an accidentally repeated word ("The The Darlington features...",
 * "solid solid hardwood").
 *
 * Six products ship this in both `description` and `metaDescription`, so it
 * reaches the product page, the meta description and the JSON-LD. Normalising
 * here rather than at render time means every generated artifact is clean and
 * no component has to know about it. Each collapse is logged, so if a genuine
 * double ("had had") ever appears it will be visible in the build output
 * rather than silently rewritten.
 */
const dedupedWords = [];
function collapseRepeatedWords(text, where) {
  if (!text) return text;
  return text.replace(/\b(\w+)(\s+)\1\b/gi, (match, word, gap, offset, full) => {
    dedupedWords.push(`${where}: "${match}" -> "${word}"`);
    return word;
  });
}

const MIN_EXPECTED_PRODUCTS = 73;

function fail(message) {
  console.error(`\n  FATAL: ${message}\n`);
  console.error("  Refusing to emit data artifacts. The site would build but");
  console.error("  serve 404s for product pages that are already indexed.\n");
  process.exit(1);
}

function readJSON(filePath) {
  if (!existsSync(filePath)) return null;
  try {
    return JSON.parse(readFileSync(filePath, "utf-8"));
  } catch (err) {
    // Surfacing this as a clean failure rather than a raw Node stack trace:
    // malformed product data is a content problem, and whoever hits it in CI
    // needs the offending path, not a module-loader trace.
    fail(`${filePath.replace(root + "/", "")} is not valid JSON\n    ${err.message}`);
  }
}

function getProductDirs() {
  if (!existsSync(PRODUCTS)) return [];
  return readdirSync(PRODUCTS).filter(name => {
    const dir = join(PRODUCTS, name);
    return statSync(dir).isDirectory() && existsSync(join(dir, "product.json")) && name !== "showroom";
  });
}

const productDirs = getProductDirs();
if (productDirs.length === 0) {
  fail(`no product directories found under ${PRODUCTS}`);
}

const inventory = [];
const productIndex = [];
const allImages = [];

for (const dirName of productDirs) {
  const dir = join(PRODUCTS, dirName);
  const meta = readJSON(join(dir, "product.json"));
  const variants = readJSON(join(dir, "variants.json")) || [];
  const media = readJSON(join(dir, "media.json")) || {};

  // A directory that survived getProductDirs() has a product.json, so a null
  // here means it failed to parse. Skipping it silently would drop a product
  // from the index and 404 its already-indexed URL.
  if (!meta) fail(`${dirName}/product.json exists but could not be parsed`);

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
      description: collapseRepeatedWords(meta.description, `${productName}.description`) || null,
      extendedDescription:
        collapseRepeatedWords(meta.extendedDescription, `${productName}.extendedDescription`) ||
        null,
      title: meta.title || null,
      metaDescription:
        collapseRepeatedWords(meta.metaDescription, `${productName}.metaDescription`) || null,
      basePrice: bp,
      order: meta.order || null,
      tags: meta.tags || [],
      sku: v.sku || null,
      slug: meta.slug || null,
      dimensions: v.dimensions || null,
      weight: v.weight ?? null,
      addons: meta.addons || [],
      stains,
    });
  }

  const firstStain = variants[0]?.stains?.[0];
  const defaultKey = firstStain ? `${variants[0].variant}||${firstStain}` : null;
  const defaultImage = defaultKey && media[defaultKey]?.[0] ? imageBase + media[defaultKey][0] : null;

  productIndex.push({
    productName,
    slug: meta.slug || null,
    category: meta.category || null,
    minPrice: minPrice === Infinity ? 0 : minPrice,
    defaultImage,
  });

  // Build the image index in this same pass. Previously this was a second loop
  // that re-read and re-parsed product.json from disk once per media entry
  // just to recover productName, which is already in hand here.
  for (const [key, paths] of Object.entries(media)) {
    const [wood, stainName] = key.split("||");
    paths.forEach((path, idx) => {
      allImages.push({
        productName,
        wood,
        stainName: stainName || null,
        path: imageBase + path,
        order: idx,
      });
    });
  }
}

// ---------------------------------------------------------------------------
// Guards. These run before anything is written.
// ---------------------------------------------------------------------------

if (productIndex.length < MIN_EXPECTED_PRODUCTS) {
  fail(
    `only ${productIndex.length} products parsed, expected at least ${MIN_EXPECTED_PRODUCTS}.\n` +
      `    If a product was removed on purpose, lower MIN_EXPECTED_PRODUCTS in this file.`
  );
}

const slugless = productIndex.filter(p => !p.slug);
if (slugless.length > 0) {
  fail(
    `${slugless.length} product(s) have no slug and would be unreachable:\n` +
      slugless.map(p => `    - ${p.productName}`).join("\n")
  );
}

const slugCounts = new Map();
for (const p of productIndex) {
  slugCounts.set(p.slug, (slugCounts.get(p.slug) || 0) + 1);
}
const duplicates = [...slugCounts.entries()].filter(([, n]) => n > 1);
if (duplicates.length > 0) {
  fail(
    `duplicate slugs (later products would silently shadow earlier ones):\n` +
      duplicates.map(([slug, n]) => `    - ${slug} (x${n})`).join("\n")
  );
}

// ---------------------------------------------------------------------------
// Artifacts
// ---------------------------------------------------------------------------

writeFileSync(join(PUBLIC, "data", "inventory.json"), JSON.stringify(inventory, null, 2) + "\n");
writeFileSync(join(PUBLIC, "data", "products.json"), JSON.stringify(productIndex, null, 2) + "\n");
writeFileSync(join(PUBLIC, "data", "images.json"), JSON.stringify(allImages, null, 2) + "\n");

// Search corpus: shipped to the browser as a lazily-imported chunk, so it holds
// only what MiniSearch indexes or what a result row renders. Deliberately not
// the full inventory.json (525 KB) and not a prebuilt MiniSearch index (larger
// than the docs, and stale-index-after-deploy becomes our problem).
const searchDocs = [];
const seenSearchDoc = new Set();
for (const item of inventory) {
  const id = `${item.productName}||${item.wood}`;
  if (seenSearchDoc.has(id)) continue;
  seenSearchDoc.add(id);
  searchDocs.push({
    id,
    productName: item.productName,
    slug: item.slug,
    wood: item.wood,
    category: item.category || "",
    stainNames: item.stains.map(s => s.name).join(" "),
    description: (item.description || "").slice(0, 300),
    basePrice: item.basePrice,
    stainImages: Object.fromEntries(item.stains.map(s => [s.name, s.image || ""])),
  });
}
mkdirSync(join(root, "src", "data"), { recursive: true });
writeFileSync(join(root, "src", "data", "search-docs.json"), JSON.stringify(searchDocs) + "\n");

// Pricing table: the only thing the payment-intent route needs. Imported
// statically by the route so it is always in the function bundle -- public/ is
// uploaded to the CDN, not traced into the lambda, so a runtime readFileSync
// of public/data/inventory.json is not reliable under Next on Vercel.
const pricing = inventory.map(item => ({
  productName: item.productName,
  wood: item.wood,
  basePrice: item.basePrice,
  addons: (item.addons || []).map(a => ({ name: a.name, price: a.price ?? 0 })),
  stains: item.stains.map(s => ({
    name: s.name,
    priceAddition: s.priceAddition || 0,
    inStock: s.inStock !== false,
  })),
}));
writeFileSync(join(root, "data", "pricing.json"), JSON.stringify(pricing) + "\n");

console.log(`Generated from ${productDirs.length} product directories`);
if (dedupedWords.length > 0) {
  console.log(`  collapsed ${dedupedWords.length} repeated word(s):`);
  for (const d of dedupedWords) console.log(`    ${d}`);
}
console.log(`  public/data/inventory.json:  ${inventory.length} items`);
console.log(`  public/data/products.json:   ${productIndex.length} products`);
console.log(`  public/data/images.json:     ${allImages.length} images`);
console.log(`  src/data/search-docs.json:   ${searchDocs.length} docs`);
console.log(`  data/pricing.json:           ${pricing.length} rows`);
