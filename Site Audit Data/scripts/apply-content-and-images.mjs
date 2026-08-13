/**
 * Task 1 follow-up: SEO + content expert merge Shopify → Vercel
 * - Prefer warm, human, family-friendly tone
 * - Keep concrete SEO facts (solid hardwood, USA, safety, stages)
 * - Strip AI clichés / keyword stuffing
 * - Import missing good-quality Shopify images into product galleries
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import crypto from 'node:crypto'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const AUDIT = path.resolve(__dirname, '..')
const SITE = path.resolve(AUDIT, '..')
const PRODUCTS = path.join(SITE, 'public', 'data', 'products')
const SHOP_IMG = path.join(AUDIT, 'images', 'shopify')
const REPORT = path.join(AUDIT, 'derived', 'content-image-apply-report.json')

function loadJson(p) {
  let t = fs.readFileSync(p, 'utf8')
  if (t.charCodeAt(0) === 0xfeff) t = t.slice(1)
  return JSON.parse(t)
}
function writeJson(p, obj) {
  fs.writeFileSync(p, JSON.stringify(obj, null, 2) + '\n', 'utf8')
}
function ensureDir(d) {
  fs.mkdirSync(d, { recursive: true })
}

// ——— Copy editing ———
const AI_CLICHES = [
  [/in today's fast-paced world,?/gi, ''],
  [/look no further[.!]?/gi, ''],
  [/elevate your (nursery|space|home)/gi, 'bring warmth to your $1'],
  [/nestled (in|within)/gi, 'in'],
  [/delve into/gi, 'explore'],
  [/a tapestry of/gi, 'a mix of'],
  [/unlock the secrets of/gi, 'discover'],
  [/revolutionize/gi, 'improve'],
  [/game-?changer/gi, 'helpful addition'],
  [/breathtaking/gi, 'lovely'],
  [/stunningly beautiful/gi, 'beautiful'],
  [/dreamy nursery you.?ll love spending time in/gi, 'nursery that feels like home'],
  [/the centerpiece your nursery deserves/gi, 'a beautiful centerpiece for your nursery'],
  [/meticulous attention to detail/gi, 'careful craftsmanship'],
  [/unparalleled/gi, 'lasting'],
  [/crafted to perfection/gi, 'carefully made'],
  [/ultimate (choice|solution)/gi, 'trusted $1'],
  [/\s{2,}/g, ' '],
]

function fixGrammar(text) {
  if (!text) return ''
  let t = String(text)
  // normalize newlines to spaces for PDP paragraphs, keep intentional breaks as paragraphs
  t = t.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  // missing space after period before a letter
  t = t.replace(/\.([A-Za-z])/g, '. $1')
  // em/en dash spacing
  t = t.replace(/\s*[–—]\s*/g, ' — ')
  // hyphen used as dash between clauses "see it-and keep"
  t = t.replace(/([a-z])-and /gi, '$1 — and ')
  // collapse spaces
  t = t.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n')
  t = t.replace(/[ \t]{2,}/g, ' ')
  // trim each paragraph
  t = t
    .split(/\n\n+/)
    .map((p) => p.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n\n')
  for (const [re, rep] of AI_CLICHES) t = t.replace(re, rep)
  t = t.replace(/\s{2,}/g, ' ').trim()
  // ensure ends with period if letter
  if (/[a-zA-Z)]$/.test(t) && !/[.!?]"?$/.test(t)) t += '.'
  return t
}

function stripHtml(html) {
  if (!html) return ''
  return String(html)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<li>/gi, '• ')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
}

