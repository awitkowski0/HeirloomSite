/**
 * Task 1 · Content voice rewrite (v4)
 * - Remove ordering/deposit/cancellation/policy language from PDPs
 * - Soft, inviting tone; nursery emotion; grow-with-child story
 * - Soft CTA: Get Personal Assistance (no hard sell)
 * - Deduplicate merged Shopify+Vercel repetition
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const AUDIT = path.resolve(__dirname, '..')
const SITE = path.resolve(AUDIT, '..')
const PRODUCTS = path.join(SITE, 'public', 'data', 'products')
const REPORT = path.join(AUDIT, 'derived', 'voice-rewrite-v4-report.json')

function load(p) {
  let t = fs.readFileSync(p, 'utf8')
  if (t.charCodeAt(0) === 0xfeff) t = t.slice(1)
  return JSON.parse(t)
}
function writeJson(p, o) {
  fs.writeFileSync(p, JSON.stringify(o, null, 2) + '\n', 'utf8')
}

const POLICY_CUT =
  /\b(How ordering works|Ordering follows|select wood species and stain, place a|choose your preferred wood and stain, place a|50%\s*deposit|deposit to (start|begin) production|48-?hour|cancellation window|non-refundable|credit-?card fees|remaining balance|balance is due|balance due before|Inspect on delivery|before any deposit|before you deposit|before depositing|zip code|lead[- ]time|Get Personal Assistance[^.]*deposit[^.]*\.)/i

function stripPolicyBlocks(text) {
  if (!text) return ''
  let t = String(text)
  // Cut from first policy marker to end (usually trailing block)
  const idx = t.search(POLICY_CUT)
  if (idx >= 0) t = t.slice(0, idx)
  // Also remove leftover policy sentences mid-text
  const kill = [
    /How ordering works:[\s\S]*$/i,
    /Ordering follows[\s\S]*$/i,
    /[^.]*50%\s*deposit[^.]*\./gi,
    /[^.]*cancellation window[^.]*\./gi,
    /[^.]*non-refundable[^.]*\./gi,
    /[^.]*credit-?card fees[^.]*\./gi,
    /[^.]*remaining balance[^.]*\./gi,
    /[^.]*balance is due[^.]*\./gi,
    /[^.]*balance due before[^.]*\./gi,
    /Inspect on delivery\.?/gi,
    /[^.]*before any deposit[^.]*\./gi,
    /[^.]*before you deposit[^.]*\./gi,
    /[^.]*before depositing[^.]*\./gi,
    /Questions about finishes, current lead time[^.?]*\??/gi,
    /Prefer to talk through options[^.]*\./gi,
    /Use Get Personal Assistance[^.]*deposit[^.]*\./gi,
    /Get Personal Assistance is available before you deposit[^.]*\./gi,
  ]
  for (const re of kill) t = t.replace(re, ' ')
  return t
}

function clean(text) {
  let t = stripPolicyBlocks(text || '')
  t = t.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  t = t.replace(/\u2013|\u2014/g, '—').replace(/\s*—\s*/g, ' — ')
  t = t.replace(/([.!?])([A-Za-z])/g, '$1 $2')
  t = t.replace(/[“”]/g, '"').replace(/[‘’]/g, "'")
  // soften hard phrases
  t = t
    .replace(/\bone investment grows with your child\b/gi, 'one beautiful piece can stay with your child as they grow')
    .replace(/\bsaving you money down the road\b/gi, 'so you are not starting over with every stage')
    .replace(/\bthe smart, stylish choice\b/gi, 'a thoughtful choice')
    .replace(/\bmass-market alternatives\b/gi, 'everyday store furniture')
    .replace(/\bFull certification details appear on our Safety page\./gi, 'You can read full certification details on our Safety page.')
    .replace(/\bFull details are listed on our Safety page\./gi, 'You can read full details on our Safety page.')
    .replace(/\bFull certification language is on our Safety page\./gi, 'You can read full details on our Safety page.')
  t = t
    .split(/\n\n+/)
    .map((p) => p.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n\n')
  return t.trim()
}

function splitSentences(text) {
  const plain = text.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim()
  const parts = plain.match(/[^.!?]+[.!?]+/g) || []
  return parts.map((s) => s.trim()).filter(Boolean)
}

function normSig(s) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 90)
}

function isComplete(s) {
  if (!s || s.length < 20) return false
  if (!/[.!?]$/.test(s.trim())) return false
  if (/…|\.\.\./.test(s)) return false
  if (/\b(and|or|the|a|an|to|for|with|of)\s*[.!?]$/i.test(s.trim())) return false
  if (POLICY_CUT.test(s)) return false
  if (/\bdeposit\b|\bcancellation\b|\bnon-refundable\b|\b50%\b/i.test(s)) return false
  return true
}

