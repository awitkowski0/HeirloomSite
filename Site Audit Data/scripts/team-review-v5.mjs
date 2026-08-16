/**
 * Task 1 · Team review v5
 * 1) Titles = product name only (no business suffix)
 * 2) Natural prose: fewer em-dashes / AI cadence
 * 3) Manufacturer names out of body copy (tags/meta ok lightly)
 * 4) Deduplicate images by content hash; fix media.json
 * 5) Bed size accuracy from OTO pricebook:
 *    - Standard cribs / Full Bed Rail kits → full-size (double) bed
 *    - Mini Newport conversion → twin bed only
 */
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const AUDIT = path.resolve(__dirname, '..')
const SITE = path.resolve(AUDIT, '..')
const PRODUCTS = path.join(SITE, 'public', 'data', 'products')
const REPORT = path.join(AUDIT, 'derived', 'team-review-v5-report.json')

function load(p) {
  let t = fs.readFileSync(p, 'utf8')
  if (t.charCodeAt(0) === 0xfeff) t = t.slice(1)
  return JSON.parse(t)
}
function writeJson(p, o) {
  fs.writeFileSync(p, JSON.stringify(o, null, 2) + '\n', 'utf8')
}
function hashFile(fp) {
  return crypto.createHash('md5').update(fs.readFileSync(fp)).digest('hex')
}

const MFG_BODY =
  /\b(Old Time Oak|OTO|Fisher Quality Products|Fisher Quality|FQP|Lorena Canals|Livabliss)\b/gi

const SOFT_CTA =
  'If you would like help choosing a finish, confirming timing, or picturing how this piece fits your nursery plans, use Get Personal Assistance. We reply the same or next business day so you can decide with full information, at your own pace.'

function isMiniNewport(p) {
  return /mini newport/i.test(p.productName || '') || /mini-newport/i.test(p.slug || '')
}
function isCrib(p) {
  return /crib/i.test(`${p.category || ''} ${p.productName || ''}`)
}
function isFullBedKit(p) {
  return /full bed|bed rail kit|double bed/i.test(p.productName || '')
}

/** Prefer accurate mattress language */
function normalizeBedSizeLanguage(text, product) {
  let t = text
  if (isMiniNewport(product)) {
    // Mini converts to twin only
    t = t.replace(/\bfull[- ]size beds?\b/gi, 'twin bed')
    t = t.replace(/\bfull[- ]size bed frame\b/gi, 'twin bed frame')
    t = t.replace(/\btoward a full[- ]size bed\b/gi, 'toward a twin bed')
    t = t.replace(/crib to toddler bed, daybed, and full[- ]size bed/gi, 'crib to toddler bed and beyond')
    t = t.replace(/daybed, and full[- ]size bed/gi, 'daybed, and twin bed')
  } else if (isCrib(product) || isFullBedKit(product)) {
    // Manufacturer OTO: Double/Full bed conversion — keep full-size, avoid implying twin
    t = t.replace(/\btwin beds?\b/gi, 'full-size bed')
    // Clarify once-style: "full-size (double) bed" only in kit pages
    if (isFullBedKit(product)) {
      t = t.replace(/\ba full[- ]size bed\b/gi, 'a full-size (double) bed')
      t = t.replace(/\binto a full[- ]size bed frame\b/gi, 'into a full-size (double) bed frame')
      // undo double double
      t = t.replace(/full-size \(double\) \(double\)/gi, 'full-size (double)')
    }
  }
  return t
}

function stripMfgFromBody(text) {
  let t = text
  // Remove "from Old Time Oak" style phrases
  t = t.replace(/\s+from\s+(Old Time Oak|OTO|Fisher Quality Products|FQP)\b/gi, '')
  t = t.replace(/\b(Old Time Oak|OTO|Fisher Quality Products|FQP)\s+/gi, '')
  t = t.replace(/\bthe\s+(Old Time Oak|OTO)\s+/gi, 'the ')
  t = t.replace(/\bOTO\b/g, '')
  t = t.replace(/\s{2,}/g, ' ')
  // clean doubled spaces after removal
  t = t.replace(/\s+([,.])/g, '$1')
  return t
}

