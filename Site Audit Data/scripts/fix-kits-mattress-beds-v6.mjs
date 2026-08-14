/**
 * Task 1 · v6 fixes
 * 1) Crib Mattress image
 * 2) Shopify "Kit" titles → Vercel productName/title must include Kit
 * 3) Conversion wording: toddler = conversion kit, not a standalone bed
 * 4) Bed size language vs OTO/FQP pricebooks (double/full vs twin)
 */
import fs from 'node:fs'
import path from 'node:path'
import https from 'node:https'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const AUDIT = path.resolve(__dirname, '..')
const SITE = path.resolve(AUDIT, '..')
const PRODUCTS = path.join(SITE, 'public', 'data', 'products')
const REPORT = path.join(AUDIT, 'derived', 'fix-kits-mattress-beds-v6-report.json')

function load(p) {
  let t = fs.readFileSync(p, 'utf8')
  if (t.charCodeAt(0) === 0xfeff) t = t.slice(1)
  return JSON.parse(t)
}
function writeJson(p, o) {
  fs.writeFileSync(p, JSON.stringify(o, null, 2) + '\n', 'utf8')
}

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest)
    https
      .get(url, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          file.close()
          fs.unlinkSync(dest)
          return download(res.headers.location, dest).then(resolve, reject)
        }
        if (res.statusCode !== 200) {
          file.close()
          return reject(new Error('HTTP ' + res.statusCode))
        }
        res.pipe(file)
        file.on('finish', () => file.close(() => resolve(dest)))
      })
      .on('error', reject)
  })
}

/** Map Vercel dirName → desired productName (with Kit where Shopify has Kit) */
const NAME_FIXES = {
  'Addison Toddler Bed': 'Addison Toddler Bed Rail Kit',
  'Newport Toddler Bed': 'Newport Toddler Bed Rail Kit',
  'Mackenzie Toddler Bed': 'Mackenzie Toddler Bed Rail Kit',
  'West Lake Toddler Bed': 'West Lake Toddler Bed Rail Kit',
  'Toddler Conversion Rail': 'Toddler Bed Rail Kit',
  'Guard Rail': 'Guard Rail Kit',
  '3-4 Guard Rail': '3/4 Guard Rail Kit',
  'Full Guard Rail': 'Full Guard Rail Kit',
  // Full bed kits already have Kit in name
}

/** Bed size truth from OTO pricebook + FQP */
// Main OTO collections: Double/Full bed rails — NOT twin
// Mini Newport only: Twin Bed Conversion (1380-B)
// FQP-103: Full Bedrails
function bedSizeForProduct(productName, slug) {
  const n = `${productName} ${slug}`.toLowerCase()
  if (/mini newport/.test(n)) return 'twin'
  if (/full bed|double bed|bed rail kit|bedrails/.test(n) && !/toddler|guard/.test(n)) return 'full'
  if (/toddler/.test(n)) return 'toddler'
  if (/guard rail/.test(n)) return 'guard'
  if (/crib/.test(n) && !/mattress/.test(n)) return 'crib-converts-full' // standard 4-in-1 path ends in full/double
  return 'other'
}

