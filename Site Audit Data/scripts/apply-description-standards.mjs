/**
 * Apply PRODUCT-DESCRIPTION-STANDARDS.md to all hard-goods product.json files.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PRODUCTS = path.resolve(__dirname, '../../public/data/products')
const REPORT = path.resolve(__dirname, '../derived/description-standards-report.json')
const NL = '\n'

const STANDARD_CTA =
  'If you would like help choosing a finish, confirming timing, or picturing how this piece fits your nursery plans, use Get Personal Assistance. We reply the same or next business day so you can decide with full information, at your own pace.'

const FINISH_NAMES =
  /\b(Almond|Asbury Brown|Asbury-?\s*Brown|Carbon|Earthtone|Ebony|Harvest|Manchester|Michaels Cherry|Michael'?s Cherry|Natural|Sandstone|Antique Slate|Driftwood|Frost|Brown Maple|Cherry|Red Oak|BrownMaple|CherryWood)\b/gi

function load(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'))
}

function stripColorLists(text) {
  let t = text
  // "Available in a variety of finishes including A, B, and C."
  t = t.replace(
    /Available in a variety of finishes including [^.]*\./gi,
    'Choose from the finishes shown on this page.',
  )
  t = t.replace(
    /Available in (?:the following )?finishes?[:\s]+[^.]*\./gi,
    'Choose from the finishes shown on this page.',
  )
  t = t.replace(
    /finishes including [A-Z][^.]{10,200}\./gi,
    'finishes shown on this page.',
  )
  // long comma lists of known stains
  t = t.replace(
    /(?:including\s+)?(?:Almond|Natural)(?:,\s*[A-Za-z][A-Za-z\s-]+){3,}(?:,?\s*and\s+[A-Za-z][A-Za-z\s-]+)?/gi,
    'the finishes shown on this page',
  )
  return t
}

function cleanProse(text) {
  let t = String(text || '')
  t = t.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  // remove prior CTAs (any wording) — we re-append standard
  t = t.replace(
    /\n*\s*If you would like help[\s\S]*?at your own pace\.?\s*$/i,
    '',
  )
  t = t.replace(
    /\n*\s*Questions\?[\s\S]*Get Personal Assistance[\s\S]*$/i,
    '',
  )
  t = stripColorLists(t)
  // manufacturer out of body
  t = t
    .replace(/\s+from\s+(Old Time Oak|OTO|Fisher Quality Products|FQP)\b/gi, '')
    .replace(/\b(Old Time Oak|Fisher Quality Products)\b/gi, '')
    .replace(/\bOTO\b/g, '')
    .replace(/\bFQP\b/g, '')
  // AI / hype
  t = t
    .replace(/\bthe centerpiece your nursery deserves\b/gi, 'a beautiful centerpiece for your nursery')
    .replace(/\bstunning\b/gi, '')
    .replace(/\belevate your\b/gi, 'brighten your')
    .replace(/\blook no further\.?\b/gi, '')
    .replace(/\s*[—–]\s*/g, ', ')
    .replace(/,\s*,/g, ',')
    .replace(/\s+-\s+/g, ', ')
  // safety page phrase standardize
  t = t.replace(
    /You can read full (certification )?details( anytime)? on our Safety page\.?/gi,
    'See our Safety page for full certification details.',
  )
  t = t.replace(
    /Full certification details appear on our Safety page\.?/gi,
    'See our Safety page for full certification details.',
  )
  // grammar
  t = t.replace(/\.([A-Za-z])/g, '. $1')
  t = t.replace(/\s{2,}/g, ' ')
  t = t.replace(/\s+\./g, '.')
  return t.trim()
}

function splitSentences(text) {
  const plain = text.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim()
  return (plain.match(/[^.!?]+[.!?]+/g) || []).map((s) => s.trim()).filter(Boolean)
}

function isGoodSentence(s) {
  if (!s || s.length < 20) return false
  if (!/[.!?]$/.test(s)) return false
  if (/\b(and|or|the|a|an|to|for|with|of)\s*[.!?]$/i.test(s)) return false
  if (/deposit|cancellation|50%|non-refundable/i.test(s)) return false
  if (FINISH_NAMES.test(s) && /including|,.*,.*,/i.test(s)) {
    FINISH_NAMES.lastIndex = 0
    // allow single finish mention in material context ("Brown Maple finish") if only one
    const names = s.match(FINISH_NAMES) || []
    FINISH_NAMES.lastIndex = 0
    if (names.length >= 3) return false
  }
  FINISH_NAMES.lastIndex = 0
  return true
}

function classify(product) {
  const n = `${product.productName} ${product.category}`.toLowerCase()
  if (/mattress/.test(n)) return 'mattress'
  if (/toddler.*kit|rail kit|conversion/.test(n) && /toddler/.test(n)) return 'toddler-kit'
  if (/full bed|bed rail kit/.test(n)) return 'full-kit'
  if (/guard rail/.test(n)) return 'guard'
  if (/crib/.test(n)) return 'crib'
  if (/dresser|chest|nightstand|changing/.test(n)) return 'case'
  return 'other'
}