function humanizeDashes(text) {
  let t = text
  // Convert em/en dashes used as clause breaks to commas or periods for natural flow
  // Keep hyphenated compound words (full-size, 4-in-1, baby-safe, non-toxic)
  t = t.replace(/\s*[—–]\s*/g, ', ')
  // Fix ", ," 
  t = t.replace(/,\s*,+/g, ',')
  // "word, and" is fine; "word, ." bad
  t = t.replace(/,\s*\./g, '.')
  // Reduce AI stacked commas from dash conversion: ", ,"
  t = t.replace(/,\s+,/g, ', ')
  // Prefer fewer " - " spaced hyphens used as dashes
  t = t.replace(/\s+-\s+/g, ', ')
  // Restore intentional compounds that got broken? full-size uses hyphen without spaces - OK
  // Fix "4, in, 1" if broken - shouldn't happen
  // Soften repeated "Imagine it as the quiet center..." block length later
  return t
}

function deCliché(t) {
  return t
    .replace(/look no further[.!]?/gi, '')
    .replace(/elevate your/gi, 'brighten your')
    .replace(/meticulous attention to detail/gi, 'careful craftsmanship')
    .replace(/rock-solid/gi, 'sturdy')
    .replace(/stunning 4-in-1/gi, '4-in-1')
    .replace(/a stunning /gi, 'a ')
    .replace(/Imagine it as the quiet center of the room, the place your newborn rests today, and the bed that can grow with them through toddler nights and toward a full-size bed when they are ready\.?\s*/gi, '')
    .replace(/Imagine it as the quiet center of the room, the place your newborn rests today, and the bed that can grow with them through toddler nights and toward a twin bed when they are ready\.?\s*/gi, '')
    .replace(/Built for durability, safety, and everyday family life, it is meant to feel like part of home for years, not a piece you replace each season\.?\s*/gi, '')
    .replace(/It is a gentle next step in the same familiar sleep space, helping your child grow with confidence while you keep the quality and finish you already love\.?\s*/gi, '')
    .replace(/\s{2,}/g, ' ')
}

function splitSents(text) {
  const plain = text.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim()
  return (plain.match(/[^.!?]+[.!?]+/g) || []).map((s) => s.trim()).filter(Boolean)
}

function finish(s) {
  let t = s.trim()
  if (!t) return ''
  t = t.replace(/\s+(and|or|the|a|an|to|for|with|of)\s*$/i, '')
  if (!/[.!?]$/.test(t)) t += '.'
  return t.charAt(0).toUpperCase() + t.slice(1)
}

function isComplete(s) {
  if (!s || s.length < 18) return false
  if (!/[.!?]$/.test(s)) return false
  if (/\b(and|or|the|a|an|to|for|with|of)\s*[.!?]$/i.test(s)) return false
  if (/deposit|cancellation|non-refundable|50%/i.test(s)) return false
  return true
}