function scoreCopy(text, { preferWarm = false } = {}) {
  if (!text) return 0
  let s = Math.min(text.length, 2000) / 20
  const warm = [
    'family',
    'little one',
    'nursery',
    'peace of mind',
    'grow with',
    'years',
    'home',
    'parents',
    'baby',
    'cherish',
    'welcome',
    'handcrafted',
    'pennsylvania',
    'artisans',
  ]
  const facts = [
    'solid hardwood',
    'made in the usa',
    'made in usa',
    'no particle board',
    'no mdf',
    'cpsc',
    'astm',
    '4-in-1',
    'convertible',
    'toddler',
    'adjustable',
  ]
  const bad = [
    'look no further',
    'elevate your',
    'delve',
    'tapestry',
    'game-changer',
    'revolutionize',
    'unparalleled',
    'crafted to perfection',
    'in today’s fast-paced',
    "in today's fast-paced",
  ]
  const low = text.toLowerCase()
  for (const w of warm) if (low.includes(w)) s += preferWarm ? 8 : 4
  for (const f of facts) if (low.includes(f)) s += 10
  for (const b of bad) if (low.includes(b)) s -= 15
  // formulaic shopify openers lose warmth points
  if (/^solid hardwood 4-in-1/i.test(text.trim())) s -= 12
  // missing space after period
  if (/\.[A-Z]/.test(text)) s -= 8
  return s
}

function mergeDescriptions(shopifyDesc, shopifyHtml, vercelDesc, productName) {
  const sPlain = fixGrammar(shopifyDesc || stripHtml(shopifyHtml))
  const vPlain = fixGrammar(vercelDesc || '')

  const sScore = scoreCopy(sPlain)
  const vScore = scoreCopy(vPlain, { preferWarm: true })

  let base = vScore >= sScore ? vPlain : sPlain
  let other = vScore >= sScore ? sPlain : vPlain

  // If base is short and other has unique facts, weave facts in
  const factSnippets = extractFacts(other).filter((f) => !base.toLowerCase().includes(f.toLowerCase().slice(0, 40)))
  if (factSnippets.length && base.length < 1200) {
    const add = factSnippets.slice(0, 4).join(' ')
    if (add) base = fixGrammar(`${base}\n\n${add}`)
  }

  // If we picked Shopify formulaic opener, rewrite opening with warmer lead when Vercel had one
  if (/^solid hardwood 4-in-1/i.test(base) && vPlain && !/^solid hardwood 4-in-1/i.test(vPlain)) {
    const vFirst = vPlain.split(/\n\n/)[0]
    const rest = base.replace(/^solid hardwood 4-in-1[^.]*\.\s*/i, '')
    base = fixGrammar(`${vFirst}\n\n${rest}`)
  }

  // Soft brand voice pass
  base = humanize(base, productName)
  base = fixGrammar(base)

  // Cap extremely long bodies for readability (~1900 chars)
  if (base.length > 1900) {
    const paras = base.split(/\n\n/)
    let out = ''
    for (const p of paras) {
      const next = out ? `${out}\n\n${p}` : p
      if (next.length > 1850) {
        if (!out) {
          // single long paragraph: cut on sentence boundary
          const sentences = p.split(/(?<=[.!?])\s+/)
          let sOut = ''
          for (const s of sentences) {
            const n2 = sOut ? `${sOut} ${s}` : s
            if (n2.length > 1850) break
            sOut = n2
          }
          out = sOut || p.slice(0, 1850)
        }
        break
      }
      out = next
    }
    base = out || base.slice(0, 1850)
  }
  return base
}

function extractFacts(text) {
  const facts = []
  const patterns = [
    /no particle board[^.]*\./i,
    /no MDF[^.]*\./i,
    /made in the USA[^.]*\./i,
    /Made in the USA[^.]*\./i,
    /CPSC[^.]*\./i,
    /ASTM[^.]*\./i,
    /four stages[^.]*\./i,
    /4-in-1[^.]*\./i,
    /adjustable mattress[^.]*\./i,
    /Pennsylvania[^.]*\./i,
  ]
  for (const re of patterns) {
    const m = text.match(re)
    if (m) facts.push(m[0].trim())
  }
  // also grab solid hardwood sentence if missing
  const sh = text.match(/crafted from real solid hardwood[^.]*\./i)
  if (sh) facts.push(sh[0].trim())
  return [...new Set(facts)]
}

function humanize(text, productName) {
  let t = text
  // soften corporate
  t = t.replace(/\bcustomers\b/gi, 'families')
  t = t.replace(/\butilize\b/gi, 'use')
  t = t.replace(/\bpurchase\b/gi, 'order')
  t = t.replace(/\boptimal\b/gi, 'ideal')
  t = t.replace(/\brobust\b/gi, 'sturdy')
  t = t.replace(/\bleverage\b/gi, 'use')
  // fix doubled brand noise
  t = t.replace(/Old Time Oak from Old Time Oak/gi, 'Old Time Oak')
  // ensure product name appears once early if missing
  if (productName && !t.toLowerCase().includes(String(productName).toLowerCase().slice(0, 12))) {
    // don't force
  }
  return t
}

