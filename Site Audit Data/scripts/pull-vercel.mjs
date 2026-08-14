import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const AUDIT = path.resolve(__dirname, '..')
const SITE = path.resolve(AUDIT, '..')
const PRODUCTS = path.join(SITE, 'public', 'data', 'products')
const OUT = path.join(AUDIT, 'raw', 'vercel')
const IMG_OUT = path.join(AUDIT, 'images', 'vercel')

const RUG_LAMP = /\b(area\s*rugs?|livabliss|lorena\s*canals|lamps?)\b/i

function ensureDir(d) {
  fs.mkdirSync(d, { recursive: true })
}

function copyFile(src, dest) {
  ensureDir(path.dirname(dest))
  fs.copyFileSync(src, dest)
}

function loadJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'))
}

ensureDir(OUT)
ensureDir(IMG_OUT)

const dirs = fs
  .readdirSync(PRODUCTS, { withFileTypes: true })
  .filter((d) => d.isDirectory() && d.name.toLowerCase() !== 'showroom')
  .map((d) => d.name)

const products = []
const imageManifest = []
let imageCopies = 0
let excluded = []

for (const dirName of dirs) {
  const dir = path.join(PRODUCTS, dirName)
  const productPath = path.join(dir, 'product.json')
  const variantsPath = path.join(dir, 'variants.json')
  const mediaPath = path.join(dir, 'media.json')
  if (!fs.existsSync(productPath)) continue

  const product = loadJson(productPath)
  const variants = fs.existsSync(variantsPath) ? loadJson(variantsPath) : []
  const media = fs.existsSync(mediaPath) ? loadJson(mediaPath) : {}

  const cat = `${product.category || ''} ${product.productName || ''} ${dirName}`
  if (RUG_LAMP.test(cat) || /area rugs?/i.test(product.category || '')) {
    excluded.push({ dirName, productName: product.productName, category: product.category })
    // still record as vercel-only soft-excluded for transparency
  }

  const isHardGood = !RUG_LAMP.test(cat) && !/area rugs?/i.test(product.category || '')

  // stage images
  const safeDir = dirName.replace(/[<>:"/\\|?*]/g, '_')
  const imgDir = path.join(IMG_OUT, safeDir)
  ensureDir(imgDir)
  const files = fs.readdirSync(dir).filter((f) => /\.(jpe?g|png|webp|gif)$/i.test(f))
  const localImages = []
  for (const f of files) {
    const dest = path.join(imgDir, f)
    copyFile(path.join(dir, f), dest)
    imageCopies++
    const rel = `images/vercel/${safeDir}/${f}`
    localImages.push(rel)
    imageManifest.push({
      dirName,
      productName: product.productName,
      slug: product.slug,
      file: f,
      localPath: rel,
    })
  }

  // map media keys to local paths
  const mediaMapped = {}
  for (const [key, arr] of Object.entries(media)) {
    mediaMapped[key] = (arr || []).map((f) => `images/vercel/${safeDir}/${f}`)
  }

  const row = {
    dirName,
    productName: product.productName,
    slug: product.slug,
    category: product.category,
    variantType: product.variantType,
    description: product.description || '',
    extendedDescription: product.extendedDescription ?? null,
    title: product.title || '',
    metaDescription: product.metaDescription || '',
    tags: product.tags || [],
    addons: product.addons || [],
    defaultVariant: product.defaultVariant,
    variants: (variants || []).map((v) => ({
      variant: v.variant,
      label: v.label,
      stains: v.stains || [],
      basePrice: v.basePrice,
      sku: v.sku ?? null,
      dimensions: v.dimensions ?? null,
      weight: v.weight ?? null,
      unavailable: v.unavailable ?? false,
      unavailableStains: v.unavailableStains || [],
    })),
    media: mediaMapped,
    imageFiles: localImages,
    imageCount: localImages.length,
    isHardGood,
    sourcePaths: {
      product: `public/data/products/${dirName}/product.json`,
      variants: `public/data/products/${dirName}/variants.json`,
      media: `public/data/products/${dirName}/media.json`,
    },
  }
  products.push(row)
}

const hard = products.filter((p) => p.isHardGood)
const soft = products.filter((p) => !p.isHardGood)

const catalog = {
  pulledAt: new Date().toISOString(),
  source: SITE,
  totalProducts: products.length,
  hardGoodsCount: hard.length,
  excludedCount: soft.length,
  excluded: soft.map((p) => ({
    dirName: p.dirName,
    productName: p.productName,
    category: p.category,
  })),
  products: hard,
}

fs.writeFileSync(path.join(OUT, 'catalog.json'), JSON.stringify(catalog, null, 2))
fs.writeFileSync(path.join(OUT, 'image-manifest.json'), JSON.stringify(imageManifest, null, 2))
fs.writeFileSync(
  path.join(OUT, 'pull-summary.json'),
  JSON.stringify(
    {
      hardGoods: hard.length,
      excluded: soft.length,
      imagesCopied: imageCopies,
      catalog: 'raw/vercel/catalog.json',
    },
    null,
    2,
  ),
)

console.log(
  `Vercel pull done: ${hard.length} hard goods, ${soft.length} excluded, ${imageCopies} images staged`,
)