function finish(s) {
  let t = s.trim().replace(/\s*…+\s*$/, '').replace(/\s+(and|or|the|a|an|to|for|with|of)\s*$/i, '')
  if (!t) return ''
  if (!/[.!?]$/.test(t)) t += '.'
  return t.charAt(0).toUpperCase() + t.slice(1)
}

const SOFT_CTA =
  'If you would like help choosing a finish, confirming timing, or picturing how this piece fits your nursery plans, use Get Personal Assistance — we reply the same or next business day so you can decide with full information, at your own pace.'

function isCrib(product) {
  const c = `${product.category || ''} ${product.productName || ''}`.toLowerCase()
  return c.includes('crib')
}

function isConversion(product) {
  const c = `${product.category || ''} ${product.productName || ''}`.toLowerCase()
  return /rail|conversion|toddler bed|full bed|guard/i.test(c)
}

function emotionalClose(product) {
  if (isCrib(product)) {
    return 'Imagine it as the quiet center of the room — the place your newborn rests today, and the bed that can grow with them through toddler nights and toward a full-size bed when they are ready. Built for durability, safety, and everyday family life, it is meant to feel like part of home for years, not a piece you replace each season.'
  }
  if (isConversion(product)) {
    return 'It is a gentle next step in the same familiar sleep space — helping your child grow with confidence while you keep the quality and finish you already love.'
  }
  return 'Chosen well, it becomes part of the daily rhythm of your home — sturdy, beautiful, and ready for the years of family life ahead.'
}

function rewriteDescription(product, sourceText) {
  const cleaned = clean(sourceText)
  const sents = splitSentences(cleaned)
  const seen = new Set()
  const kept = []

  for (const raw of sents) {
    let s = finish(raw)
    if (!isComplete(s)) continue
    // drop dense certification dumps that read like a legal appendix mid-PDP (keep one soft safety line later)
    if (/ASTM F1169|16 CFR 1219|JPMA specifications|CPSIA requirements/i.test(s) && kept.some((k) => /safety|ASTM|CPSC|non-toxic/i.test(k)))
      continue
    if (/^Finished with non-toxic/i.test(s) && kept.some((k) => /non-toxic/i.test(k))) continue
    if (/^Three adjustable mattress/i.test(s) && kept.some((k) => /adjustable mattress/i.test(k))) continue
    if (/converts cleanly through four stages/i.test(s) && kept.some((k) => /toddler bed|4-in-1|convertible/i.test(k)))
      continue
    if (/no particle board, no MDF, no veneer/i.test(s) && kept.some((k) => /particle board|solid hardwood/i.test(k)))
      continue
    const sig = normSig(s)
    if (seen.has(sig)) continue
    // near-duplicate openings
    let dup = false
    for (const prev of seen) {
      if (sig.slice(0, 50) === prev.slice(0, 50)) {
        dup = true
        break
      }
    }
    if (dup) continue
    seen.add(sig)
    kept.push(s)
  }

  // Ensure solid hardwood quality mentioned once if crib/casegood
  const blob = kept.join(' ')
  if (isCrib(product) && !/solid hardwood/i.test(blob) && /hardwood|wood/i.test(cleaned)) {
    kept.splice(
      Math.min(1, kept.length),
      0,
      'It is crafted from real solid hardwood — not particle board, MDF, or veneer — so it has the weight and lasting quality families want in furniture that stays with a child for years.',
    )
  }

  // Soft safety once
  if (isCrib(product) && !/non-toxic|baby-safe|safety standards|CPSC|ASTM/i.test(kept.join(' '))) {
    kept.push(
      'Finishes are chosen with little ones in mind, and our cribs are designed to meet applicable safety standards so you can rest a little easier.',
    )
  } else if (isCrib(product) && !kept.some((k) => /Safety page/i.test(k))) {
    // optional gentle pointer if certs were stripped
    if (/ASTM|CPSC|non-toxic/i.test(cleaned)) {
      kept.push('You can read full safety and certification details anytime on our Safety page.')
    }
  }

  // Emotional close if not already very emotional
  const close = emotionalClose(product)
  if (!kept.some((k) => /imagine|grows with|grow with|years of|family treasure|part of home/i.test(k))) {
    kept.push(close)
  }

  // Soft CTA once at end
  kept.push(SOFT_CTA)

  // Build 3 short paragraphs
  const bodySents = kept.filter((s) => s !== SOFT_CTA)
  const cta = SOFT_CTA
  const p1 = bodySents.slice(0, 2).join(' ')
  const p2 = bodySents.slice(2, 5).join(' ')
  const p3 = bodySents.slice(5).join(' ')
  const parts = [p1, p2, p3].map((p) => p.trim()).filter(Boolean)
  // Ensure complete
  let body = parts.join('\n\n')
  if (!body.endsWith(cta) && !body.includes('Get Personal Assistance')) {
    body = `${body}\n\n${cta}`
  } else if (!body.includes('Get Personal Assistance')) {
    body = `${body}\n\n${cta}`
  }

  // Final cleanup
  body = body
    .split(/\n\n+/)
    .map((p) => {
      p = p.replace(/\s+/g, ' ').trim()
      if (!p) return ''
      if (!/[.!?]$/.test(p)) p += '.'
      return p.charAt(0).toUpperCase() + p.slice(1)
    })
    .filter(Boolean)
    .join('\n\n')

  // Hard strip any policy that snuck back
  body = stripPolicyBlocks(body)
  if (!body.includes('Get Personal Assistance')) body = `${body}\n\n${SOFT_CTA}`

  return body.trim()
}

