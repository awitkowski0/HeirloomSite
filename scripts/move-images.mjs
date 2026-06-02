import { readFileSync, writeFileSync, renameSync, mkdirSync, existsSync, readdirSync, rmSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const PUBLIC = join(root, "public");
const PRODUCTS = join(PUBLIC, "data", "products");

function getProductDirs() {
  return readdirSync(PRODUCTS).filter(name => {
    const dir = join(PRODUCTS, name);
    return existsSync(dir) && existsSync(join(dir, "product.json"));
  });
}

let moved = 0;

for (const dirName of getProductDirs()) {
  const productDir = join(PRODUCTS, dirName);
  const mediaPath = join(productDir, "media.json");
  if (!existsSync(mediaPath)) continue;

  // Remove nested product directory if it was created by mistake
  const nestedDir = join(productDir, dirName);
  if (existsSync(nestedDir)) {
    rmSync(nestedDir, { recursive: true });
    console.log(`  Cleaned nested dir ${productDir}/${dirName}`);
  }

  const media = JSON.parse(readFileSync(mediaPath, "utf-8"));
  const updated = {};

  for (const [key, paths] of Object.entries(media)) {
    const newPaths = [];
    for (const oldPath of paths) {
      // Old path: "/images/Darlington/BrownMaple/Antique_Slate.jpg"
      // We want: "BrownMaple/Antique_Slate.jpg" (strip /images/{productName}/)
      const match = oldPath.match(/^\/images\/[^/]+\/(.+)/);
      if (match) {
        newPaths.push(match[1]);
      } else if (oldPath.startsWith("http")) {
        newPaths.push(oldPath);
      } else if (!oldPath.startsWith("/images/")) {
        // Already clean path
        newPaths.push(oldPath);
      }
    }

    if (newPaths.length > 0) {
      // Only update if paths changed
      if (JSON.stringify(newPaths) !== JSON.stringify(paths)) {
        updated[key] = newPaths;
      }
    }
  }

  if (Object.keys(updated).length > 0) {
    const merged = { ...media, ...updated };
    writeFileSync(mediaPath, JSON.stringify(merged, null, 2) + "\n");
    console.log(`  Updated ${dirName} media.json paths`);
  }
}

// Now move images from public/images/ into product directories
for (const dirName of getProductDirs()) {
  const productDir = join(PRODUCTS, dirName);
  const media = JSON.parse(readFileSync(join(productDir, "media.json"), "utf-8"));

  for (const paths of Object.values(media)) {
    for (const relativePath of paths) {
      // relativePath is now like "BrownMaple/Antique_Slate.jpg"
      // Source: public/images/Darlington/BrownMaple/Antique_Slate.jpg
      // Dest: public/data/products/Darlington/BrownMaple/Antique_Slate.jpg
      const sourceFile = join(PUBLIC, "images", dirName, relativePath);
      const destFile = join(productDir, relativePath);

      if (existsSync(sourceFile) && !existsSync(destFile)) {
        mkdirSync(dirname(destFile), { recursive: true });
        renameSync(sourceFile, destFile);
        moved++;
      }
    }
  }
}

console.log(`\nMoved ${moved} images into product directories`);