function rewriteConversionCopy(text, productName, bedKind) {
  let t = text || ''

  // Never imply a separate furniture "toddler bed" product when this is a kit
  if (bedKind === 'toddler' || /rail kit|conversion kit/i.test(productName)) {
    t = t.replace(/\bthis toddler bed\b/gi, 'this conversion kit')
    t = t.replace(/\ba toddler bed with this\b/gi, 'your crib into a toddler bed with this')
    t = t.replace(/\bComplete your (.+?) crib with this toddler bed conversion kit\b/gi,
      'Complete your $1 crib with this toddler bed rail kit')
    t = t.replace(/\bTransition your little one to a toddler bed with this (.+?) conversion kit\b/gi,
      'Help your little one take the next step with this $1 toddler bed rail kit')
    t = t.replace(/\bConvert your (.+?) crib into a toddler bed with this easy-to-install conversion kit\b/gi,
      'Convert your $1 crib into a toddler bed configuration with this easy-to-install rail kit')
    // Clarify kit nature
    if (!/conversion kit|rail kit/i.test(t.slice(0, 200))) {
      // ensure opening mentions kit
    }
    // Remove language that sounds like buying a whole bed
    t = t.replace(/\ba separate bed\b/gi, 'a new bed frame')
    t = t.replace(/\bstandalone bed\b/gi, 'separate bed frame')
  }

  if (bedKind === 'full') {
    // Pricebook: double/full — one SKU, not a twin-or-full choice
    t = t.replace(/\btwin beds?\b/gi, 'full-size (double) bed')
    t = t.replace(/\bfull[- ]size beds?\b/gi, 'full-size (double) bed')
    t = t.replace(/full-size \(double\) \(double\)/gi, 'full-size (double)')
    // remove any "choose twin or full"
    t = t.replace(/[^.]*\b(choose|select|option for)\b[^.]*\b(twin|full)[^.]*\./gi, '')
    if (!/full-size \(double\)/i.test(t)) {
      // ensure one clear size statement for kits
      if (/rail kit|conversion/i.test(productName)) {
        t = t.replace(
          /^(.*?\.)\s*/,
          (m) =>
            m.includes('full-size') || m.includes('double')
              ? m
              : m.replace(/\.$/, '') +
                ' This kit is for a full-size (double) bed conversion, matching the manufacturer bed-rail option on the price list.\n\n',
        )
      }
    }
    // Soften double statement spam
    let count = 0
    t = t.replace(/full-size \(double\) bed/gi, () => {
      count++
      return count <= 2 ? 'full-size (double) bed' : 'full-size bed'
    })
  }

  if (bedKind === 'twin') {
    t = t.replace(/\bfull[- ]size \(double\) beds?\b/gi, 'twin bed')
    t = t.replace(/\bfull[- ]size beds?\b/gi, 'twin bed')
    t = t.replace(/\bdouble beds?\b/gi, 'twin bed')
    if (!/\btwin bed\b/i.test(t) && /conversion|rail/i.test(productName)) {
      t =
        t.replace(/\.$/, '') +
        ' This conversion is sized for a twin mattress, per the manufacturer twin bed conversion option.\n'
    }
  }

  if (bedKind === 'crib-converts-full') {
    // 4-in-1 path: crib → toddler → daybed → full/double (not twin), kits may be separate
    t = t.replace(/\btwin bed\b/gi, 'full-size bed')
    // Prefer clear stage language without over-claiming kits included
    t = t.replace(
      /toward a full-size bed when they are ready/gi,
      'toward a full-size (double) bed when they are ready, using the matching bed rail kit',
    )
    t = t.replace(
      /crib to toddler bed, daybed, and full-size bed/gi,
      'crib to toddler bed, daybed, and full-size (double) bed',
    )
    t = t.replace(
      /daybed, and full-size bed/gi,
      'daybed, and full-size (double) bed',
    )
    // Don't imply twin/full choice on one price
    t = t.replace(/[^.]*\b(twin or full|full or twin|choose your bed size)[^.]*\./gi, '')
  }

  // Guard rails: not bed size options
  if (bedKind === 'guard') {
    t = t.replace(/\bfull-size bed mode\b/gi, 'bed mode after conversion')
  }

  // Cleanup
  t = t.replace(/\s{2,}/g, ' ').replace(/\n{3,}/g, '\n\n').trim()
  return t
}

function ensureKitMentionInDesc(desc, productName) {
  if (!/kit/i.test(productName)) return desc
  if (/kit/i.test(desc.slice(0, 280))) return desc
  const lead = `${productName} is a conversion kit that works with your matching crib, not a separate standalone bed. `
  return lead + desc
}

function buildMeta(desc, productName) {
  const sents = (desc.replace(/\n+/g, ' ').match(/[^.!?]+[.!?]+/g) || []).map((s) => s.trim())
  let m = sents.find((s) => s.length >= 50 && !/Get Personal Assistance/i.test(s)) || sents[0] || productName
  if (m.length < 90 && sents[1] && `${m} ${sents[1]}`.length <= 158) m = `${m} ${sents[1]}`
  if (m.length > 158) m = sents[0]
  if (!/[.!?]$/.test(m)) m += '.'
  m = m.replace(/\s*[—–]\s*Heirloom.*/i, '.')
  return m
}

