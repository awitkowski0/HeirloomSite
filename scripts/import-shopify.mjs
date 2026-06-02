import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const SHOP_URL = "https://heirloomcribsandmore.com";
const PASSWORD = "deajay";

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

async function login() {
  const resp = await fetch(`${SHOP_URL}/password`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ form_type: "storefront_password", utf8: "✓", password: PASSWORD }),
    redirect: "manual",
  });
  const cookies = resp.headers.getSetCookie?.() || [];
  const cookie = cookies.map(c => c.split(";")[0]).join("; ");
  return cookie;
}

async function fetchProducts(cookie) {
  const all = [];
  let url = `${SHOP_URL}/products.json?limit=250`;
  while (url) {
    const resp = await fetch(url, { headers: { Cookie: cookie } });
    const data = await resp.json();
    all.push(...data.products);
    url = null;
    const link = resp.headers.get("Link");
    if (link) {
      const m = link.match(/<([^>]+)>;\s*rel="next"/);
      if (m) url = m[1];
    }
  }
  return all;
}

async function downloadImage(url, destPath) {
  const dir = path.dirname(destPath);
  fs.mkdirSync(dir, { recursive: true });
  try {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    fs.writeFileSync(destPath, Buffer.from(await resp.arrayBuffer()));
    return true;
  } catch (e) {
    console.error(`  Failed: ${url} — ${e.message}`);
    return false;
  }
}

function toTitleCase(str) {
  return str.replace(/\w\S*/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
}

function transformProduct(product, imageLocalPaths) {
  const fallbackImg = imageLocalPaths[product.images[0]?.id] || "";
  const items = [];

  for (const variant of product.variants) {
    const wood = variant.title || "Standard";
    const stainName = product.variants.length > 1 ? wood : "Default";
    const stainImage = imageLocalPaths[variant.featured_image?.id] || fallbackImg;

    // Check if this product already exists in our format (cribs from our system)
    // Our format: productName is the short name, wood is the wood species
    // Shopify format: title is descriptive, wood/variant is the option

    items.push({
      productName: product.title,
      wood,
      category: product.product_type || "General",
      description: product.body_html?.replace(/<[^>]+>/g, "").trim() || null,
      extendedDescription: null,
      basePrice: parseFloat(variant.price) || 0,
      order: null,
      tags: product.tags || [],
      sku: variant.sku || null,
      slug: null,
      dimensions: null,
      weight: variant.grams ? variant.grams / 1000 : null,
      addons: [],
      stains: [
        {
          name: stainName,
          inStock: variant.available,
          priceAddition: 0,
          image: stainImage,
        },
      ],
      _shopify: {
        id: product.id,
        handle: product.handle,
        variantId: variant.id,
      },
    });
  }

  return items;
}

async function main() {
  console.log("Logging into Shopify...");
  const cookie = await login();
  console.log("  OK");

  console.log("\nFetching products...");
  const products = await fetchProducts(cookie);
  console.log(`  ${products.length} products`);

  console.log("\nDownloading product images...");
  const imageLocalPaths = {};
  let dlCount = 0;
  for (const product of products) {
    for (const img of product.images) {
      const ext = path.extname(new URL(img.src).pathname) || ".jpg";
      const localPath = `/images/shopify/${img.id}${ext}`;
      const filePath = path.join(root, "public", localPath);
      if (!fs.existsSync(filePath)) {
        console.log(`  ${product.title.substring(0, 40)}...`);
        if (await downloadImage(img.src, filePath)) {
          dlCount++;
        }
      }
      imageLocalPaths[img.id] = localPath;
    }
  }
  console.log(`  ${dlCount} new images downloaded`);

  console.log("\nTransforming products...");
  const shopifyItems = products.flatMap(p => transformProduct(p, imageLocalPaths));
  console.log(`  ${shopifyItems.length} inventory items from Shopify`);

  // Merge with existing inventory (keep custom cribs)
  console.log("\nMerging with existing inventory...");
  const existingPath = path.join(root, "public", "data", "inventory.json");
  let existing = [];
  if (fs.existsSync(existingPath)) {
    existing = JSON.parse(fs.readFileSync(existingPath, "utf-8"));
  }
  console.log(`  ${existing.length} existing items`);

  // Keep custom cribs (where productName is a short name like "Darlington")
  // and replace any that came from Shopify with the same product name
  const existingCribs = existing.filter(i => i._shopify === undefined);
  const shopifyNames = new Set(shopifyItems.map(i => i.productName));
  const filteredExisting = existingCribs.filter(i => !shopifyNames.has(i.productName));

  const merged = [...filteredExisting, ...shopifyItems];
  console.log(`  ${merged.length} total items after merge`);

  // Clean up _shopify metadata from output
  const clean = merged.map(({ _shopify, ...item }) => item);

  fs.writeFileSync(existingPath, JSON.stringify(clean, null, 2));
  console.log(`\nWritten to public/data/inventory.json`);
}

main().catch(err => { console.error(err); process.exit(1); });