function rebuildFlow(product, rawDesc) {
  const cleaned = cleanProse(rawDesc)
  const sents = splitSentences(cleaned).filter(isGoodSentence)
  // dedupe by signature
  const seen = new Set()
  const unique = []
  for (const s of sents) {
    const sig = s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().slice(0, 70)
    if (seen.has(sig)) continue
    seen.add(sig)
    unique.push(s)
  }

  const kind = classify(product)
  // Cap body length by kind
  const maxBody = kind === 'crib' ? 8 : kind === 'case' ? 7 : 5
  let body = unique.slice(0, maxBody)

  // Ensure kit clarity
  if (kind === 'toddler-kit' || kind === 'full-kit') {
    const hasKit = body.some((s) => /kit|conversion/i.test(s))
    if (!hasKit) {
      body.unshift(
        `${product.productName} is a conversion kit for your matching crib, not a separate standalone bed.`,
      )
    }
  }

  // Ensure we don't open with safety-only
  // Build paragraphs: 2 + 2 + rest (trust) 
  const open = body.slice(0, 2)
  const mid = body.slice(2, 5)
  const trust = body.slice(5).filter((s) => /safety|non-toxic|CPSC|ASTM|Safety page|coordinates|collection/i.test(s))
  // if no trust and crib, add light safety if any sentence existed
  const paras = []
  if (open.length) paras.push(open.join(' '))
  if (mid.length) paras.push(mid.join(' '))
  if (trust.length) paras.push(trust.slice(0, 2).join(' '))
  // If still only one short para, keep it
  if (!paras.length && unique.length) {
    paras.push(unique.slice(0, 3).join(' '))
  }
  if (!paras.length) {
    paras.push(
      `Discover the ${product.productName}, crafted for real family life and a nursery that feels like home.`,
    )
  }

  // Standard CTA always last
  paras.push(STANDARD_CTA)

  return paras
    .map((p) => {
      p = p.replace(/\s+/g, ' ').trim()
      if (!/[.!?]$/.test(p)) p += '.'
      return p.charAt(0).toUpperCase() + p.slice(1)
    })
    .join('\n\n')
}

function buildMeta(desc, productName) {
  const sents = splitSentences(desc).filter(
    (s) => isGoodSentence(s) && !/Get Personal Assistance/i.test(s) && !/Safety page/i.test(s),
  )
  let m = sents[0] || `Explore the ${productName}.`
  if (m.length < 90 && sents[1] && `${m} ${sents[1]}`.length <= 158) m = `${m} ${sents[1]}`
  if (m.length > 158) m = sents[0].length <= 158 ? sents[0] : sents[0].slice(0, 150).replace(/\s+\S*$/, '') + '.'
  if (!/[.!?]$/.test(m)) m += '.'
  // no color lists
  m = stripColorLists(m)
  if (m.length < 70) m = `${productName}: solid hardwood nursery furniture for your family.`
  if (m.length > 160) m = m.slice(0, 155).replace(/\s+\S*$/, '') + '.'
  return m
}

const report = { at: new Date().toISOString(), updated: [], flags: [] }

for (const d of fs.readdirSync(PRODUCTS, { withFileTypes: true }).filter((x) => x.isDirectory())) {
  if (d.name === 'showroom') continue
  const pj = path.join(PRODUCTS, d.name, 'product.json')
  if (!fs.existsSync(pj)) continue
  const p = load(pj)
  if (/area rug|rug|lamp/i.test(`${p.category || ''} ${p.productName || ''}`)) continue

  const before = p.description || ''
  p.title = p.productName // product name only
  p.description = rebuildFlow(p, before)
  p.metaDescription = buildMeta(p.description, p.productName)

  const flags = []
  if (/Almond,\s*Asbury|finishes including/i.test(p.description)) flags.push('color-list')
  if (!p.description.includes(STANDARD_CTA)) flags.push('cta')
  if (/—|–/.test(p.description)) flags.push('emdash')
  if (/Heirloom Cribs and More/i.test(p.title)) flags.push('biz-title')
  if ((p.description.match(/\n\n/g) || []).length < 2) flags.push('few-paras')

  fs.writeFileSync(pj, JSON.stringify(p, null, 2) + NL)
  report.updated.push({
    slug: p.slug,
    name: p.productName,
    len: p.description.length,
    paras: p.description.split(/\n\n+/).length,
    flags,
  })
  if (flags.length) report.flags.push({ slug: p.slug, flags })
}

fs.writeFileSync(REPORT, JSON.stringify(report, null, 2) + NL)
console.log(
  JSON.stringify(
    {
      updated: report.updated.length,
      flagged: report.flags.length,
      flags: report.flags.slice(0, 12),
      cta: STANDARD_CTA.slice(0, 60) + '…',
      report: REPORT,
    },
    null,
    2,
  ),
)