const report = {
  at: new Date().toISOString(),
  mattress: null,
  renames: [],
  bedSize: [],
  notes: [
    'OTO pricebook: most -B rails are Double Bed Rail / Full Bed Conversion / Bed Rail (not twin).',
    'OTO Mini Newport 1380-B is Twin Bed Conversion only.',
    'FQP packages include 102 (toddler) + 103 (Full Bedrails) — full-size path, not twin.',
    'Each Vercel kit SKU has one price — copy must not imply twin vs full choice on the same product.',
  ],
}

// ——— 1) Mattress image ———
const mattDir = path.join(PRODUCTS, 'Crib Mattress')
const mattImgLocal = path.join(AUDIT, 'images', 'shopify', 'oto-280-crib-mattress', 'media-001.jpg')
const mattDest = path.join(mattDir, 'crib_mattress_0.jpg')
const shopUrl =
  'https://cdn.shopify.com/s/files/1/0745/0024/3630/files/Crib-Mattress.jpg?v=1780698661'

async function ensureMattressImage() {
  fs.mkdirSync(mattDir, { recursive: true })
  // Prefer higher-res CDN (width param)
  const hi = shopUrl.replace(/(\?|$)/, (m) => (m === '?' ? '?width=1200&' : '?width=1200'))
  const tryUrls = [
    shopUrl.replace('.jpg?', '_2048x.jpg?').replace('.jpg', '_2048x.jpg'),
    hi,
    shopUrl,
  ]
  let ok = false
  for (const u of tryUrls) {
    try {
      await download(u, mattDest)
      const sz = fs.statSync(mattDest).size
      if (sz > 3000) {
        ok = true
        report.mattress = { source: u, bytes: sz, path: 'public/data/products/Crib Mattress/crib_mattress_0.jpg' }
        break
      }
    } catch {
      /* try next */
    }
  }
  if (!ok && fs.existsSync(mattImgLocal)) {
    fs.copyFileSync(mattImgLocal, mattDest)
    report.mattress = {
      source: 'local-audit-copy',
      bytes: fs.statSync(mattDest).size,
      path: 'public/data/products/Crib Mattress/crib_mattress_0.jpg',
      note: 'Shopify CDN asset is low-res; using best available',
    }
  }
  writeJson(path.join(mattDir, 'media.json'), {
    'Default Title||Default': ['crib_mattress_0.jpg'],
  })
  // fix mattress copy lightly
  const pj = path.join(mattDir, 'product.json')
  if (fs.existsSync(pj)) {
    const p = load(pj)
    p.title = 'Crib Mattress'
    p.productName = 'Crib Mattress'
    let d = p.description || ''
    d = d.replace(/\bfrom Old Time Oak\b/gi, '')
    d = d.replace(/\bOTO\b/g, '')
    d = d.replace(/\s{2,}/g, ' ').trim()
    if (!/Get Personal Assistance/i.test(d)) {
      d +=
        '\n\nIf you would like help confirming fit with your crib model, use Get Personal Assistance. We reply the same or next business day so you can decide with full information, at your own pace.'
    }
    // mattress is not a twin/full conversion
    d = d.replace(/toward a full-size bed[\s\S]*?each season\./gi, '')
    d = d.replace(/Imagine it as the quiet center[\s\S]*?each season\./gi, '')
    p.description = d.replace(/\n{3,}/g, '\n\n').trim()
    p.metaDescription = buildMeta(p.description, p.productName)
    writeJson(pj, p)
  }
}