function buildSeoTitle(productName, shopifySeoTitle, category) {
  const brand = 'Heirloom Cribs and More'
  let core = (productName || '').trim()
  // Avoid "Addison Crib — Convertible Crib"
  const n = core.toLowerCase()
  const c = (category || '').toLowerCase()
  const alreadyCrib = /\bcrib\b/.test(n)
  let title = core
  if ((c.includes('crib') || alreadyCrib) && !alreadyCrib && !/convertible/i.test(core)) {
    title = `${core} Convertible Crib`
  }
  // Prefer concise shopify SEO title only if natural and not keyword-stuffed
  const s = (shopifySeoTitle || '').replace(/\s*\|\s*.*$/, '').replace(/\s*-\s*Heirloom.*$/i, '').trim()
  const stuffCount = (s.match(/\b(solid|hardwood|convertible|4-in-1|oto|fqp|usa)\b/gi) || []).length
  if (s && stuffCount <= 2 && s.length >= 12 && s.length <= 55 && !/^solid hardwood/i.test(s)) {
    // use if it roughly matches product
    const sNorm = s.toLowerCase()
    const coreTok = n.split(/\s+/).filter((t) => t.length > 3)[0]
    if (coreTok && sNorm.includes(coreTok)) title = s
  }
  let out = `${title} — ${brand}`
  if (out.length > 70) out = `${core} — ${brand}`
  return out
}

function buildMeta(description, productName) {
  // ~150–160 chars, complete sentence, human
  const plain = description.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim()
  if (plain.length <= 158) return plain
  // try first sentence(s)
  const parts = plain.split(/(?<=[.!?])\s+/)
  let out = ''
  for (const p of parts) {
    const next = out ? `${out} ${p}` : p
    if (next.length > 155) break
    out = next
  }
  if (out.length >= 110) return out
  // hard slice on word boundary
  let slice = plain.slice(0, 152)
  const sp = slice.lastIndexOf(' ')
  if (sp > 100) slice = slice.slice(0, sp)
  return slice.replace(/[,:;–—-]\s*$/, '') + '…'
}

// ——— Images ———
const MIN_BYTES = 8_000 // skip tiny/broken
const MAX_BYTES = 12_000_000

function fileHash(p) {
  const buf = fs.readFileSync(p)
  return crypto.createHash('md5').update(buf).digest('hex')
}

