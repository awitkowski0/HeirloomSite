import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const AUDIT = path.resolve(__dirname, '..')
const DER = path.join(AUDIT, 'derived')
const REVIEW = path.join(AUDIT, 'review')
const PROD_PAGES = path.join(REVIEW, 'products')

function load(p) {
  let txt = fs.readFileSync(p, 'utf8')
  if (txt.charCodeAt(0) === 0xFEFF) txt = txt.slice(1)
  return JSON.parse(txt)
}
function ensureDir(d) {
  fs.mkdirSync(d, { recursive: true })
}
function write(p, s) {
  ensureDir(path.dirname(p))
  fs.writeFileSync(p, s)
}

const shopify = load(path.join(AUDIT, 'raw/shopify/catalog.json'))
const vercel = load(path.join(AUDIT, 'raw/vercel/catalog.json'))
const shopifyImgs = fs.existsSync(path.join(AUDIT, 'raw/shopify/image-manifest.json'))
  ? load(path.join(AUDIT, 'raw/shopify/image-manifest.json'))
  : []

const S = shopify.products || []
const V = vercel.products || []

function norm(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function tokens(s) {
  const stop = new Set([
    'the', 'a', 'an', 'and', 'or', 'of', 'for', 'with', 'in', 'to', 'solid',
    'hardwood', 'convertible', 'style', 'product', 'heirloom', 'cribs', 'more',
    '4', 'in', '1', '4in1',
  ])
  return norm(s)
    .split(' ')
    .filter((t) => t && !stop.has(t) && t.length > 1)
}

function jaccard(a, b) {
  const A = new Set(a)
  const B = new Set(b)
  if (!A.size && !B.size) return 0
  let inter = 0
  for (const x of A) if (B.has(x)) inter++
  return inter / (A.size + B.size - inter)
}

function skuNorm(sku) {
  return String(sku || '')
    .toUpperCase()
    .replace(/\s+/g, '')
    .replace(/[^A-Z0-9-]/g, '')
}

function skuFamily(sku) {
  const s = skuNorm(sku)
  // OTO-1201-... or FQP-601-...
  const m = s.match(/^([A-Z]+-\d+)/)
  if (m) return m[1]
  const m2 = s.match(/^([A-Z]+\d+)/)
  return m2 ? m2[1] : s.slice(0, 12)
}

function shopifySkus(p) {
  const nodes = p.variants?.nodes || p.variants || []
  return nodes.map((v) => v.sku).filter(Boolean)
}

function vercelSkus(p) {
  return (p.variants || []).map((v) => v.sku).filter(Boolean)
}

function shopifyPriceRange(p) {
  const nodes = p.variants?.nodes || []
  const prices = nodes.map((v) => parseFloat(v.price)).filter((n) => !Number.isNaN(n))
  if (!prices.length) return null
  return { min: Math.min(...prices), max: Math.max(...prices) }
}

function vercelPriceRange(p) {
  const prices = (p.variants || []).map((v) => Number(v.basePrice)).filter((n) => !Number.isNaN(n))
  if (!prices.length) return null
  return { min: Math.min(...prices), max: Math.max(...prices) }
}

function shopifyImageCount(p) {
  return (p.media?.nodes || []).filter((m) => m.image?.url).length
}

// Build SKU indexes
const vBySku = new Map()
const vByFamily = new Map()
for (const vp of V) {
  for (const sku of vercelSkus(vp)) {
    const n = skuNorm(sku)
    if (!vBySku.has(n)) vBySku.set(n, [])
    vBySku.get(n).push(vp)
    const f = skuFamily(sku)
    if (!vByFamily.has(f)) vByFamily.set(f, [])
    vByFamily.get(f).push(vp)
  }
}

const vBySlug = new Map(V.map((p) => [norm(p.slug), p]))
const vByName = new Map(V.map((p) => [norm(p.productName), p]))

function scorePair(sp, vp, method, base) {
  return { shopify: sp, vercel: vp, method, confidence: base }
}

function bestMatch(sp) {
  const candidates = []
  const sSkus = shopifySkus(sp).map(skuNorm).filter(Boolean)

  // 1) exact SKU
  for (const sku of sSkus) {
    for (const vp of vBySku.get(sku) || []) {
      candidates.push(scorePair(sp, vp, 'sku-exact', 98))
    }
  }

  // 2) SKU family
  const families = new Set(sSkus.map(skuFamily))
  for (const f of families) {
    for (const vp of vByFamily.get(f) || []) {
      candidates.push(scorePair(sp, vp, 'sku-family', 88))
    }
  }

  // 3) handle/slug
  const h = norm(sp.handle)
  if (vBySlug.has(h)) candidates.push(scorePair(sp, vBySlug.get(h), 'handle-slug', 92))
  // handle often has style suffix
  for (const [slug, vp] of vBySlug) {
    if (h.includes(slug) || slug.includes(h)) {
      candidates.push(scorePair(sp, vp, 'handle-contains', 78))
    }
  }

  // 4) exact title/name
  const t = norm(sp.title)
  const shortTitle = norm(
    sp.title
      .replace(/solid hardwood/gi, '')
      .replace(/4-in-1 convertible crib/gi, '')
      .replace(/convertible crib/gi, '')
      .replace(/- /g, ' '),
  )
  if (vByName.has(t)) candidates.push(scorePair(sp, vByName.get(t), 'title-exact', 90))
  if (vByName.has(shortTitle)) candidates.push(scorePair(sp, vByName.get(shortTitle), 'title-short', 86))
  for (const [name, vp] of vByName) {
    if (t.includes(name) && name.length > 4) {
      candidates.push(scorePair(sp, vp, 'title-contains', 80))
    }
    if (name.includes(shortTitle) && shortTitle.length > 4) {
      candidates.push(scorePair(sp, vp, 'name-contains-title', 76))
    }
  }

  // 5) fuzzy tokens
  const st = tokens(sp.title + ' ' + (sp.productType || '') + ' ' + sp.handle)
  for (const vp of V) {
    const vt = tokens(vp.productName + ' ' + (vp.category || '') + ' ' + vp.slug + ' ' + vp.dirName)
    const j = jaccard(st, vt)
    if (j >= 0.45) {
      candidates.push(scorePair(sp, vp, 'token-jaccard', Math.round(50 + j * 45)))
    }
  }

  // dedupe by vercel slug keep best confidence
  const byV = new Map()
  for (const c of candidates) {
    const key = c.vercel.slug || c.vercel.dirName
    const prev = byV.get(key)
    if (!prev || c.confidence > prev.confidence) byV.set(key, c)
  }
  const ranked = [...byV.values()].sort((a, b) => b.confidence - a.confidence)
  const best = ranked[0] || null
  return {
    best,
    alternates: ranked.slice(1, 8).map((c) => ({
      vercelSlug: c.vercel.slug,
      vercelName: c.vercel.productName,
      vercelDir: c.vercel.dirName,
      confidence: c.confidence,
      method: c.method,
    })),
  }
}

const matches = []
const usedVercel = new Set()

// First pass: high confidence exclusive
const provisional = S.map((sp) => {
  const { best, alternates } = bestMatch(sp)
  return { sp, best, alternates }
})

// Sort by confidence so stronger claims lock first
provisional.sort((a, b) => (b.best?.confidence || 0) - (a.best?.confidence || 0))

for (const row of provisional) {
  const { sp, best, alternates } = row
  let chosen = best
  let status = 'unmatched-shopify'
  if (chosen) {
    const vkey = chosen.vercel.slug || chosen.vercel.dirName
    if (usedVercel.has(vkey) && chosen.confidence < 95) {
      // try alternate
      const alt = alternates.find((a) => !usedVercel.has(a.vercelSlug))
      if (alt) {
        chosen = {
          shopify: sp,
          vercel: V.find((v) => v.slug === alt.vercelSlug),
          method: alt.method + '+alt',
          confidence: alt.confidence - 5,
        }
      } else if (usedVercel.has(vkey)) {
        chosen = null
      }
    }
  }
  if (chosen?.vercel) {
    const vkey = chosen.vercel.slug || chosen.vercel.dirName
    usedVercel.add(vkey)
    status = chosen.confidence >= 75 ? 'matched' : 'low-confidence'
  }

  const vp = chosen?.vercel || null
  const spr = shopifyPriceRange(sp)
  const vpr = vp ? vercelPriceRange(vp) : null
  const sImgs = shopifyImageCount(sp)
  const vImgs = vp ? vp.imageCount || 0 : 0

  const gaps = buildGaps(sp, vp)

  const id = createHash('sha1')
    .update((sp.handle || '') + '::' + (vp?.slug || 'none'))
    .digest('hex')
    .slice(0, 12)

  matches.push({
    id,
    status,
    confidence: chosen?.confidence ?? 0,
    method: chosen?.method ?? null,
    shopify: {
      handle: sp.handle,
      title: sp.title,
      productType: sp.productType,
      status: sp.status,
      vendor: sp.vendor,
      tags: sp.tags || [],
      description: sp.description || '',
      descriptionHtml: sp.descriptionHtml || '',
      seo: sp.seo || {},
      options: sp.options || [],
      collections: (sp.collections?.nodes || []).map((c) => ({ title: c.title, handle: c.handle })),
      metafields: (sp.metafields?.nodes || []).map((m) => ({
        key: m.key,
        type: m.type,
        value: m.value,
      })),
      variantCount: (sp.variants?.nodes || []).length,
      skus: shopifySkus(sp),
      price: spr,
      imageCount: sImgs,
      images: (shopifyImgs || [])
        .filter((i) => i.handle === sp.handle)
        .map((i) => i.localPath),
      variants: (sp.variants?.nodes || []).map((v) => ({
        title: v.title,
        sku: v.sku,
        price: v.price,
        selectedOptions: v.selectedOptions,
        image: v.image?.url || null,
      })),
      featuredMedia: sp.featuredMedia?.image?.url || null,
    },
    vercel: vp
      ? {
          dirName: vp.dirName,
          productName: vp.productName,
          slug: vp.slug,
          category: vp.category,
          variantType: vp.variantType,
          description: vp.description || '',
          extendedDescription: vp.extendedDescription,
          title: vp.title,
          metaDescription: vp.metaDescription,
          tags: vp.tags || [],
          addons: vp.addons || [],
          variantCount: (vp.variants || []).length,
          skus: vercelSkus(vp),
          price: vpr,
          imageCount: vImgs,
          images: vp.imageFiles || [],
          variants: (vp.variants || []).map((v) => ({
            variant: v.variant,
            label: v.label,
            stains: v.stains,
            basePrice: v.basePrice,
            sku: v.sku,
          })),
          mediaKeys: Object.keys(vp.media || {}),
        }
      : null,
    alternates: row.alternates,
    gaps,
    decisions: defaultDecisions(gaps),
    notes: '',
  })
}

// Vercel unmatched
const unmatchedVercel = V.filter((vp) => !usedVercel.has(vp.slug || vp.dirName)).map((vp) => {
  const id = createHash('sha1').update('vercel-only::' + vp.slug).digest('hex').slice(0, 12)
  return {
    id,
    status: 'unmatched-vercel',
    confidence: 0,
    method: null,
    shopify: null,
    vercel: {
      dirName: vp.dirName,
      productName: vp.productName,
      slug: vp.slug,
      category: vp.category,
      variantType: vp.variantType,
      description: vp.description || '',
      title: vp.title,
      metaDescription: vp.metaDescription,
      variantCount: (vp.variants || []).length,
      skus: vercelSkus(vp),
      price: vercelPriceRange(vp),
      imageCount: vp.imageCount || 0,
      images: vp.imageFiles || [],
      variants: (vp.variants || []).map((v) => ({
        variant: v.variant,
        label: v.label,
        stains: v.stains,
        basePrice: v.basePrice,
        sku: v.sku,
      })),
    },
    alternates: [],
    gaps: [{ field: 'shopifyProduct', shopify: 'missing', vercel: 'present', severity: 'info' }],
    decisions: { shopifyProduct: 'exclude' },
    notes: 'Present on Vercel only (no Shopify hard-good match)',
  }
})

const allRows = [...matches, ...unmatchedVercel]

function buildGaps(sp, vp) {
  const gaps = []
  if (!vp) {
    gaps.push({ field: 'product', shopify: 'present', vercel: 'missing', severity: 'high' })
    return gaps
  }
  const sDesc = (sp.description || '').trim()
  const vDesc = (vp.description || '').trim()
  if (sDesc && !vDesc) gaps.push({ field: 'description', shopify: 'present', vercel: 'missing', severity: 'high' })
  else if (sDesc && vDesc && norm(sDesc) !== norm(vDesc))
    gaps.push({
      field: 'description',
      shopify: `${sDesc.length} chars`,
      vercel: `${vDesc.length} chars`,
      severity: 'medium',
      note: 'text differs',
    })

  const sSeoT = sp.seo?.title || ''
  const vSeoT = vp.title || ''
  if (sSeoT && !vSeoT)
    gaps.push({ field: 'seoTitle', shopify: 'present', vercel: 'missing', severity: 'medium' })
  else if (sSeoT && vSeoT && norm(sSeoT) !== norm(vSeoT))
    gaps.push({ field: 'seoTitle', shopify: sSeoT, vercel: vSeoT, severity: 'low', note: 'differs' })

  const sSeoD = sp.seo?.description || ''
  const vSeoD = vp.metaDescription || ''
  if (sSeoD && !vSeoD)
    gaps.push({ field: 'seoDescription', shopify: 'present', vercel: 'missing', severity: 'medium' })
  else if (sSeoD && vSeoD && norm(sSeoD) !== norm(vSeoD))
    gaps.push({ field: 'seoDescription', shopify: `${sSeoD.length}c`, vercel: `${vSeoD.length}c`, severity: 'low' })

  if (!vp.extendedDescription)
    gaps.push({
      field: 'extendedDescription',
      shopify: 'n/a or metafields',
      vercel: 'null',
      severity: 'low',
    })

  const sSkus = new Set(shopifySkus(sp).map(skuNorm))
  const vSkus = new Set(vercelSkus(vp).map(skuNorm))
  const missingSkus = [...sSkus].filter((s) => s && !vSkus.has(s))
  if (missingSkus.length)
    gaps.push({
      field: 'skus',
      shopify: `${sSkus.size} skus`,
      vercel: `${vSkus.size} skus`,
      severity: 'high',
      note: `missing on vercel e.g. ${missingSkus.slice(0, 5).join(', ')}`,
    })

  const spr = shopifyPriceRange(sp)
  const vpr = vercelPriceRange(vp)
  if (spr && vpr) {
    const delta = Math.abs(spr.min - vpr.min)
    if (delta >= 1)
      gaps.push({
        field: 'price',
        shopify: `$${spr.min}–$${spr.max}`,
        vercel: `$${vpr.min}–$${vpr.max}`,
        severity: delta >= 50 ? 'high' : 'medium',
        note: `min delta $${delta.toFixed(2)}`,
      })
  }

  const sImg = shopifyImageCount(sp)
  const vImg = vp.imageCount || 0
  if (sImg > vImg)
    gaps.push({
      field: 'images',
      shopify: String(sImg),
      vercel: String(vImg),
      severity: sImg - vImg >= 3 ? 'high' : 'medium',
      note: 'fewer images on Vercel',
    })

  const mfs = sp.metafields?.nodes || []
  const relKeys = ['accessories', 'collection_items', 'bundle_items', 'fqp_data_list', 'dimensions_imperial']
  for (const key of relKeys) {
    const mf = mfs.find((m) => m.key === key)
    if (mf && mf.value && mf.value !== '[]' && mf.value !== 'null') {
      const vercelHas =
        key === 'dimensions_imperial'
          ? (vp.variants || []).some((v) => v.dimensions)
          : key === 'bundle_items' || key === 'accessories' || key === 'collection_items'
            ? (vp.addons || []).length > 0
            : false
      if (!vercelHas)
        gaps.push({
          field: `metafield:${key}`,
          shopify: 'present',
          vercel: 'missing',
          severity: key.includes('bundle') || key.includes('collection') || key === 'accessories' ? 'high' : 'medium',
        })
    }
  }

  if ((sp.tags || []).length && !(vp.tags || []).length)
    gaps.push({ field: 'tags', shopify: (sp.tags || []).join(', '), vercel: 'none', severity: 'low' })

  const sVar = (sp.variants?.nodes || []).length
  const vVar = (vp.variants || []).length
  if (sVar !== vVar)
    gaps.push({
      field: 'variantCount',
      shopify: String(sVar),
      vercel: String(vVar),
      severity: 'medium',
    })

  return gaps
}

function defaultDecisions(gaps) {
  const d = {}
  for (const g of gaps) {
    if (g.severity === 'high' && g.vercel === 'missing') d[g.field] = 'include'
    else if (g.severity === 'info') d[g.field] = 'exclude'
    else d[g.field] = 'review'
  }
  return d
}

// Summary
const summary = {
  generatedAt: new Date().toISOString(),
  shopifyHardGoods: S.length,
  vercelHardGoods: V.length,
  matched: allRows.filter((r) => r.status === 'matched').length,
  lowConfidence: allRows.filter((r) => r.status === 'low-confidence').length,
  unmatchedShopify: allRows.filter((r) => r.status === 'unmatched-shopify').length,
  unmatchedVercel: allRows.filter((r) => r.status === 'unmatched-vercel').length,
  totalRows: allRows.length,
}

ensureDir(DER)
write(path.join(DER, 'matches.json'), JSON.stringify(allRows, null, 2))
write(path.join(DER, 'summary.json'), JSON.stringify(summary, null, 2))
write(
  path.join(DER, 'decisions.json'),
  JSON.stringify(
    Object.fromEntries(allRows.map((r) => [r.id, { decisions: r.decisions, notes: r.notes, matchOverride: null }])),
    null,
    2,
  ),
)

// Build HTML
buildHtml(allRows, summary)
console.log('Match summary:', JSON.stringify(summary, null, 2))
console.log('Wrote derived/matches.json and review/audit.html')

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function buildHtml(rows, summary) {
  ensureDir(REVIEW)
  ensureDir(PROD_PAGES)

  // detail pages
  for (const r of rows) {
    write(path.join(PROD_PAGES, `${r.id}.html`), detailPage(r))
  }

  const dataJson = JSON.stringify(rows)
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Task 1 — Site Product Audit</title>
<style>
:root {
  --bg:#0f1419; --panel:#1a2332; --panel2:#243044; --text:#e7ecf3; --muted:#9aa8bc;
  --accent:#5b9fd4; --good:#3dbe7a; --warn:#e0a935; --bad:#e05d5d; --line:#2c3a4f;
  --chip:#2a384c;
}
* { box-sizing:border-box; }
body { margin:0; font:14px/1.45 system-ui,Segoe UI,Roboto,sans-serif; background:var(--bg); color:var(--text); }
header { padding:16px 20px; border-bottom:1px solid var(--line); background:var(--panel); position:sticky; top:0; z-index:10; }
header h1 { margin:0 0 6px; font-size:18px; }
header .meta { color:var(--muted); display:flex; flex-wrap:wrap; gap:12px; }
.stats { display:flex; gap:8px; flex-wrap:wrap; margin-top:10px; }
.stat { background:var(--panel2); padding:6px 10px; border-radius:8px; }
.stat b { color:var(--accent); }
.toolbar { display:flex; flex-wrap:wrap; gap:8px; padding:12px 20px; border-bottom:1px solid var(--line); align-items:center; }
input, select, button, textarea {
  background:var(--panel2); color:var(--text); border:1px solid var(--line);
  border-radius:6px; padding:7px 10px; font:inherit;
}
button { cursor:pointer; }
button.primary { background:var(--accent); color:#041018; border-color:transparent; font-weight:600; }
button.good { background:var(--good); color:#04210f; border:0; }
table { width:100%; border-collapse:collapse; }
th, td { padding:8px 10px; border-bottom:1px solid var(--line); vertical-align:top; text-align:left; }
th { position:sticky; top:118px; background:var(--panel); z-index:5; color:var(--muted); font-weight:600; font-size:12px; text-transform:uppercase; letter-spacing:.03em; }
tr:hover td { background:rgba(91,159,212,.06); }
.chip { display:inline-block; padding:2px 7px; border-radius:999px; background:var(--chip); font-size:11px; margin:1px; }
.chip.matched { background:#1e3d2f; color:#8dffc1; }
.chip.low { background:#3d3420; color:#ffd888; }
.chip.unmatched-shopify { background:#3d2222; color:#ffb0b0; }
.chip.unmatched-vercel { background:#24304a; color:#a8c4ff; }
.chip.high { background:#4a2020; color:#ffb4b4; }
.chip.medium { background:#3d3420; color:#ffe0a0; }
.chip.lowsev { background:#2a384c; color:#c5d4e8; }
.thumbs { display:flex; gap:4px; flex-wrap:wrap; max-width:160px; }
.thumbs img { width:36px; height:36px; object-fit:cover; border-radius:4px; background:#000; }
a { color:var(--accent); }
.price { white-space:nowrap; font-variant-numeric:tabular-nums; }
.delta { color:var(--warn); }
.notes { width:140px; min-height:40px; }
.wrap { padding:0 0 40px; }
.help { color:var(--muted); padding:8px 20px; font-size:12px; }
footer { padding:16px 20px; color:var(--muted); border-top:1px solid var(--line); }
</style>
</head>
<body>
<header>
  <h1>Task 1 — Site Product Audit (Shopify ↔ Vercel)</h1>
  <div class="meta">
    <span>Shopify hard goods: <b id="sCount">${summary.shopifyHardGoods}</b></span>
    <span>Vercel hard goods: <b id="vCount">${summary.vercelHardGoods}</b></span>
    <span>Generated: ${esc(summary.generatedAt)}</span>
  </div>
  <div class="stats">
    <div class="stat">Matched <b>${summary.matched}</b></div>
    <div class="stat">Low confidence <b>${summary.lowConfidence}</b></div>
    <div class="stat">Shopify only <b>${summary.unmatchedShopify}</b></div>
    <div class="stat">Vercel only <b>${summary.unmatchedVercel}</b></div>
  </div>
</header>
<div class="toolbar">
  <input id="q" placeholder="Filter title, handle, SKU, slug…" style="min-width:240px"/>
  <select id="status">
    <option value="">All statuses</option>
    <option value="matched">Matched</option>
    <option value="low-confidence">Low confidence</option>
    <option value="unmatched-shopify">Shopify only</option>
    <option value="unmatched-vercel">Vercel only</option>
  </select>
  <select id="sev">
    <option value="">Any gaps</option>
    <option value="high">Has high gaps</option>
    <option value="medium">Has medium+ gaps</option>
  </select>
  <button class="primary" id="exportDec">Export decisions.json</button>
  <button id="exportMatches">Export matches snapshot</button>
  <button id="loadDec">Import decisions.json</button>
  <input type="file" id="fileDec" accept="application/json,.json" hidden/>
  <span id="saveState" style="color:var(--muted)"></span>
</div>
<p class="help">
  Edit match quality and Include / Exclude / Defer per gap. Changes save to <b>localStorage</b>.
  Use <b>Export decisions.json</b> and drop the file into <code>Site Audit Data/derived/decisions.json</code> to persist in the repo.
  Click a product name for the full side-by-side detail page (images, variants, metafields).
</p>
<div class="wrap">
<table>
<thead>
<tr>
  <th>Status</th>
  <th>Conf.</th>
  <th>Shopify</th>
  <th>Vercel (best guess)</th>
  <th>Method</th>
  <th>Price</th>
  <th>Images</th>
  <th>Gaps</th>
  <th>Bulk decision</th>
  <th>Notes</th>
</tr>
</thead>
<tbody id="tbody"></tbody>
</table>
</div>
<footer>Task 1 · HeirloomSite · Data under <code>Site Audit Data/</code> · Hard goods only</footer>
<script>
const ROWS = ${dataJson};
const KEY = 'heirloom-task1-audit-v1';

function loadState() {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; }
}
function saveState(st) {
  localStorage.setItem(KEY, JSON.stringify(st));
  document.getElementById('saveState').textContent = 'Saved locally ' + new Date().toLocaleTimeString();
}
let state = loadState();
// hydrate from embedded defaults
for (const r of ROWS) {
  if (!state[r.id]) state[r.id] = { decisions: r.decisions || {}, notes: r.notes || '', matchOverride: null };
}

function money(pr) {
  if (!pr) return '—';
  if (pr.min === pr.max) return '$' + Number(pr.min).toFixed(2);
  return '$' + Number(pr.min).toFixed(2) + '–$' + Number(pr.max).toFixed(2);
}

function thumbs(paths) {
  if (!paths || !paths.length) return '';
  return '<div class="thumbs">' + paths.slice(0,4).map(p => '<img src="../'+p+'" loading="lazy" alt=""/>').join('') + (paths.length>4?'<span class="chip">+'+(paths.length-4)+'</span>':'') + '</div>';
}

function gapChips(gaps) {
  if (!gaps || !gaps.length) return '<span class="chip lowsev">none</span>';
  return gaps.slice(0,6).map(g => {
    const sev = g.severity === 'high' ? 'high' : g.severity === 'medium' ? 'medium' : 'lowsev';
    return '<span class="chip '+sev+'" title="'+(g.note||'')+'">'+g.field+'</span>';
  }).join('') + (gaps.length>6?'<span class="chip">+'.concat(gaps.length-6,'</span>'):'');
}

function priceCell(r) {
  const s = money(r.shopify && r.shopify.price);
  const v = money(r.vercel && r.vercel.price);
  let d = '';
  if (r.shopify && r.shopify.price && r.vercel && r.vercel.price) {
    const delta = Math.abs(r.shopify.price.min - r.vercel.price.min);
    if (delta >= 1) d = '<div class="delta">Δ $'+delta.toFixed(2)+'</div>';
  }
  return '<div class="price">S: '+s+'<br/>V: '+v+d+'</div>';
}

function render() {
  const q = document.getElementById('q').value.toLowerCase().trim();
  const st = document.getElementById('status').value;
  const sev = document.getElementById('sev').value;
  const tb = document.getElementById('tbody');
  tb.innerHTML = '';
  for (const r of ROWS) {
    const s = state[r.id] || {};
    if (st && r.status !== st) continue;
    if (sev === 'high' && !(r.gaps||[]).some(g => g.severity==='high')) continue;
    if (sev === 'medium' && !(r.gaps||[]).some(g => g.severity==='high'||g.severity==='medium')) continue;
    const blob = [
      r.shopify && r.shopify.title, r.shopify && r.shopify.handle,
      r.vercel && r.vercel.productName, r.vercel && r.vercel.slug,
      ...(r.shopify && r.shopify.skus || []), ...(r.vercel && r.vercel.skus || []),
      s.notes || ''
    ].join(' ').toLowerCase();
    if (q && !blob.includes(q)) continue;

    const tr = document.createElement('tr');
    const sTitle = r.shopify ? r.shopify.title : '—';
    const sHandle = r.shopify ? r.shopify.handle : '';
    const vName = r.vercel ? r.vercel.productName : '—';
    const vSlug = r.vercel ? r.vercel.slug : '';
    const alts = (r.alternates||[]).map(a =>
      '<option value="'+a.vercelSlug+'">'+a.vercelName+' ('+a.confidence+'% '+a.method+')</option>'
    ).join('');

    tr.innerHTML = \`
      <td><span class="chip \${r.status}">\${r.status}</span></td>
      <td>\${r.confidence || 0}%</td>
      <td>
        <a href="products/\${r.id}.html"><b>\${escHtml(sTitle)}</b></a>
        <div style="color:var(--muted);font-size:12px">\${escHtml(sHandle)}</div>
        \${r.shopify ? thumbs(r.shopify.images) : ''}
      </td>
      <td>
        <b>\${escHtml(vName)}</b>
        <div style="color:var(--muted);font-size:12px">\${escHtml(vSlug)}</div>
        \${r.vercel ? thumbs(r.vercel.images) : ''}
        \${alts ? '<select data-alt="'+r.id+'" style="margin-top:4px;max-width:200px"><option value="">Change match…</option>'+alts+'</select>' : ''}
      </td>
      <td><span class="chip">\${escHtml(r.method||'—')}</span></td>
      <td>\${priceCell(r)}</td>
      <td>S:\${r.shopify?r.shopify.imageCount:0}<br/>V:\${r.vercel?r.vercel.imageCount:0}</td>
      <td>\${gapChips(r.gaps)}</td>
      <td>
        <select data-bulk="\${r.id}">
          <option value="">Gap-by-gap…</option>
          <option value="include">All high → Include</option>
          <option value="exclude">All → Exclude</option>
          <option value="defer">All → Defer</option>
          <option value="review">All → Review</option>
        </select>
      </td>
      <td><textarea class="notes" data-notes="\${r.id}">\${escHtml(s.notes||'')}</textarea></td>
    \`;
    tb.appendChild(tr);
  }
  // bind
  tb.querySelectorAll('[data-notes]').forEach(el => {
    el.addEventListener('change', () => {
      state[el.dataset.notes].notes = el.value;
      saveState(state);
    });
  });
  tb.querySelectorAll('[data-bulk]').forEach(el => {
    el.addEventListener('change', () => {
      const id = el.dataset.bulk;
      const val = el.value;
      if (!val) return;
      const row = ROWS.find(x => x.id===id);
      if (!row) return;
      state[id].decisions = state[id].decisions || {};
      for (const g of (row.gaps||[])) {
        if (val === 'include' && g.severity !== 'high') continue;
        state[id].decisions[g.field] = val === 'include' ? 'include' : val;
      }
      if (val !== 'include') {
        for (const g of (row.gaps||[])) state[id].decisions[g.field] = val;
      }
      saveState(state);
      el.value = '';
      alert('Updated decisions for '+id+' (see detail page for per-field). Export to persist.');
    });
  });
  tb.querySelectorAll('[data-alt]').forEach(el => {
    el.addEventListener('change', () => {
      if (!el.value) return;
      state[el.dataset.alt].matchOverride = el.value;
      state[el.dataset.alt].notes = (state[el.dataset.alt].notes||'') + (state[el.dataset.alt].notes?'\\n':'') + 'Override match → '+el.value;
      saveState(state);
      alert('Match override saved locally: '+el.value);
    });
  });
}

function escHtml(s) {
  return String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

document.getElementById('q').addEventListener('input', render);
document.getElementById('status').addEventListener('change', render);
document.getElementById('sev').addEventListener('change', render);

document.getElementById('exportDec').onclick = () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], {type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'decisions.json';
  a.click();
};
document.getElementById('exportMatches').onclick = () => {
  const blob = new Blob([JSON.stringify({ state, rows: ROWS }, null, 2)], {type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'matches-snapshot.json';
  a.click();
};
document.getElementById('loadDec').onclick = () => document.getElementById('fileDec').click();
document.getElementById('fileDec').onchange = async (e) => {
  const f = e.target.files[0];
  if (!f) return;
  const text = await f.text();
  state = JSON.parse(text);
  saveState(state);
  render();
};

saveState(state);
render();
</script>
</body>
</html>`

  write(path.join(REVIEW, 'audit.html'), html)
}

function detailPage(r) {
  const s = r.shopify
  const v = r.vercel
  const sImgs = (s?.images || [])
    .map((p) => `<img src="../../${esc(p)}" alt="" loading="lazy"/>`)
    .join('')
  const vImgs = (v?.images || [])
    .map((p) => `<img src="../../${esc(p)}" alt="" loading="lazy"/>`)
    .join('')

  const gapRows = (r.gaps || [])
    .map((g) => {
      const dec = (r.decisions || {})[g.field] || 'review'
      return `<tr>
      <td>${esc(g.field)}</td>
      <td>${esc(g.shopify)}</td>
      <td>${esc(g.vercel)}</td>
      <td><span class="chip ${g.severity}">${esc(g.severity)}</span> ${esc(g.note || '')}</td>
      <td>
        <select data-field="${esc(g.field)}">
          <option value="include"${dec === 'include' ? ' selected' : ''}>Include</option>
          <option value="exclude"${dec === 'exclude' ? ' selected' : ''}>Exclude</option>
          <option value="defer"${dec === 'defer' ? ' selected' : ''}>Defer</option>
          <option value="review"${dec === 'review' ? ' selected' : ''}>Review</option>
        </select>
      </td>
    </tr>`
    })
    .join('')

  const sVars = (s?.variants || [])
    .map(
      (x) =>
        `<tr><td>${esc(x.title)}</td><td>${esc(x.sku)}</td><td>${esc(x.price)}</td><td>${esc(JSON.stringify(x.selectedOptions || []))}</td></tr>`,
    )
    .join('')
  const vVars = (v?.variants || [])
    .map(
      (x) =>
        `<tr><td>${esc(x.label || x.variant)}</td><td>${esc(x.sku)}</td><td>${esc(x.basePrice)}</td><td>${esc((x.stains || []).join(', '))}</td></tr>`,
    )
    .join('')

  const mfs = (s?.metafields || [])
    .map((m) => `<tr><td>${esc(m.key)}</td><td>${esc(m.type)}</td><td><code>${esc(String(m.value).slice(0, 500))}</code></td></tr>`)
    .join('')

  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"/>
<title>${esc(s?.title || v?.productName || r.id)} — Audit</title>
<style>
:root { --bg:#0f1419; --panel:#1a2332; --text:#e7ecf3; --muted:#9aa8bc; --accent:#5b9fd4; --line:#2c3a4f; --chip:#2a384c; }
body{margin:0;font:14px/1.45 system-ui,sans-serif;background:var(--bg);color:var(--text);}
a{color:var(--accent)} header{padding:16px 20px;border-bottom:1px solid var(--line);background:var(--panel)}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;padding:16px 20px}
@media(max-width:900px){.grid{grid-template-columns:1fr}}
.card{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:14px}
h1{font-size:18px;margin:0 0 8px} h2{font-size:15px;margin:0 0 10px;color:var(--accent)}
.muted{color:var(--muted)} .imgs{display:flex;flex-wrap:wrap;gap:6px}
.imgs img{width:96px;height:96px;object-fit:cover;border-radius:6px;background:#000}
table{width:100%;border-collapse:collapse;font-size:13px}
th,td{border-bottom:1px solid var(--line);padding:6px;text-align:left;vertical-align:top}
.chip{display:inline-block;padding:2px 7px;border-radius:999px;background:var(--chip);font-size:11px}
.chip.high{background:#4a2020;color:#ffb4b4}
.chip.medium{background:#3d3420;color:#ffe0a0}
.chip.low{background:#2a384c}
select,textarea,button{background:#243044;color:var(--text);border:1px solid var(--line);border-radius:6px;padding:6px 8px}
button{cursor:pointer;background:var(--accent);color:#041018;font-weight:600;border:0}
pre{white-space:pre-wrap;background:#0c1016;padding:10px;border-radius:8px;max-height:240px;overflow:auto}
</style></head>
<body>
<header>
  <a href="../audit.html">← Back to matrix</a>
  <h1>${esc(s?.title || v?.productName || 'Product')}</h1>
  <div class="muted">ID ${esc(r.id)} · <span class="chip">${esc(r.status)}</span> · ${r.confidence || 0}% · ${esc(r.method || '—')}</div>
</header>
<div class="grid">
  <div class="card">
    <h2>Shopify</h2>
    ${s ? `
      <div><b>${esc(s.title)}</b></div>
      <div class="muted">${esc(s.handle)} · ${esc(s.productType)} · ${esc(s.status)}</div>
      <div class="muted">Collections: ${esc((s.collections || []).map((c) => c.title).join(', ') || '—')}</div>
      <h3>Description</h3>
      <pre>${esc(s.description || '')}</pre>
      <h3>SEO</h3>
      <div>${esc(s.seo?.title || '—')}</div>
      <div class="muted">${esc(s.seo?.description || '—')}</div>
      <h3>Images (${s.imageCount || 0})</h3>
      <div class="imgs">${sImgs || '<span class="muted">none</span>'}</div>
      <h3>Variants</h3>
      <table><thead><tr><th>Title</th><th>SKU</th><th>Price</th><th>Options</th></tr></thead><tbody>${sVars}</tbody></table>
      <h3>Metafields (custom)</h3>
      <table><thead><tr><th>Key</th><th>Type</th><th>Value</th></tr></thead><tbody>${mfs || '<tr><td colspan="3">none</td></tr>'}</tbody></table>
    ` : '<p class="muted">No Shopify product (Vercel only)</p>'}
  </div>
  <div class="card">
    <h2>Vercel</h2>
    ${v ? `
      <div><b>${esc(v.productName)}</b></div>
      <div class="muted">${esc(v.slug)} · ${esc(v.category)} · ${esc(v.variantType)} · dir: ${esc(v.dirName)}</div>
      <h3>Description</h3>
      <pre>${esc(v.description || '')}</pre>
      <h3>SEO</h3>
      <div>${esc(v.title || '—')}</div>
      <div class="muted">${esc(v.metaDescription || '—')}</div>
      <h3>Images (${v.imageCount || 0})</h3>
      <div class="imgs">${vImgs || '<span class="muted">none</span>'}</div>
      <h3>Variants</h3>
      <table><thead><tr><th>Label</th><th>SKU</th><th>Price</th><th>Stains</th></tr></thead><tbody>${vVars}</tbody></table>
    ` : '<p class="muted">No Vercel product (Shopify only — candidate to add)</p>'}
  </div>
</div>
<div class="card" style="margin:0 20px 20px">
  <h2>Gap decisions</h2>
  <p class="muted">Include = add/fix Vercel · Exclude = intentional skip · Defer = later · Review = needs human</p>
  <table>
    <thead><tr><th>Field</th><th>Shopify</th><th>Vercel</th><th>Severity</th><th>Decision</th></tr></thead>
    <tbody id="gaps">${gapRows || '<tr><td colspan="5">No gaps flagged</td></tr>'}</tbody>
  </table>
  <p style="margin-top:12px">
    <label>Notes<br/><textarea id="notes" style="width:100%;min-height:70px">${esc(r.notes || '')}</textarea></label>
  </p>
  <button id="save">Save decisions to browser</button>
  <span id="msg" class="muted"></span>
</div>
<script>
const ID = ${JSON.stringify(r.id)};
const KEY = 'heirloom-task1-audit-v1';
function load(){ try { return JSON.parse(localStorage.getItem(KEY)||'{}'); } catch { return {}; } }
function save(st){ localStorage.setItem(KEY, JSON.stringify(st)); }
document.getElementById('save').onclick = () => {
  const st = load();
  st[ID] = st[ID] || { decisions:{}, notes:'', matchOverride:null };
  st[ID].notes = document.getElementById('notes').value;
  st[ID].decisions = st[ID].decisions || {};
  document.querySelectorAll('[data-field]').forEach(el => { st[ID].decisions[el.dataset.field] = el.value; });
  save(st);
  document.getElementById('msg').textContent = 'Saved ' + new Date().toLocaleTimeString() + ' — export from matrix page to persist file.';
};
// hydrate
const st = load();
if (st[ID]) {
  if (st[ID].notes) document.getElementById('notes').value = st[ID].notes;
  document.querySelectorAll('[data-field]').forEach(el => {
    if (st[ID].decisions && st[ID].decisions[el.dataset.field]) el.value = st[ID].decisions[el.dataset.field];
  });
}
</script>
</body></html>`
}
