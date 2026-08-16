/**
 * Deep content pass: complete sentences, grammar, punctuation, no cutoffs.
 * Sources: audit matches (Shopify + original Vercel) + current product.json
 * Writes polished product.json for all hard-goods with Vercel dirs.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const AUDIT = path.resolve(__dirname, '..')
const SITE = path.resolve(AUDIT, '..')
const PRODUCTS = path.join(SITE, 'public', 'data', 'products')
const OUT_REPORT = path.join(AUDIT, 'derived', 'deep-copy-pass-report.json')

function load(p) {
  let t = fs.readFileSync(p, 'utf8')
  if (t.charCodeAt(0) === 0xfeff) t = t.slice(1)
  return JSON.parse(t)
}
function writeJson(p, o) {
  fs.writeFileSync(p, JSON.stringify(o, null, 2) + '\n', 'utf8')
}

function stripHtml(html) {
  if (!html) return ''
  return String(html)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<li>/gi, '• ')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\u00a0/g, ' ')
}

/** Normalize whitespace and basic punctuation */
function cleanRaw(text) {
  if (!text) return ''
  let t = String(text)
  t = t.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  t = t.replace(/\u2013|\u2014/g, '—')
  t = t.replace(/\s*—\s*/g, ' — ')
  // missing space after . ! ? before letter
  t = t.replace(/([.!?])([A-Za-z])/g, '$1 $2')
  // "it-and" style
  t = t.replace(/([a-z])-(and|or|but|so|yet|for)\s/gi, '$1 — $2 ')
  // smart quotes unify
  t = t.replace(/[“”]/g, '"').replace(/[‘’]/g, "'")
  // collapse spaces but keep paragraph breaks
  t = t
    .split(/\n\n+/)
    .map((p) => p.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n\n')
  return t.trim()
}

/** Split into sentences (simple but robust for product copy) */
function splitSentences(text) {
  const paras = text.split(/\n\n+/).map((p) => p.trim()).filter(Boolean)
  const sentences = []
  for (const para of paras) {
    // split on .!? followed by space+capital or end
    const parts = para.match(/[^.!?]+[.!?]+(?=\s|$)|[^.!?]+$/g) || [para]
    for (let s of parts) {
      s = s.trim()
      if (!s) continue
      sentences.push(s)
    }
    // paragraph break marker
    if (sentences.length) sentences.push('\n\n')
  }
  // drop trailing para marker
  while (sentences.length && sentences[sentences.length - 1] === '\n\n') sentences.pop()
  return sentences
}

function isCompleteSentence(s) {
  if (!s || s === '\n\n') return true
  const t = s.trim()
  if (t.length < 12) return false
  // must end with . ! ?
  if (!/[.!?]"?$/.test(t)) return false
  // dangling starters as whole "sentence"
  if (/^(and|or|but|the|a|an|to|for|with|of|that|which|this|these|those)\b/i.test(t) && t.split(/\s+/).length < 5)
    return false
  // cut off ending words without object (heuristic)
  if (/\b(the|a|an|and|or|to|for|with|of|your|our|this|that)\s*[.!?]$/i.test(t)) return false
  // ellipsis cutoff
  if (/…$|\.\.\.$/.test(t)) return false
  return true
}

function finishSentence(s) {
  let t = s.trim()
  if (!t) return ''
  // remove trailing ellipsis / dangling conjunctions
  t = t.replace(/\s*…+\s*$/, '')
  t = t.replace(/\s*\.{2,}\s*$/, '')
  t = t.replace(/\s+(and|or|the|a|an|to|for|with|of|that|which|your|our)\s*$/i, '')
  t = t.replace(/[,:;]\s*$/, '')
  t = t.trim()
  if (!t) return ''
  if (!/[.!?]$/.test(t)) t += '.'
  // capitalize first letter
  t = t.charAt(0).toUpperCase() + t.slice(1)
  return t
}

const CLICHES = [
  [/look no further[.!]?/gi, ''],
  [/in today's fast-paced world,?/gi, ''],
  [/elevate your/gi, 'brighten your'],
  [/delve into/gi, 'explore'],
  [/a tapestry of/gi, 'a mix of'],
  [/unlock the/gi, 'discover the'],
  [/revolutionize/gi, 'improve'],
  [/game-?changer/gi, 'helpful addition'],
  [/unparalleled/gi, 'lasting'],
  [/crafted to perfection/gi, 'carefully made'],
  [/meticulous attention to detail/gi, 'careful craftsmanship'],
  [/the centerpiece your nursery deserves/gi, 'a beautiful centerpiece for your nursery'],
  [/dreamy nursery you.?ll love spending time in/gi, 'nursery that feels like home'],
  [/fall in love with the first time they see it/gi, 'appreciate from the first look'],
  [/keep loving for years to come/gi, 'continue to value for years'],
  [/utilize/gi, 'use'],
  [/\bcustomers\b/gi, 'families'],
  [/\bpurchase\b/gi, 'order'],
  [/\boptimal\b/gi, 'ideal'],
  [/\brobust\b/gi, 'sturdy'],
  [/When it comes to /gi, 'For '],
  [/It is important to note that /gi, ''],
  [/In conclusion,?/gi, ''],
]

function deCliché(t) {
  let s = t
  for (const [re, rep] of CLICHES) s = s.replace(re, rep)
  return s.replace(/\s{2,}/g, ' ').trim()
}

function polishBody(shopifyDesc, shopifyHtml, vercelDesc, currentDesc, productName) {
  const sources = [
    cleanRaw(currentDesc),
    cleanRaw(vercelDesc),
    cleanRaw(shopifyDesc || stripHtml(shopifyHtml || '')),
  ].filter((s) => s && s.length > 40)

  // Prefer longest source that isn't the formulaic-only opener, but merge unique sentences
  let best = sources[0] || ''
  for (const s of sources) {
    if (s.length > best.length) best = s
  }
  // If best is formulaic Shopify wall of text, prefer vercel opening + shopify facts
  const v = cleanRaw(vercelDesc || currentDesc || '')
  const s = cleanRaw(shopifyDesc || stripHtml(shopifyHtml || ''))

  const allSentences = []
  const seen = new Set()

  function addFrom(text, preferFront) {
    if (!text) return
    const parts = splitSentences(text)
    const buf = []
    for (const part of parts) {
      if (part === '\n\n') {
        buf.push('\n\n')
        continue
      }
      let sent = finishSentence(deCliché(part))
      if (!sent || !isCompleteSentence(sent)) continue
      // drop pure formulaic opener if we already have warmer content
      if (/^Solid hardwood 4-in-1 convertible crib made in the USA\.?$/i.test(sent) && allSentences.length > 0)
        continue
      const key = sent.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
      // near-dup: first 60 chars
      const sig = key.slice(0, 70)
      if (seen.has(sig)) continue
      seen.add(sig)
      buf.push(sent)
    }
    if (preferFront) allSentences.unshift(...buf)
    else allSentences.push(...buf)
  }

  // Warm vercel first, then shopify facts
  if (v) addFrom(v, false)
  if (s) addFrom(s, false)
  if (!v && !s && best) addFrom(best, false)

  // Rebuild paragraphs: group every 2-3 sentences
  const real = allSentences.filter((x) => x !== '\n\n')
  if (!real.length) {
    // fallback: finish best as one block
    const fb = finishSentence(deCliché(best))
    return fb || `Learn more about the ${productName} from Heirloom Cribs and More.`
  }

  const paras = []
  for (let i = 0; i < real.length; i += 3) {
    paras.push(real.slice(i, i + 3).join(' '))
  }
  let body = paras.join('\n\n')

  // Soft length cap on complete paragraph boundaries only
  if (body.length > 2000) {
    let out = ''
    for (const p of paras) {
      const next = out ? `${out}\n\n${p}` : p
      if (next.length > 1950) break
      out = next
    }
    body = out || paras[0]
  }

  // Final grammar sweep
  body = cleanRaw(body)
  body = deCliché(body)
  // ensure each paragraph ends with punctuation
  body = body
    .split(/\n\n+/)
    .map((p) => {
      p = p.trim()
      if (!p) return ''
      if (!/[.!?]$/.test(p)) p += '.'
      return p.charAt(0).toUpperCase() + p.slice(1)
    })
    .filter(Boolean)
    .join('\n\n')

  // validate no dangling last sentence
  const last = body.trim().split(/(?<=[.!?])\s+/).pop()
  if (last && !isCompleteSentence(last)) {
    body = body.slice(0, body.lastIndexOf(last)).trim()
    if (!/[.!?]$/.test(body)) body += '.'
  }

  return body
}

function buildMeta(description, productName) {
  const plain = description.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim()
  const sentences = []
  const parts = plain.match(/[^.!?]+[.!?]+/g) || []
  for (const p of parts) {
    const s = p.trim()
    if (isCompleteSentence(s)) sentences.push(s)
  }
  if (!sentences.length) {
    return `Explore the ${productName} from Heirloom Cribs and More — solid craftsmanship for your family.`
  }
  let meta = sentences[0]
  if (meta.length < 100 && sentences[1]) {
    const two = `${meta} ${sentences[1]}`
    if (two.length <= 158) meta = two
  }
  // If still too long, shorten to first sentence only if complete
  if (meta.length > 158) {
    // try shorter first sentence by cutting only at comma if still complete thought — prefer first sentence alone
    meta = sentences[0]
    if (meta.length > 158) {
      // last resort: word boundary but MUST end with period and complete
      let slice = meta.slice(0, 150)
      const sp = slice.lastIndexOf(' ')
      if (sp > 80) slice = slice.slice(0, sp)
      slice = slice.replace(/[,:;—-]\s*$/, '').replace(/\s+(and|or|the|a|an|to|for|with|of)$/i, '')
      meta = finishSentence(slice)
    }
  }
  // Never ellipsis
  meta = meta.replace(/…/g, '').replace(/\.\.\./g, '')
  if (!/[.!?]$/.test(meta)) meta = finishSentence(meta)
  // final dangling check
  if (/\b(and|or|the|a|an|to|for|with|of|this|that)\s*[.!?]$/i.test(meta)) {
    meta = `Discover the ${productName} from Heirloom Cribs and More.`
  }
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

function validate(text, label) {
  const issues = []
  if (!text || text.length < 20) issues.push(`${label}:too-short`)
  if (/…|\.\.\./.test(text)) issues.push(`${label}:ellipsis`)
  if (/\b(and|or|the|a|an|to|for|with|of)\s*$/i.test(text.trim())) issues.push(`${label}:dangling-end`)
  if (!/[.!?]$/.test(text.trim())) issues.push(`${label}:no-terminal-punct`)
  if (/\.[A-Za-z]/.test(text)) issues.push(`${label}:missing-space-after-period`)
  const sents = text.replace(/\n+/g, ' ').match(/[^.!?]+[.!?]+/g) || []
  for (const s of sents) {
    if (/\b(and|or|the|a|an|to|for|with|of)\s*[.!?]$/i.test(s.trim())) {
      issues.push(`${label}:dangling-sentence`)
      break
    }
  }
  // incomplete: sentence without verb heuristic skipped
  return issues
}

// ——— Main ———
const matches = load(path.join(AUDIT, 'derived', 'matches.json'))
const report = { at: new Date().toISOString(), products: [], failures: [] }

for (const row of matches) {
  if (!row.vercel?.dirName) continue
  const dir = row.vercel.dirName
  const prodPath = path.join(PRODUCTS, dir, 'product.json')
  if (!fs.existsSync(prodPath)) continue

  const product = load(prodPath)
  const before = {
    description: product.description || '',
    title: product.title || '',
    metaDescription: product.metaDescription || '',
  }

  try {
    const description = polishBody(
      row.shopify?.description,
      row.shopify?.descriptionHtml,
      row.vercel?.description,
      before.description,
      product.productName,
    )
    const title = buildTitle(product.productName, product.category)
    const metaDescription = buildMeta(description, product.productName)

    const issues = [
      ...validate(description, 'desc'),
      ...validate(metaDescription, 'meta'),
    ]

    // If still failing, force safe fallbacks
    let descOut = description
    let metaOut = metaDescription
    if (issues.some((i) => i.startsWith('desc:'))) {
      // rebuild from vercel only carefully
      const vOnly = polishBody('', '', row.vercel?.description || before.description, '', product.productName)
      if (validate(vOnly, 'desc').length === 0) descOut = vOnly
    }
    metaOut = buildMeta(descOut, product.productName)
    const finalIssues = [...validate(descOut, 'desc'), ...validate(metaOut, 'meta')]

    product.description = descOut
    product.title = title
    product.metaDescription = metaOut
    writeJson(prodPath, product)

    report.products.push({
      slug: product.slug,
      dirName: dir,
      descLen: descOut.length,
      metaLen: metaOut.length,
      title,
      meta: metaOut,
      issues: finalIssues,
      descPreview: descOut.slice(0, 160),
      changed: before.description !== descOut || before.metaDescription !== metaOut || before.title !== title,
    })
    if (finalIssues.length) report.failures.push({ slug: product.slug, issues: finalIssues })
  } catch (e) {
    report.failures.push({ slug: product.slug || dir, error: String(e.message || e) })
  }
}

// Also polish unmatched vercel-only hard goods already on disk that are in products folder
// (matches already covers matched; rugs may remain untouched)

writeJson(OUT_REPORT, report)
const failCount = report.failures.length
const changed = report.products.filter((p) => p.changed).length
console.log(
  JSON.stringify(
    {
      polished: report.products.length,
      changed,
      stillFlagged: failCount,
      report: OUT_REPORT,
      sampleFlags: report.failures.slice(0, 8),
    },
    null,
    2,
  ),
)
