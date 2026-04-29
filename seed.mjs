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
    const uploadUrl = await client.mutation(api.inventory.generateUploadUrl, { password: adminPassword });
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

async function seed() {
  if (!fs.existsSync(inventoryDir)) {
    console.error(`Inventory directory not found at ${inventoryDir}`);
    process.exit(1);
  }

  console.log("Starting bulk import...");
  const inventory = [];

  const cribs = fs.readdirSync(inventoryDir).filter(f => !f.startsWith(".") && fs.statSync(path.join(inventoryDir, f)).isDirectory());
  
  for (const cribName of cribs) {
    const cribPath = path.join(inventoryDir, cribName);
    const woods = fs.readdirSync(cribPath).filter(f => !f.startsWith(".") && fs.statSync(path.join(cribPath, f)).isDirectory());
    
    for (const woodName of woods) {
      const woodPath = path.join(cribPath, woodName);
      const stains = fs.readdirSync(woodPath).filter(f => !f.startsWith(".") && f.endsWith(".jpg"));
      
      console.log(`Processing: ${cribName} - ${woodName}...`);
      
      const stainList = [];
      for (const stainFileName of stains) {
        const stainPath = path.join(woodPath, stainFileName);
        // Extract stain name from filename: e.g. "FQP 101_Mission Crib_RedOak_Natural.jpg" -> "Natural"
        const stainName = stainFileName.replace(".jpg", "").split("_").pop();
        
        console.log(`  Uploading stain: ${stainName}`);
        const imageUrl = await uploadImage(stainPath);
        
        stainList.push({
          name: stainName,
          inStock: true,
          priceAddition: 0,
          image: imageUrl || ""
        });
      }
      
      inventory.push({
        cribName: cribName.replace("The ", ""),
        wood: woodName,
        description: cribName.includes("Mission") 
          ? "The Mission Style Crib draws inspiration from the early 20th-century Arts and Crafts movement, a design era known for its emphasis on craftsmanship and simplicity. Characterized by clean geometric lines, vertical slats, rectilinear forms, and bold square posts, it celebrates the honest beauty of natural hardwood. Free from ornate embellishments, the evenly spaced spindles and honest craftsmanship create an open, architectural presence that feels both timeless and refreshingly modern style making it an ideal choice for the nursery."
          : `The ${cribName} features exquisite Amish craftsmanship and timeless design.`,
        basePrice: 2499,
        stains: stainList
      });
    }
  }

  console.log(`Uploading ${inventory.length} products to Convex...`);
  await client.mutation(api.inventory.save, { password: adminPassword, inventory });
  console.log("Bulk import complete! Staged inventory is now populated.");
  console.log("Next step: Go to /admin and click 'Publish to Live'.");
  process.exit(0);
}

seed().catch(console.error);