function rewriteDescription(product, raw) {
  let t = raw || ''
  t = t.replace(/How ordering works:[\s\S]*$/i, '')
  t = t.replace(/[^.]*50%\s*deposit[^.]*\./gi, '')
  t = stripMfgFromBody(t)
  t = normalizeBedSizeLanguage(t, product)
  t = humanizeDashes(t)
  t = deCliché(t)
  t = t.replace(/\.([A-Za-z])/g, '. $1').replace(/\s{2,}/g, ' ').trim()

  const seen = new Set()
  const kept = []
  for (const rawS of splitSents(t)) {
    let s = finish(rawS)
    s = stripMfgFromBody(s)
    s = normalizeBedSizeLanguage(s, product)
    s = finish(s)
    if (!isComplete(s)) continue
    if (/Get Personal Assistance/i.test(s)) continue
    // drop dense cert stack if already have safety
    if (/ASTM F1169|16 CFR 1219|JPMA/i.test(s) && kept.some((k) => /safety|non-toxic|CPSC|ASTM/i.test(k)))
      continue
    const sig = s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim()
      .slice(0, 80)
    if (seen.has(sig)) continue
    let near = false
    for (const p of seen) {
      if (p.slice(0, 48) === sig.slice(0, 48)) near = true
    }
    if (near) continue
    seen.add(sig)
    kept.push(s)
  }

  // Warm close by type (natural, limited em-dash free)
  if (isCrib(product) && !kept.some((k) => /grows with|grow with|years/i.test(k))) {
    if (isMiniNewport(product)) {
      kept.push(
        'It is a thoughtful piece for smaller rooms, offering the same solid craftsmanship families trust, with a path that grows as your child does.',
      )
    } else {
      kept.push(
        'Picture it as the heart of the nursery: a safe place for newborn sleep that can become a toddler bed, a daybed, and later a full-size bed with the matching conversion pieces. Built for real family life, it is meant to last through years of memories.',
      )
    }
  } else if (isFullBedKit(product)) {
    // ensure double/full clarity once
    if (!/full-size \(double\)|double bed/i.test(kept.join(' '))) {
      kept.push(
        'This kit converts your matching crib into a full-size (double) bed frame, so your child keeps the familiar headboard and footboard as they grow.',
      )
    }
  }

  // Soft CTA without em dash
  kept.push(SOFT_CTA)

  // Paragraphs of 2 sentences
  const body = kept.filter((s) => !/Get Personal Assistance/i.test(s))
  const paras = []
  for (let i = 0; i < body.length; i += 2) {
    paras.push(body.slice(i, i + 2).join(' '))
  }
  paras.push(SOFT_CTA)

  let out = paras
    .map((p) => {
      p = p.replace(/\s+/g, ' ').trim()
      if (!/[.!?]$/.test(p)) p += '.'
      return p.charAt(0).toUpperCase() + p.slice(1)
    })
    .filter(Boolean)
    .join('\n\n')

  out = normalizeBedSizeLanguage(out, product)
  out = humanizeDashes(out)
  // Final mfg strip
  out = stripMfgFromBody(out)
  // Clean artifacts
  out = out
    .replace(/\s{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/,\s*,/g, ',')
    .replace(/\s+\./g, '.')
    .trim()

  if (!/Get Personal Assistance/i.test(out)) out = `${out}\n\n${SOFT_CTA}`
  return out
}

function buildMeta(desc, productName) {
  const sents = splitSents(desc).filter(
    (s) => isComplete(s) && !/Get Personal Assistance|Safety page/i.test(s),
  )
  let m = sents[0] || `Explore the ${productName}.`
  if (m.length < 90 && sents[1] && `${m} ${sents[1]}`.length <= 158) m = `${m} ${sents[1]}`
  if (m.length > 158) m = sents[0]
  m = stripMfgFromBody(m)
  m = humanizeDashes(m).replace(/\s{2,}/g, ' ').trim()
  if (!/[.!?]$/.test(m)) m += '.'
  // no business name in meta required; keep product focused
  m = m.replace(/\s*[—–-]\s*Heirloom Cribs and More\.?/gi, '.')
  return m
}

function buildTitle(productName) {
  // Product title only — no business name
  return String(productName || '').trim()
}

function dedupeImages(dirName) {
  const dir = path.join(PRODUCTS, dirName)
  if (!fs.existsSync(dir)) return { removed: 0, kept: 0 }
  const files = fs.readdirSync(dir).filter((f) => /\.(jpe?g|png|webp)$/i.test(f))
  const byHash = new Map()
  const remove = []
  for (const f of files) {
    const fp = path.join(dir, f)
    let h
    try {
      h = hashFile(fp)
    } catch {
      continue
    }
    if (byHash.has(h)) remove.push(f)
    else byHash.set(h, f)
  }
  // Update media.json references before delete
  const mediaPath = path.join(dir, 'media.json')
  let media = null
  if (fs.existsSync(mediaPath)) {
    media = load(mediaPath)
    const removedSet = new Set(remove)
    for (const [k, arr] of Object.entries(media)) {
      if (!Array.isArray(arr)) continue
      const next = []
      const seenH = new Set()
      for (const name of arr) {
        if (removedSet.has(name)) continue
        const fp = path.join(dir, name)
        if (!fs.existsSync(fp)) continue
        const h = hashFile(fp)
        if (seenH.has(h)) continue
        seenH.add(h)
        next.push(name)
      }
      // ensure at least primary if empty but we have files
      media[k] = next
    }
    // If any key empty, point to first kept image
    const anyKept = [...byHash.values()]
    for (const [k, arr] of Object.entries(media)) {
      if (!arr.length && anyKept.length) media[k] = [anyKept[0]]
    }
    writeJson(mediaPath, media)
  }
  for (const f of remove) {
    try {
      fs.unlinkSync(path.join(dir, f))
    } catch {
      /* ignore */
    }
  }
  return { removed: remove.length, kept: byHash.size, removedFiles: remove }
}

// ——— Main ———
const report = {
  at: new Date().toISOString(),
  bedSizeNote:
    'OTO pricebook: Addison/Newport use Double Bed Rail/Conversion; Mackenzie Full Bed Conversion; Mini Newport 1380-B is Twin Bed Conversion only. FQP-103 labeled Full Bedrails. Main cribs keep full-size (double); Mini Newport uses twin.',
  products: [],
  images: { totalRemoved: 0 },
  flags: [],
}

for (const d of fs.readdirSync(PRODUCTS, { withFileTypes: true }).filter((x) => x.isDirectory())) {
  if (d.name === 'showroom') continue
  const prodPath = path.join(PRODUCTS, d.name, 'product.json')
  if (!fs.existsSync(prodPath)) continue
  const product = load(prodPath)
  if (/area rug|rug|lamp/i.test(`${product.category || ''} ${product.productName || ''}`)) continue

  const beforeTitle = product.title
  const beforeDesc = product.description || ''

  product.title = buildTitle(product.productName)
  product.description = rewriteDescription(product, beforeDesc)
  product.metaDescription = buildMeta(product.description, product.productName)

  // Optional: store mfg lightly in tags if known from name patterns — skip to avoid inventing

  // Exact-hash dedupe only (never size-based: stain photos can share similar byte sizes)
  const img = dedupeImages(d.name)
  report.images.totalRemoved += img.removed

  const flags = []
  if (/Heirloom Cribs and More/i.test(product.title)) flags.push('title-has-biz')
  if (/—|–/.test(product.description)) flags.push('emdash-left')
  if (MFG_BODY.test(product.description)) flags.push('mfg-in-body')
  MFG_BODY.lastIndex = 0
  if (/deposit|How ordering/i.test(product.description)) flags.push('policy')
  if (isMiniNewport(product) && /full[- ]size bed/i.test(product.description)) flags.push('mini-still-full')
  if (!isMiniNewport(product) && isCrib(product) && /\btwin bed\b/i.test(product.description) && !/full-size/i.test(product.description))
    flags.push('crib-only-twin')

  writeJson(prodPath, product)
  report.products.push({
    slug: product.slug,
    dirName: d.name,
    titleBefore: beforeTitle,
    titleAfter: product.title,
    descLen: product.description.length,
    meta: product.metaDescription,
    imagesRemoved: img.removed,
    imagesKept: img.kept,
    flags,
    preview: product.description.slice(0, 200),
  })
  if (flags.length) report.flags.push({ slug: product.slug, flags })
}

writeJson(REPORT, report)
console.log(
  JSON.stringify(
    {
      products: report.products.length,
      imagesRemoved: report.images.totalRemoved,
      flagged: report.flags.length,
      flags: report.flags.slice(0, 15),
      bedSizeNote: report.bedSizeNote,
    },
    null,
    2,
  ),
)
