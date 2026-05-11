import { ConvexClient } from "convex/browser";
import { api } from "./convex/_generated/api.js";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();
dotenv.config({ path: ".env.local" });

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const inventoryDir = path.join(__dirname, "public", "assets", "inventory");
const adminPassword = process.env.VITE_ADMIN_PASSWORD || "heirloom2024";
const convexUrl = process.env.VITE_CONVEX_URL;

if (!convexUrl) {
  console.error("Error: VITE_CONVEX_URL not found in .env or .env.local");
  process.exit(1);
}

const client = new ConvexClient(convexUrl);

async function uploadImage(filePath) {
  try {
    const uploadUrl = await client.mutation(api.images.generateUploadUrl, { password: adminPassword });
    const fileContent = fs.readFileSync(filePath);
    const response = await fetch(uploadUrl, {
      method: "POST",
      body: fileContent,
    });
    const { storageId } = await response.json();
    return storageId;
  } catch (e) {
    console.error(`Failed to upload ${filePath}:`, e);
    return null;
  }
}

function parseStainName(fileName) {
  const name = fileName.replace(/\.(jpg|jpeg|png|webp|gif)$/i, "");
  const parts = name.split(/[_\-\s]+/);
  return parts[parts.length - 1] || name;
}

async function seed() {
  if (!fs.existsSync(inventoryDir)) {
    console.error(`Inventory directory not found at ${inventoryDir}`);
    process.exit(1);
  }

  console.log("Starting bulk import...");
  const inventory = [];
  const seenStains = new Set();

  const cribs = fs.readdirSync(inventoryDir).filter(f => !f.startsWith(".") && fs.statSync(path.join(inventoryDir, f)).isDirectory());
  
  for (const cribName of cribs) {
    const cribPath = path.join(inventoryDir, cribName);
    const woods = fs.readdirSync(cribPath).filter(f => !f.startsWith(".") && fs.statSync(path.join(cribPath, f)).isDirectory());
    
    for (const woodName of woods) {
      const woodPath = path.join(cribPath, woodName);
      const files = fs.readdirSync(woodPath).filter(f => !f.startsWith(".") && /\.(jpg|jpeg|png|webp|gif)$/i.test(f));
      
      console.log(`Processing: ${cribName} - ${woodName}...`);
      
      const stainList = [];
      for (const fileName of files) {
        const filePath = path.join(woodPath, fileName);
        const stainName = parseStainName(fileName);
        
        console.log(`  Uploading: ${fileName} -> stain: ${stainName}`);
        const storageId = await uploadImage(filePath);
        
        if (storageId) {
          stainList.push({
            name: stainName,
            inStock: true,
            priceAddition: 0,
            image: storageId,
          });

          await client.mutation(api.images.saveImageRecord, {
            password: adminPassword,
            cribName: cribName.replace("The ", ""),
            wood: woodName,
            storageId,
            originalName: fileName,
            mimeType: "image/jpeg",
            size: fs.statSync(filePath).size,
            autoLink: true,
          });
        } else {
          console.error(`  Failed to upload: ${fileName}`);
        }
      }
      
      inventory.push({
        cribName: cribName.replace("The ", ""),
        wood: woodName,
        description: cribName.includes("Mission") 
          ? "The Mission Style Crib draws inspiration from the early 20th-century Arts and Crafts movement..."
          : `The ${cribName} features exquisite Amish craftsmanship and timeless design.`,
        basePrice: 2499,
        stains: stainList,
      });
    }
  }

  console.log(`Uploading ${inventory.length} products to Convex...`);
  await client.mutation(api.inventory.save, { password: adminPassword, inventory });
  
  console.log("Discovering stain types from inventory...");
  await client.mutation(api.stainTypes.autoDiscover, { password: adminPassword });
  
  console.log("Bulk import complete! Staged inventory is now populated.");
  console.log("Next step: Go to /admin and click 'Publish to Live'.");
  process.exit(0);
}

seed().catch(console.error);