function buildMeta(description, productName) {
  const sents = splitSentences(description).filter(
    (s) => isComplete(s) && !/Get Personal Assistance/i.test(s) && !/Safety page/i.test(s),
  )
  let meta = sents[0] || `Discover the ${productName} from Heirloom Cribs and More.`
  if (meta.length < 90 && sents[1] && `${meta} ${sents[1]}`.length <= 158) {
    meta = `${meta} ${sents[1]}`
  }
  if (meta.length > 158) {
    meta = sents[0]
    if (meta.length > 158) {
      let slice = meta.slice(0, 150)
      const sp = slice.lastIndexOf(' ')
      if (sp > 80) slice = slice.slice(0, sp)
      slice = slice.replace(/[,:;—-]\s*$/, '').replace(/\s+(and|or|the|a|an|to|for|with|of)$/i, '')
      meta = finish(slice)
    }
  }
  meta = meta.replace(/…/g, '').replace(/\.\.\./g, '')
  if (!/[.!?]$/.test(meta)) meta = finish(meta)
  return meta
}

function buildTitle(productName, category) {
  const brand = 'Heirloom Cribs and More'
  let core = (productName || '').trim()
  const n = core.toLowerCase()
  const c = (category || '').toLowerCase()
  if ((c.includes('crib') || /\bcrib\b/.test(n)) && !/\bcrib\b/.test(n)) {
    core = `${core} Convertible Crib`
  }
  let title = `${core} — ${brand}`
  if (title.length > 70) title = `${productName} — ${brand}`
  return title
}

const matches = load(path.join(AUDIT, 'derived', 'matches.json'))
const report = { at: new Date().toISOString(), updated: [], skipped: [], flags: [] }

for (const row of matches) {
  if (!row.vercel?.dirName) {
    report.skipped.push({ id: row.id, reason: 'no-vercel' })
    continue
  }
  const dir = row.vercel.dirName
  const prodPath = path.join(PRODUCTS, dir, 'product.json')
  if (!fs.existsSync(prodPath)) continue

  // skip rugs/lamps
  const cat = `${row.vercel.category || ''} ${row.vercel.productName || ''}`.toLowerCase()
  if (/area rug|rug|lamp/.test(cat)) {
    report.skipped.push({ slug: row.vercel.slug, reason: 'soft-goods' })
    continue
  }

  const product = load(prodPath)
  // Prefer current (may already have warm open) + strip; also consider original vercel snapshot
  const source = [product.description, row.vercel.description, row.shopify?.description]
    .filter(Boolean)
    .sort((a, b) => stripPolicyBlocks(b).length - stripPolicyBlocks(a).length)[0]

  const description = rewriteDescription(product, source)
  const title = buildTitle(product.productName, product.category)
  const metaDescription = buildMeta(description, product.productName)

  const flags = []
  if (/deposit|cancellation|non-refundable|50%|credit-card|How ordering/i.test(description)) flags.push('policy-left')
  if (!/Get Personal Assistance/i.test(description)) flags.push('missing-cta')
  if (!/[.!?]$/.test(description.trim())) flags.push('desc-end')
  if (/…/.test(metaDescription)) flags.push('meta-ellipsis')
  if (description.length < 120) flags.push('too-short')

  product.description = description
  product.title = title
  product.metaDescription = metaDescription
  writeJson(prodPath, product)

  report.updated.push({
    slug: product.slug,
    dirName: dir,
    descLen: description.length,
    metaLen: metaDescription.length,
    title,
    meta: metaDescription,
    flags,
    preview: description.slice(0, 220),
  })
  if (flags.length) report.flags.push({ slug: product.slug, flags })
}

writeJson(REPORT, report)
console.log(
  JSON.stringify(
    {
      updated: report.updated.length,
      flagged: report.flags.length,
      flags: report.flags.slice(0, 10),
      report: REPORT,
    },
    null,
    2,
  ),
)
