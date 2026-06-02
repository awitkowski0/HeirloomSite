import { ConvexClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();
dotenv.config({ path: ".env.local" });

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const convexUrl = process.env.VITE_CONVEX_URL;
if (!convexUrl) {
  console.error("VITE_CONVEX_URL not found");
  process.exit(1);
}

const client = new ConvexClient(convexUrl);

function getStorageIdFromUrl(url) {
  if (!url) return null;
  const match = url.match(/\/storage\/([a-f0-9-]+)/i);
  return match ? match[1] : null;
}

function sanitizePath(name) {
  return name.replace(/[/\\?%*:|"<>]/g, "-").trim();
}

function buildLocalImagePath(productName, wood, stainName) {
  const dir = sanitizePath(productName);
  const woodDir = sanitizePath(wood);
  const stainFile = sanitizePath(stainName).replace(/\s+/g, "_") + ".jpg";
  return `/images/${dir}/${woodDir}/${stainFile}`;
}

async function downloadImage(url, destPath) {
  const dir = path.dirname(destPath);
  fs.mkdirSync(dir, { recursive: true });
  try {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const buffer = Buffer.from(await resp.arrayBuffer());
    fs.writeFileSync(destPath, buffer);
    return true;
  } catch (e) {
    console.error(`  Failed to download ${url}:`, e.message);
    return false;
  }
}

async function exportAll() {
  console.log("Connecting to Convex...");

  // 1. Export inventory (use staged if available, otherwise live)
  console.log("\nFetching inventory...");
  let inventory;
  try {
    inventory = await client.query(api.inventory.get, { useStaged: true });
  } catch {
    inventory = await client.query(api.inventory.get, { useStaged: false });
  }
  console.log(`  ${inventory.length} items`);

  // 2. Export showroom
  console.log("Fetching showroom...");
  let showroom = await client.query(api.showroom.get);
  console.log(`  ${showroom?.slides?.length || 0} slides, ${showroom?.featured?.length || 0} featured`);

  // 3. Export settings
  console.log("Fetching settings...");
  const settings = await client.query(api.settings.get);
  console.log(`  payment provider: ${settings?.paymentProvider}`);

  // --- Download images from stain.image URLs ---
  console.log("\nDownloading images...");
  const downloaded = new Set();
  const usedStainNames = new Set();

  // Collect all unique (productName, wood, stainName, imageUrl) tuples
  const imageTuples = [];
  for (const item of inventory) {
    const productName = item.productName ?? item.cribName ?? "Unknown";
    const wood = item.wood;
    for (const stain of item.stains) {
      if (stain.image) {
        imageTuples.push({
          productName,
          wood,
          stainName: stain.name,
          imageUrl: stain.image,
        });
        usedStainNames.add(stain.name);
      }
    }
  }

  // Also get showroom slide images
  if (showroom?.slides) {
    for (const slide of showroom.slides) {
      if (slide.image && slide.image.startsWith("http")) {
        const storageId = getStorageIdFromUrl(slide.image);
        if (storageId && !downloaded.has(storageId)) {
          const localPath = `/images/showroom/slide_${storageId}.jpg`;
          const filePath = path.join(root, "public", localPath);
          console.log(`  Downloading showroom slide...`);
          if (await downloadImage(slide.image, filePath)) {
            downloaded.add(storageId);
            slide.image = localPath;
          }
        }
      }
      if (slide.imageMobile && slide.imageMobile.startsWith("http")) {
        const storageId = getStorageIdFromUrl(slide.imageMobile);
        if (storageId && !downloaded.has(storageId)) {
          const localPath = `/images/showroom/slide_mobile_${storageId}.jpg`;
          const filePath = path.join(root, "public", localPath);
          console.log(`  Downloading showroom slide mobile...`);
          if (await downloadImage(slide.imageMobile, filePath)) {
            downloaded.add(storageId);
            slide.imageMobile = localPath;
          }
        }
      }
    }
  }

  // Download each unique image URL and record the mapping
  const urlToLocalPath = new Map();
  for (const { productName, wood, stainName, imageUrl } of imageTuples) {
    const storageId = getStorageIdFromUrl(imageUrl);
    if (!storageId || downloaded.has(storageId)) continue;

    const localPath = buildLocalImagePath(productName, wood, stainName);
    const filePath = path.join(root, "public", localPath);
    console.log(`  ${productName} / ${wood} / ${stainName}...`);
    if (await downloadImage(imageUrl, filePath)) {
      downloaded.add(storageId);
      urlToLocalPath.set(imageUrl, localPath);
    }
  }

  console.log(`\nImages downloaded: ${downloaded.size}`);

  // --- Transform data to use local paths ---
  console.log("\nTransforming data...");

  const transformedInventory = inventory.map((item) => {
    const productName = item.productName ?? item.cribName ?? "Unknown";
    return {
      productName,
      wood: item.wood,
      category: item.category || null,
      description: item.description || null,
      extendedDescription: item.extendedDescription || null,
      basePrice: item.basePrice,
      order: item.order ?? null,
      tags: item.tags || [],
      sku: item.sku || null,
      slug: item.slug || null,
      dimensions: item.dimensions || null,
      weight: item.weight ?? null,
      addons: (item.addons || []).map((a) => ({
        name: a.name,
        description: a.description || null,
        price: a.price,
        priceStained: a.priceStained,
        image: a.image || null,
        category: a.category || null,
        stainable: a.stainable,
      })),
      stains: item.stains.map((stain) => {
        const localPath = urlToLocalPath.get(stain.image) || stain.image;
        const gallery = (stain.gallery || []).map((g) => {
          const gLocalPath = urlToLocalPath.get(g.url) || g.url;
          return {
            url: gLocalPath,
            originalName: g.originalName,
          };
        });
        return {
          name: stain.name,
          inStock: stain.inStock,
          priceAddition: stain.priceAddition,
          image: localPath,
          gallery: gallery.length > 0 ? gallery : undefined,
        };
      }),
    };
  });

  // Build images.json from the path mapping
  const transformedImages = [];
  for (const item of inventory) {
    const productName = item.productName ?? item.cribName ?? "Unknown";
    for (let i = 0; i < item.stains.length; i++) {
      const stain = item.stains[i];
      const localPath = urlToLocalPath.get(stain.image);
      if (localPath) {
        transformedImages.push({
          productName,
          wood: item.wood,
          stainName: stain.name,
          path: localPath,
          order: i,
        });
      }
    }
  }

  // Build stain-types.json from the unique stain names found
  const stainTypesList = Array.from(usedStainNames).map((name) => ({
    name,
    color: null,
    defaultPriceAddition: 0,
  }));

  // Clean up showroom: remove Convex fields, ensure image paths are local
  const cleanedShowroom = {
    slides: (showroom?.slides || []).map((s) => ({
      image: s.image,
      imageMobile: s.imageMobile || undefined,
      productId: s.productId || undefined,
    })),
    featured: (showroom?.featured || []).map((f) => ({
      productName: f.productName || f.cribName,
      stainName: f.stainName || undefined,
    })),
  };

  // --- Write data files ---
  console.log("Writing data files...");
  const dataDir = path.join(root, "data");
  fs.mkdirSync(dataDir, { recursive: true });

  fs.writeFileSync(path.join(dataDir, "inventory.json"), JSON.stringify(transformedInventory, null, 2));
  console.log(`  data/inventory.json (${transformedInventory.length} items)`);

  fs.writeFileSync(path.join(dataDir, "images.json"), JSON.stringify(transformedImages, null, 2));
  console.log(`  data/images.json (${transformedImages.length} images)`);

  fs.writeFileSync(path.join(dataDir, "showroom.json"), JSON.stringify(cleanedShowroom, null, 2));
  console.log(`  data/showroom.json`);

  fs.writeFileSync(path.join(dataDir, "stain-types.json"), JSON.stringify(stainTypesList, null, 2));
  console.log(`  data/stain-types.json (${stainTypesList.length} stains)`);

  fs.writeFileSync(path.join(dataDir, "settings.json"), JSON.stringify(settings, null, 2));
  console.log(`  data/settings.json`);

  console.log("\nExport complete!");
  client.close();
}

exportAll().catch((err) => {
  console.error("Export failed:", err);
  process.exit(1);
});
