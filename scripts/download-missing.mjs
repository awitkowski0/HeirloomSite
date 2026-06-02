import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const PRODUCTS = join(root, "public", "data", "products");
const SHOPIFY_DIR = join(root, "public", "images", "shopify");

const SHOP_URL = "https://heirloomcribsandmore.com";
const PASSWORD = "deajay";

async function login() {
  const resp = await fetch(`${SHOP_URL}/password`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ form_type: "storefront_password", utf8: "✓", password: PASSWORD }),
    redirect: "manual",
  });
  const cookies = resp.headers.getSetCookie?.() || [];
  return cookies.map(c => c.split(";")[0]).join("; ");
}

async function download(url, dest) {
  mkdirSync(dirname(dest), { recursive: true });
  try {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    writeFileSync(dest, Buffer.from(await resp.arrayBuffer()));
    return true;
  } catch (e) {
    console.error(`  FAILED: ${e.message}`);
    return false;
  }
}

function slug(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

// Login and get products
console.log("Logging in...");
const cookie = await login();

console.log("Fetching products...");
const resp = await fetch(`${SHOP_URL}/products.json?limit=250`, { headers: { Cookie: cookie } });
const { products } = await resp.json();
console.log(`  ${products.length} products`);

// Build lookup: product title → images
const titleToImages = {};
for (const p of products) {
  titleToImages[p.title] = p.images;
}

// Find all missing images in media.json
const dirs = readdirSync(PRODUCTS).filter(d => existsSync(join(PRODUCTS, d, "media.json")));
let downloaded = 0;
let skipped = 0;
let notFound = 0;

for (const dir of dirs) {
  const meta = JSON.parse(readFileSync(join(PRODUCTS, dir, "product.json"), "utf-8"));
  const media = JSON.parse(readFileSync(join(PRODUCTS, dir, "media.json"), "utf-8"));
  const images = titleToImages[meta.productName] || [];
  const baseName = slug(meta.productName || dir);

  let idx = 0;
  for (const [, paths] of Object.entries(media)) {
    for (const p of paths) {
      const filePath = join(PRODUCTS, dir, p);
      if (existsSync(filePath) || p.startsWith("http")) {
        skipped++;
        continue;
      }

      // Try to download from Shopify CDN using product images
      const shopifyImg = images[idx] || images[0];
      if (shopifyImg) {
        console.log(`  ${meta.productName}: downloading image ${idx}...`);
        const ok = await download(shopifyImg.src, filePath);
        if (ok) downloaded++;
        else notFound++;
      }
      idx++;
    }
  }
}

console.log(`\nDownloaded: ${downloaded}, Skipped: ${skipped}, Failed: ${notFound}`);