// ——— 2–4) Rename kits + rewrite copy ———
function processProducts() {
  for (const d of fs.readdirSync(PRODUCTS, { withFileTypes: true }).filter((x) => x.isDirectory())) {
    if (d.name === 'showroom') continue
    const dir = path.join(PRODUCTS, d.name)
    const pj = path.join(dir, 'product.json')
    if (!fs.existsSync(pj)) continue
    const p = load(pj)
    if (/rug|lamp/i.test(p.category || '')) continue

    const oldName = p.productName
    if (NAME_FIXES[d.name] || NAME_FIXES[oldName]) {
      const nn = NAME_FIXES[d.name] || NAME_FIXES[oldName]
      p.productName = nn
      p.title = nn
      report.renames.push({ dir: d.name, from: oldName, to: nn })
    } else {
      // title = product name only (already)
      p.title = p.productName
    }

    // If shopify-style kit in name but productName missing Kit
    if (/kit/i.test(p.productName) === false) {
      // check matches from shopify later via dir heuristics already in NAME_FIXES
    }

    const bedKind = bedSizeForProduct(p.productName, p.slug || '')
    let desc = p.description || ''
    desc = rewriteConversionCopy(desc, p.productName, bedKind)
    desc = ensureKitMentionInDesc(desc, p.productName)

    // Soft CTA without em dash
    if (!/Get Personal Assistance/i.test(desc)) {
      desc +=
        '\n\nIf you would like help choosing a finish, confirming timing, or picturing how this piece fits your nursery plans, use Get Personal Assistance. We reply the same or next business day so you can decide with full information, at your own pace.'
    }

    // Final hygiene
    desc = desc
      .replace(/\s*[—–]\s*/g, ', ')
      .replace(/,\s*,/g, ',')
      .replace(/\s{2,}/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/\.([A-Za-z])/g, '. $1')
      .trim()

    p.description = desc
    p.metaDescription = buildMeta(desc, p.productName)
    writeJson(pj, p)

    report.bedSize.push({
      dir: d.name,
      productName: p.productName,
      bedKind,
      slug: p.slug,
    })
  }
}

// ——— 3) Variant/media sanity check report ———
function auditVariantsMedia() {
  const issues = []
  for (const d of fs.readdirSync(PRODUCTS, { withFileTypes: true }).filter((x) => x.isDirectory())) {
    if (d.name === 'showroom') continue
    const dir = path.join(PRODUCTS, d.name)
    const pj = path.join(dir, 'product.json')
    const vj = path.join(dir, 'variants.json')
    const mj = path.join(dir, 'media.json')
    if (!fs.existsSync(pj) || !fs.existsSync(vj) || !fs.existsSync(mj)) continue
    const p = load(pj)
    const variants = load(vj)
    const media = load(mj)
    const files = new Set(fs.readdirSync(dir).filter((f) => /\.(jpe?g|png|webp)$/i.test(f)))

    for (const v of variants) {
      const stains = v.stains || ['Default']
      for (const st of stains) {
        const key = `${v.variant}||${st}`
        const arr = media[key]
        if (!arr || !arr.length) {
          issues.push({ dir: d.name, issue: 'missing-media-key', key, variant: v.variant, stain: st })
          continue
        }
        for (const f of arr) {
          if (!files.has(f)) issues.push({ dir: d.name, issue: 'missing-file', key, file: f })
        }
      }
    }
    // orphan media keys
    for (const key of Object.keys(media)) {
      const [vv, ss] = key.split('||')
      const ok = variants.some(
        (v) => v.variant === vv && (v.stains || []).includes(ss),
      )
      if (!ok && key !== 'Default Title||Default') {
        // finish-type often stain===variant
        const ok2 = variants.some((v) => `${v.variant}||${(v.stains || [])[0]}` === key)
        if (!ok2) issues.push({ dir: d.name, issue: 'orphan-media-key', key })
      }
    }
  }
  report.variantMediaIssues = issues
  report.variantMediaIssueCount = issues.length
}

await ensureMattressImage()
processProducts()
auditVariantsMedia()
writeJson(REPORT, report)
console.log(
  JSON.stringify(
    {
      mattress: report.mattress,
      renames: report.renames.length,
      renameList: report.renames,
      variantMediaIssues: report.variantMediaIssueCount,
      sampleIssues: (report.variantMediaIssues || []).slice(0, 15),
      report: REPORT,
    },
    null,
    2,
  ),
)
