import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from "fs";
import { join, dirname, extname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const PRODUCTS = join(root, "public", "data", "products");
const BASE = "https://cdn.shopify.com/s/files/1/0745/0024/3630/files";

// Map of product image IDs to their Shopify product handles
const IMAGE_MAP = {
  // Tala Rugged Muse Portable Lamp
  "44209041047726": "tala-rugged-muse-portable-lamp",
  // Lorena Canals Silhouette
  "44209603510446": "lorena-canals-woolable-silhouette-washable-area-rug",
  // Livabliss Lillian 31352
  "44209044783278": "livabliss-lillian-31352-ivory-orange-blue-mdfst",
  // Livabliss Lillian 31354
  "44209047994542": "livabliss-lillian-31354-ivory-grey-mdfst",
  // Africa Enkang
  "44209599381678": "lorena-canals-woolable-africa-enkang-washable-area-rug",
  // Free Your Soul
  "44209600954542": "lorena-canals-woolable-free-your-soul-autumn-breeze-washable-area-rug",
  // Sheep of the World Dunes
  "44287094292654": "lorena-canals-woolable-sheep-of-the-world-dunes-washable-area-rug",
  // Sheep of the World Tundra
  "44209067262126": "woolable-sheep-of-the-world-tundra-washable-wool-hand-tufted-non-slip-backing-area-rug",
};

async function download(url, dest) {
  mkdirSync(dirname(dest), { recursive: true });
  try {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const buf = Buffer.from(await resp.arrayBuffer());
    writeFileSync(dest, buf);
    return true;
  } catch (e) {
    console.error(`  Failed: ${e.message}`);
    return false;
  }
}

// Find missing images and try to download from Shopify
const dirs = readdirSync(PRODUCTS).filter(d => existsSync(join(PRODUCTS, d, "media.json")));
let count = 0;

for (const dir of dirs) {
  const media = JSON.parse(readFileSync(join(PRODUCTS, dir, "media.json"), "utf-8"));
  for (const paths of Object.values(media)) {
    for (const p of paths) {
      const filePath = join(PRODUCTS, dir, p);
      if (existsSync(filePath) || p.startsWith("http")) continue;

      // Try to guess the Shopify URL from the filename
      console.log(`Missing: ${dir} / ${p}`);
    }
  }
}

console.log(`\nSkipping download — missing images need manual Shopify URL mapping`);
