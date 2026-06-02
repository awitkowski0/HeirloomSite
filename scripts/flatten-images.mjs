import { readFileSync, writeFileSync, renameSync, readdirSync, existsSync, statSync, unlinkSync, rmSync, mkdirSync } from "fs";
import { join, dirname, extname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const PRODUCTS = join(root, "public", "data", "products");

function getProductDirs() {
  return readdirSync(PRODUCTS).filter(d => existsSync(join(PRODUCTS, d, "product.json")));
}

function slug(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

let totalFiles = 0;

for (const dirName of getProductDirs()) {
  const productDir = join(PRODUCTS, dirName);
  const mediaPath = join(productDir, "media.json");
  const productMeta = JSON.parse(readFileSync(join(productDir, "product.json"), "utf-8"));
  const baseName = slug(productMeta.productName || dirName);

  if (!existsSync(mediaPath)) continue;

  const media = JSON.parse(readFileSync(mediaPath, "utf-8"));

  // Collect all image files with their current paths
  const fileMoves = [];
  const newMedia = {};

  let globalIdx = 0;

  for (const [key, paths] of Object.entries(media)) {
    const newPaths = [];
    for (const oldPath of paths) {
      const ext = extname(oldPath) || ".jpg";
      const newName = `${baseName}_${globalIdx}${ext}`;
      const sourceFile = join(productDir, oldPath);
      const destFile = join(productDir, newName);

      if (existsSync(sourceFile) && sourceFile !== destFile) {
        fileMoves.push({ from: sourceFile, to: destFile });
      } else if (!existsSync(sourceFile)) {
        console.log(`  MISSING: ${sourceFile}`);
      }

      newPaths.push(newName);
      globalIdx++;
    }
    newMedia[key] = newPaths;
  }

  // Move/rename files
  for (const { from, to } of fileMoves) {
    mkdirSync(dirname(to), { recursive: true });
    renameSync(from, to);
    totalFiles++;
  }

  // Update media.json
  writeFileSync(mediaPath, JSON.stringify(newMedia, null, 2) + "\n");

  // Clean up old variant directories
  const oldDirs = readdirSync(productDir).filter(d => {
    const full = join(productDir, d);
    return statSync(full).isDirectory() && d !== "shopify";
  });
  for (const dir of oldDirs) {
    try { rmSync(join(productDir, dir), { recursive: true }); } catch {}
  }

  // Handle shopify subdirectory — flatten files
  const shopifyDir = join(productDir, "shopify");
  if (existsSync(shopifyDir)) {
    const shopifyFiles = readdirSync(shopifyDir).filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f));
    for (const file of shopifyFiles) {
      const ext = extname(file) || ".jpg";
      const newName = `${baseName}_${globalIdx}${ext}`;
      renameSync(join(shopifyDir, file), join(productDir, newName));
      globalIdx++;
      totalFiles++;
    }
    // Remove shopify dir
    rmSync(shopifyDir, { recursive: true });
  }

  console.log(`${dirName}: ${globalIdx} images → ${baseName}_0..${globalIdx - 1}.jpg`);
}

console.log(`\nTotal: ${totalFiles} files renamed`);