function isGoodImage(filePath) {
  try {
    const st = fs.statSync(filePath)
    if (st.size < MIN_BYTES || st.size > MAX_BYTES) return false
    const fd = fs.openSync(filePath, 'r')
    const buf = Buffer.alloc(12)
    fs.readSync(fd, buf, 0, 12, 0)
    fs.closeSync(fd)
    // jpeg
    if (buf[0] === 0xff && buf[1] === 0xd8) return true
    // png
    if (buf[0] === 0x89 && buf[1] === 0x50) return true
    // webp
    if (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return true
    return false
  } catch {
    return false
  }
}

function listLocalImages(dir) {
  if (!fs.existsSync(dir)) return []
  return fs.readdirSync(dir).filter((f) => /\.(jpe?g|png|webp)$/i.test(f))
}

function snakeBase(name) {
  return String(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
}

function importImages(vercelDirName, shopifyHandle, media, defaultVariant) {
  const prodDir = path.join(PRODUCTS, vercelDirName)
  const shopDir = path.join(SHOP_IMG, shopifyHandle)
  if (!fs.existsSync(shopDir)) return { added: 0, skipped: 0, reason: 'no-shop-images' }

  const existing = listLocalImages(prodDir)
  const existingHashes = new Set(existing.map((f) => fileHash(path.join(prodDir, f))))
  const shopFiles = fs
    .readdirSync(shopDir)
    .filter((f) => /\.(jpe?g|png|webp)$/i.test(f))
    .map((f) => path.join(shopDir, f))
    .filter(isGoodImage)

  // Sort so media-001 style first
  shopFiles.sort((a, b) => path.basename(a).localeCompare(path.basename(b)))

  let added = 0
  let skipped = 0
  const newFiles = []
  const base = snakeBase(vercelDirName)
  let nextIdx = 0
  for (const f of existing) {
    const m = f.match(/_(\d+)\./)
    if (m) nextIdx = Math.max(nextIdx, parseInt(m[1], 10) + 1)
  }

  for (const src of shopFiles) {
    const h = fileHash(src)
    if (existingHashes.has(h)) {
      skipped++
      continue
    }
    const ext = path.extname(src).toLowerCase().replace('jpeg', '.jpg')
    const destName = `${base}_${nextIdx}${ext === '.jpeg' ? '.jpg' : ext}`
    nextIdx++
    const dest = path.join(prodDir, destName)
    fs.copyFileSync(src, dest)
    existingHashes.add(h)
    newFiles.push(destName)
    added++
  }

  // Attach new files as gallery on default (or first) media key
  if (newFiles.length && media && typeof media === 'object') {
    const keys = Object.keys(media)
    if (keys.length) {
      // Prefer key starting with defaultVariant
      let target =
        keys.find((k) => defaultVariant && k.startsWith(String(defaultVariant) + '||')) || keys[0]
      const arr = Array.isArray(media[target]) ? [...media[target]] : []
      for (const nf of newFiles) {
        if (!arr.includes(nf)) arr.push(nf)
      }
      media[target] = arr
    }
  }

  return { added, skipped, newFiles }
}

// ——— Main ———
const matches = loadJson(path.join(AUDIT, 'derived', 'matches.json'))
const report = {
  at: new Date().toISOString(),
  updated: [],
  skipped: [],
  errors: [],
}

for (const row of matches) {
  if (!row.vercel || !row.shopify) {
    report.skipped.push({ id: row.id, reason: 'unmatched' })
    continue
  }
  const dirName = row.vercel.dirName
  const prodPath = path.join(PRODUCTS, dirName, 'product.json')
  const mediaPath = path.join(PRODUCTS, dirName, 'media.json')
  if (!fs.existsSync(prodPath)) {
    report.errors.push({ id: row.id, error: 'missing product.json' })
    continue
  }

  try {
    const product = loadJson(prodPath)
    const media = fs.existsSync(mediaPath) ? loadJson(mediaPath) : {}

    const before = {
      description: product.description,
      title: product.title,
      metaDescription: product.metaDescription,
    }

    // Always merge from audit snapshot (not already-written product) so re-runs are safe
    const description = mergeDescriptions(
      row.shopify.description,
      row.shopify.descriptionHtml,
      row.vercel.description || product.description,
      product.productName,
    )
    if (!description || description.length < 40) {
      throw new Error('merge produced empty/short description')
    }
    const title = buildSeoTitle(product.productName, row.shopify.seo?.title, product.category)
    const metaDescription = buildMeta(description, product.productName)

    product.description = description
    product.title = title
    product.metaDescription = metaDescription
    // keep extended null unless we have structured extra later
    writeJson(prodPath, product)

    const img = importImages(dirName, row.shopify.handle, media, product.defaultVariant)
    if (img.added > 0) writeJson(mediaPath, media)

    report.updated.push({
      id: row.id,
      dirName,
      slug: product.slug,
      descBefore: before.description?.length || 0,
      descAfter: description.length,
      titleBefore: before.title,
      titleAfter: title,
      metaBeforeLen: before.metaDescription?.length || 0,
      metaAfterLen: metaDescription.length,
      imagesAdded: img.added || 0,
      imagesSkippedDup: img.skipped || 0,
    })
  } catch (e) {
    report.errors.push({ id: row.id, dirName, error: String(e.message || e) })
  }
}

writeJson(REPORT, report)
console.log(
  JSON.stringify(
    {
      updated: report.updated.length,
      skipped: report.skipped.length,
      errors: report.errors.length,
      imagesAdded: report.updated.reduce((a, u) => a + (u.imagesAdded || 0), 0),
      report: REPORT,
    },
    null,
    2,
  ),
)
