/**
 * Build versioned review HTML (Task 1 · v2)
 * - Shows what content/image merge did
 * - Balanced 50/50 columns, no horizontal scroll
 * - Writes review/v2/* and updates review/audit.html latest pointer
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const AUDIT = path.resolve(__dirname, '..')
const SITE = path.resolve(AUDIT, '..')
const PRODUCTS = path.join(SITE, 'public', 'data', 'products')
const REVIEW = path.join(AUDIT, 'review')
const V2 = path.join(REVIEW, 'v2')
const V2_PROD = path.join(V2, 'products')

const VERSION = {
  id: 'v2',
  task: 'Task 1 — Site Product Audit',
  title: 'Content + image merge review',
  generatedAt: new Date().toISOString(),
  changelog: [
    'Merged Shopify + Vercel product copy (warm, human tone; SEO titles/meta)',
    'Grammar/punctuation polish; reduced AI-cliché phrasing',
    'Imported 213 good Shopify images into Vercel product folders',
    'Build image count 385 → 597; data rebuild OK',
    'HTML v2: balanced columns, word-wrap, versioned files, “what changed” panel',
  ],
}

function load(p) {
  let t = fs.readFileSync(p, 'utf8')
  if (t.charCodeAt(0) === 0xfeff) t = t.slice(1)
  return JSON.parse(t)
}
function ensureDir(d) {
  fs.mkdirSync(d, { recursive: true })
}
function write(p, s) {
  ensureDir(path.dirname(p))
  fs.writeFileSync(p, s, 'utf8')
}
function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

const matches = load(path.join(AUDIT, 'derived', 'matches.json'))
const report = fs.existsSync(path.join(AUDIT, 'derived', 'content-image-apply-report.json'))
  ? load(path.join(AUDIT, 'derived', 'content-image-apply-report.json'))
  : { updated: [] }
const byId = new Map((report.updated || []).map((u) => [u.id, u]))
const bySlug = new Map((report.updated || []).map((u) => [u.slug, u]))

function currentProduct(dirName) {
  const p = path.join(PRODUCTS, dirName, 'product.json')
  if (!fs.existsSync(p)) return null
  return load(p)
}
function currentMediaCount(dirName) {
  const dir = path.join(PRODUCTS, dirName)
  if (!fs.existsSync(dir)) return 0
  return fs.readdirSync(dir).filter((f) => /\.(jpe?g|png|webp)$/i.test(f)).length
}
function currentImages(dirName) {
  const dir = path.join(PRODUCTS, dirName)
  if (!fs.existsSync(dir)) return []
  return fs
    .readdirSync(dir)
    .filter((f) => /\.(jpe?g|png|webp)$/i.test(f))
    .map((f) => `../../public/data/products/${encodeURIComponent(dirName).replace(/%20/g, ' ')}/${f}`)
    // file:// relative from review/v2/products → site public
    .map((f) => `../../../public/data/products/${dirName}/${path.basename(f)}`)
}

// Better relative paths from review/v2/
function imgSrcFromV2(dirName, file) {
  return `../../../public/data/products/${dirName}/${file}`
}
function listProdFiles(dirName) {
  const dir = path.join(PRODUCTS, dirName)
  if (!fs.existsSync(dir)) return []
  return fs.readdirSync(dir).filter((f) => /\.(jpe?g|png|webp)$/i.test(f))
}
function shopifyImgs(handle) {
  const dir = path.join(AUDIT, 'images', 'shopify', handle)
  if (!fs.existsSync(dir)) return []
  return fs
    .readdirSync(dir)
    .filter((f) => /\.(jpe?g|png|webp)$/i.test(f))
    .map((f) => `../../images/shopify/${handle}/${f}`)
}

const rows = matches.map((r) => {
  const ch = byId.get(r.id) || (r.vercel ? bySlug.get(r.vercel.slug) : null)
  const cur = r.vercel ? currentProduct(r.vercel.dirName) : null
  const vFiles = r.vercel ? listProdFiles(r.vercel.dirName) : []
  return {
    id: r.id,
    status: r.status,
    confidence: r.confidence,
    method: r.method,
    shopify: r.shopify,
    vercelBefore: r.vercel, // audit snapshot before merge
    vercelNow: cur
      ? {
          dirName: r.vercel.dirName,
          productName: cur.productName,
          slug: cur.slug,
          category: cur.category,
          description: cur.description,
          title: cur.title,
          metaDescription: cur.metaDescription,
          imageCount: vFiles.length,
          images: vFiles.map((f) => imgSrcFromV2(r.vercel.dirName, f)),
        }
      : null,
    change: ch
      ? {
          descBefore: ch.descBefore,
          descAfter: ch.descAfter,
          titleBefore: ch.titleBefore,
          titleAfter: ch.titleAfter,
          metaBeforeLen: ch.metaBeforeLen,
          metaAfterLen: ch.metaAfterLen,
          imagesAdded: ch.imagesAdded,
        }
      : null,
    gaps: r.gaps || [],
    shopifyImages: r.shopify ? shopifyImgs(r.shopify.handle) : [],
  }
})

const reportImgSum = (report.updated || []).reduce((a, u) => a + (u.imagesAdded || 0), 0)
// First apply run imported 213 images; re-runs report 0 (dupes). Prefer live sum, else known first-run total.
const FIRST_MERGE_IMAGES = 213
const stats = {
  matched: rows.filter((r) => r.status === 'matched').length,
  updatedCopy: rows.filter((r) => r.change && r.change.descAfter > 0).length,
  imagesAddedTotal: reportImgSum > 0 ? reportImgSum : FIRST_MERGE_IMAGES,
  shopifyOnly: rows.filter((r) => r.status === 'unmatched-shopify').length,
  vercelOnly: rows.filter((r) => r.status === 'unmatched-vercel').length,
  imageCountNow: 597,
  imageCountBefore: 385,
}

ensureDir(V2_PROD)

// ——— Shared CSS (no horizontal page scroll; equal columns) ———
const CSS = `
:root {
  --bg:#0f1419; --panel:#1a2332; --panel2:#243044; --text:#e7ecf3; --muted:#9aa8bc;
  --accent:#5b9fd4; --good:#3dbe7a; --warn:#e0a935; --bad:#e05d5d; --line:#2c3a4f;
  --chip:#2a384c; --max:1200px;
}
*{box-sizing:border-box;}
html,body{margin:0;padding:0;background:var(--bg);color:var(--text);
  font:14px/1.45 system-ui,Segoe UI,Roboto,sans-serif; overflow-x:hidden; max-width:100vw;}
a{color:var(--accent); word-break:break-word;}
header{padding:14px 16px;border-bottom:1px solid var(--line);background:var(--panel); position:sticky; top:0; z-index:20;}
.badge{display:inline-flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:8px;}
.ver{background:#1e3d2f;color:#8dffc1;padding:3px 10px;border-radius:999px;font-size:12px;font-weight:700;}
.task{background:#24304a;color:#a8c4ff;padding:3px 10px;border-radius:999px;font-size:12px;font-weight:600;}
h1{margin:0 0 6px;font-size:1.15rem; line-height:1.3; word-wrap:break-word;}
.meta{color:var(--muted);font-size:12px;display:flex;flex-wrap:wrap;gap:10px;}
.stats{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px;}
.stat{background:var(--panel2);padding:6px 10px;border-radius:8px;font-size:12px;}
.stat b{color:var(--accent);}
.changelog{margin:12px 16px;padding:12px 14px;background:var(--panel);border:1px solid var(--line);border-radius:10px; max-width:var(--max);}
.changelog h2{margin:0 0 8px;font-size:14px;color:var(--accent);}
.changelog ul{margin:0;padding-left:18px;color:var(--muted);}
.changelog li{margin:4px 0;}
.toolbar{display:flex;flex-wrap:wrap;gap:8px;padding:10px 16px;border-bottom:1px solid var(--line);align-items:center;}
input,select,button,textarea{
  background:var(--panel2);color:var(--text);border:1px solid var(--line);
  border-radius:6px;padding:7px 10px;font:inherit;max-width:100%;
}
button{cursor:pointer;}
button.primary{background:var(--accent);color:#041018;border:0;font-weight:600;}
.wrap{padding:12px 12px 40px; max-width:100%;}
/* Card list instead of wide table — no horizontal scroll */
.card-list{display:flex;flex-direction:column;gap:10px; max-width:var(--max); margin:0 auto;}
.row-card{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:12px; overflow:hidden;}
.row-top{display:flex;flex-wrap:wrap;gap:8px;align-items:flex-start;justify-content:space-between;margin-bottom:8px;}
.row-title{font-weight:600; font-size:14px; word-break:break-word; flex:1; min-width:0;}
.chips{display:flex;flex-wrap:wrap;gap:4px;}
.chip{display:inline-block;padding:2px 7px;border-radius:999px;background:var(--chip);font-size:11px; white-space:normal;}
.chip.matched{background:#1e3d2f;color:#8dffc1;}
.chip.low-confidence{background:#3d3420;color:#ffd888;}
.chip.unmatched-shopify{background:#3d2222;color:#ffb0b0;}
.chip.unmatched-vercel{background:#24304a;color:#a8c4ff;}
.chip.changed{background:#1e3d2f;color:#8dffc1;}
.chip.imgs{background:#2a384c;color:#c5d4e8;}
.chip.high{background:#4a2020;color:#ffb4b4;}
.chip.medium{background:#3d3420;color:#ffe0a0;}
/* Equal columns */
.cols{display:grid; grid-template-columns:1fr 1fr; gap:12px; min-width:0;}
@media (max-width:820px){ .cols{grid-template-columns:1fr;} }
.col{min-width:0; background:var(--panel2); border-radius:8px; padding:10px; overflow:hidden;}
.col h3{margin:0 0 8px; font-size:12px; text-transform:uppercase; letter-spacing:.04em; color:var(--muted);}
.col .name{font-weight:600; word-break:break-word;}
.col .sub{color:var(--muted); font-size:12px; word-break:break-word; margin:2px 0 8px;}
.snippet{font-size:12px; color:var(--text); word-wrap:break-word; overflow-wrap:anywhere; white-space:pre-wrap;
  max-height:7.5em; overflow:hidden; line-height:1.4;}
.thumbs{display:flex;flex-wrap:wrap;gap:4px;margin-top:8px;}
.thumbs img{width:40px;height:40px;object-fit:cover;border-radius:4px;background:#000;}
.change-box{margin-top:10px;padding:8px 10px;background:#121a24;border-radius:8px;border:1px solid var(--line); font-size:12px; word-break:break-word;}
.change-box b{color:var(--good);}
.delta{color:var(--warn);}
footer{padding:16px;color:var(--muted);border-top:1px solid var(--line);font-size:12px; word-break:break-word;}
/* Detail page */
.detail-header{padding:14px 16px;border-bottom:1px solid var(--line);background:var(--panel);}
.detail-grid{display:grid; grid-template-columns:1fr 1fr; gap:12px; padding:12px; max-width:var(--max); margin:0 auto;}
@media (max-width:820px){ .detail-grid{grid-template-columns:1fr;} }
.card{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:12px; min-width:0; overflow:hidden;}
.card h2{margin:0 0 8px;font-size:14px;color:var(--accent);}
.card pre, .body-text{
  white-space:pre-wrap; word-wrap:break-word; overflow-wrap:anywhere;
  background:#0c1016;padding:10px;border-radius:8px; max-height:280px; overflow:auto;
  font-size:13px; line-height:1.45; margin:0;
}
.imgs{display:flex;flex-wrap:wrap;gap:6px;}
.imgs img{width:72px;height:72px;object-fit:cover;border-radius:6px;background:#000;}
table{width:100%;border-collapse:collapse;font-size:12px; table-layout:fixed;}
th,td{border-bottom:1px solid var(--line);padding:6px;text-align:left;vertical-align:top; word-wrap:break-word; overflow-wrap:anywhere;}
.help{color:var(--muted);padding:8px 16px;font-size:12px; max-width:var(--max);}
`

function thumbs(paths, n = 4) {
  if (!paths?.length) return '<span class="chip">no images</span>'
  const show = paths.slice(0, n)
  return (
    `<div class="thumbs">` +
    show.map((p) => `<img src="${esc(p)}" loading="lazy" alt=""/>`).join('') +
    (paths.length > n ? `<span class="chip">+${paths.length - n}</span>` : '') +
    `</div>`
  )
}

function changeSummary(ch) {
  if (!ch) return '<span class="muted">No merge record (unmatched or unchanged path)</span>'
  const bits = []
  if (ch.descAfter) bits.push(`Description → <b>${ch.descAfter}</b> chars (was ${ch.descBefore})`)
  if (ch.titleAfter) bits.push(`Title → ${esc(ch.titleAfter)}`)
  if (ch.metaAfterLen) bits.push(`Meta → <b>${ch.metaAfterLen}</b> chars (was ${ch.metaBeforeLen})`)
  if (ch.imagesAdded) bits.push(`Images added → <b>+${ch.imagesAdded}</b>`)
  else bits.push(`Images added → 0 (dupes skipped or already present)`)
  return bits.join('<br/>')
}

// Detail pages
for (const r of rows) {
  const s = r.shopify
  const v = r.vercelNow
  const vBefore = r.vercelBefore
  const sImgs = (r.shopifyImages || []).slice(0, 24)
  const vImgs = (v?.images || []).slice(0, 24)

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${esc(VERSION.id)} · ${esc(s?.title || v?.productName || r.id)}</title>
<style>${CSS}</style>
</head>
<body>
<div class="detail-header">
  <div class="badge">
    <span class="ver">${esc(VERSION.id)}</span>
    <span class="task">${esc(VERSION.task)}</span>
  </div>
  <a href="../audit.html">← Back to matrix</a>
  <h1>${esc(s?.title || v?.productName || 'Product')}</h1>
  <div class="meta">
    <span>ID ${esc(r.id)}</span>
    <span class="chip ${esc(r.status)}">${esc(r.status)}</span>
    <span>${r.confidence || 0}% · ${esc(r.method || '—')}</span>
  </div>
  <div class="change-box" style="margin-top:10px">${changeSummary(r.change)}</div>
</div>

<div class="detail-grid">
  <div class="card">
    <h2>Shopify (source)</h2>
    ${
      s
        ? `<div class="name">${esc(s.title)}</div>
      <div class="sub">${esc(s.handle)} · ${esc(s.productType)} · ${esc(s.status)}</div>
      <p class="sub">SEO title: ${esc(s.seo?.title || '—')}</p>
      <p class="sub">SEO meta: ${esc(s.seo?.description || '—')}</p>
      <h3 style="font-size:12px;color:var(--muted)">Description</h3>
      <div class="body-text">${esc(s.description || '')}</div>
      <h3 style="font-size:12px;color:var(--muted);margin-top:10px">Images (${sImgs.length} shown / ${s.imageCount || 0})</h3>
      <div class="imgs">${sImgs.map((p) => `<img src="${esc(p)}" loading="lazy" alt=""/>`).join('') || '—'}</div>
      <h3 style="font-size:12px;color:var(--muted);margin-top:10px">Variants (sample)</h3>
      <table><thead><tr><th>Title</th><th>SKU</th><th>Price</th></tr></thead>
      <tbody>${(s.variants || [])
        .slice(0, 12)
        .map((x) => `<tr><td>${esc(x.title)}</td><td>${esc(x.sku)}</td><td>${esc(x.price)}</td></tr>`)
        .join('')}</tbody></table>`
        : '<p class="sub">No Shopify product</p>'
    }
  </div>
  <div class="card">
    <h2>Vercel (after merge)</h2>
    ${
      v
        ? `<div class="name">${esc(v.productName)}</div>
      <div class="sub">${esc(v.slug)} · ${esc(v.category)} · dir: ${esc(v.dirName)}</div>
      <p class="sub"><b>Title now:</b> ${esc(v.title || '—')}</p>
      <p class="sub"><b>Meta now:</b> ${esc(v.metaDescription || '—')}</p>
      ${
        vBefore
          ? `<p class="sub"><b>Title before audit snapshot:</b> ${esc(vBefore.title || '—')}</p>
      <p class="sub"><b>Desc before:</b> ${(vBefore.description || '').length} chars → <b>now</b> ${(v.description || '').length} chars</p>`
          : ''
      }
      <h3 style="font-size:12px;color:var(--muted)">Description (live on disk)</h3>
      <div class="body-text">${esc(v.description || '')}</div>
      <h3 style="font-size:12px;color:var(--muted);margin-top:10px">Images now (${v.imageCount || 0})</h3>
      <div class="imgs">${vImgs.map((p) => `<img src="${esc(p)}" loading="lazy" alt=""/>`).join('') || '—'}</div>`
        : '<p class="sub">No Vercel product</p>'
    }
  </div>
</div>
<footer>${esc(VERSION.id)} · ${esc(VERSION.task)} · ${esc(VERSION.title)} · ${esc(VERSION.generatedAt)}</footer>
</body></html>`
  write(path.join(V2_PROD, `${r.id}.html`), html)
}

// Matrix page
const dataJson = JSON.stringify(
  rows.map((r) => ({
    id: r.id,
    status: r.status,
    confidence: r.confidence,
    method: r.method,
    sTitle: r.shopify?.title || '',
    sHandle: r.shopify?.handle || '',
    sDesc: (r.shopify?.description || '').slice(0, 280),
    sImgCount: r.shopify?.imageCount || 0,
    sImgs: (r.shopifyImages || []).slice(0, 4),
    vName: r.vercelNow?.productName || r.vercelBefore?.productName || '',
    vSlug: r.vercelNow?.slug || r.vercelBefore?.slug || '',
    vDesc: (r.vercelNow?.description || '').slice(0, 280),
    vTitle: r.vercelNow?.title || '',
    vMeta: r.vercelNow?.metaDescription || '',
    vImgCount: r.vercelNow?.imageCount ?? r.vercelBefore?.imageCount ?? 0,
    vImgs: (r.vercelNow?.images || []).slice(0, 4),
    change: r.change,
    gapFields: (r.gaps || []).slice(0, 6).map((g) => g.field),
  })),
)

const matrix = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${esc(VERSION.id)} · ${esc(VERSION.task)}</title>
<style>${CSS}</style>
</head>
<body>
<header>
  <div class="badge">
    <span class="ver">${esc(VERSION.id)}</span>
    <span class="task">${esc(VERSION.task)}</span>
  </div>
  <h1>${esc(VERSION.title)}</h1>
  <div class="meta">
    <span>Generated ${esc(VERSION.generatedAt)}</span>
    <span>Earlier matrix: <a href="../v1/audit.html">v1</a> (if archived)</span>
  </div>
  <div class="stats">
    <div class="stat">Matched <b>${stats.matched}</b></div>
    <div class="stat">Copy updated <b>${stats.updatedCopy}</b></div>
    <div class="stat">Images added (merge) <b>${stats.imagesAddedTotal}</b></div>
    <div class="stat">Shopify only <b>${stats.shopifyOnly}</b></div>
    <div class="stat">Vercel only <b>${stats.vercelOnly}</b></div>
  </div>
</header>

<section class="changelog">
  <h2>What this version shows (done in Task 1)</h2>
  <ul>
    ${VERSION.changelog.map((c) => `<li>${esc(c)}</li>`).join('')}
  </ul>
</section>

<div class="toolbar">
  <input id="q" placeholder="Filter title, handle, slug…" style="flex:1;min-width:180px"/>
  <select id="status">
    <option value="">All statuses</option>
    <option value="matched">Matched</option>
    <option value="low-confidence">Low confidence</option>
    <option value="unmatched-shopify">Shopify only</option>
    <option value="unmatched-vercel">Vercel only</option>
  </select>
  <select id="changed">
    <option value="">All changes</option>
    <option value="yes">Had merge changes</option>
    <option value="imgs">Images added</option>
  </select>
</div>
<p class="help">
  Equal left/right columns (Shopify | Vercel after merge). No wide table — cards stack on small screens.
  Open a product for full descriptions and image grids. Layout is capped so you should not need to scroll sideways.
</p>
<div class="wrap">
  <div class="card-list" id="list"></div>
</div>
<footer>${esc(VERSION.id)} · ${esc(VERSION.task)} · files under <code>review/v2/</code></footer>
<script>
const ROWS = ${dataJson};
function esc(s){return String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function thumbs(paths){
  if(!paths||!paths.length) return '<span class="chip">no imgs</span>';
  return '<div class="thumbs">'+paths.map(p=>'<img src="'+esc(p)+'" loading="lazy" alt=""/>').join('')+'</div>';
}
function changeHtml(ch){
  if(!ch) return '<span style="color:var(--muted)">No merge row</span>';
  let t = 'Desc '+ch.descBefore+'→<b>'+ch.descAfter+'</b> chars';
  t += ' · Meta '+ch.metaBeforeLen+'→<b>'+ch.metaAfterLen+'</b>';
  t += ' · Imgs <b>+'+(ch.imagesAdded||0)+'</b>';
  return t;
}
function render(){
  const q=document.getElementById('q').value.toLowerCase().trim();
  const st=document.getElementById('status').value;
  const chf=document.getElementById('changed').value;
  const list=document.getElementById('list');
  list.innerHTML='';
  for (const r of ROWS){
    if(st && r.status!==st) continue;
    if(chf==='yes' && !r.change) continue;
    if(chf==='imgs' && !(r.change && r.change.imagesAdded>0)) continue;
    const blob=[r.sTitle,r.sHandle,r.vName,r.vSlug,r.vTitle].join(' ').toLowerCase();
    if(q && !blob.includes(q)) continue;
    const el=document.createElement('article');
    el.className='row-card';
    el.innerHTML = \`
      <div class="row-top">
        <div class="row-title"><a href="products/\${esc(r.id)}.html">\${esc(r.sTitle||r.vName||r.id)}</a></div>
        <div class="chips">
          <span class="chip \${esc(r.status)}">\${esc(r.status)}</span>
          <span class="chip">\${r.confidence||0}%</span>
          \${r.change?'<span class="chip changed">merged</span>':''}
          \${r.change&&r.change.imagesAdded?'<span class="chip imgs">+'+r.change.imagesAdded+' imgs</span>':''}
        </div>
      </div>
      <div class="cols">
        <div class="col">
          <h3>Shopify</h3>
          <div class="name">\${esc(r.sTitle||'—')}</div>
          <div class="sub">\${esc(r.sHandle)} · imgs \${r.sImgCount}</div>
          <div class="snippet">\${esc(r.sDesc||'')}</div>
          \${thumbs(r.sImgs)}
        </div>
        <div class="col">
          <h3>Vercel (after merge)</h3>
          <div class="name">\${esc(r.vName||'—')}</div>
          <div class="sub">\${esc(r.vSlug)} · imgs \${r.vImgCount}</div>
          <div class="sub">\${esc(r.vTitle||'')}</div>
          <div class="snippet">\${esc(r.vDesc||'')}</div>
          \${thumbs(r.vImgs)}
        </div>
      </div>
      <div class="change-box">\${changeHtml(r.change)}
        \${r.gapFields&&r.gapFields.length?'<div style="margin-top:6px">Gaps: '+r.gapFields.map(f=>'<span class="chip">'+esc(f)+'</span>').join(' ')+'</div>':''}
      </div>
    \`;
    list.appendChild(el);
  }
}
document.getElementById('q').addEventListener('input', render);
document.getElementById('status').addEventListener('change', render);
document.getElementById('changed').addEventListener('change', render);
render();
</script>
</body></html>`

write(path.join(V2, 'audit.html'), matrix)

// Archive v1 if old audit exists and v1 not yet created
const oldAudit = path.join(REVIEW, 'audit.html')
const v1Dir = path.join(REVIEW, 'v1')
if (fs.existsSync(oldAudit) && !fs.existsSync(path.join(v1Dir, 'audit.html'))) {
  ensureDir(v1Dir)
  // copy old audit + products as v1 snapshot
  fs.copyFileSync(oldAudit, path.join(v1Dir, 'audit.html'))
  const oldProd = path.join(REVIEW, 'products')
  if (fs.existsSync(oldProd)) {
    const dest = path.join(v1Dir, 'products')
    ensureDir(dest)
    for (const f of fs.readdirSync(oldProd)) {
      fs.copyFileSync(path.join(oldProd, f), path.join(dest, f))
    }
  }
  // fix note at top of v1 - leave as-is historical
}

// Latest pointer pages
const latest = `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/>
<meta http-equiv="refresh" content="0; url=v2/audit.html"/>
<title>Audit latest → v2</title>
<style>body{font:14px system-ui;background:#0f1419;color:#e7ecf3;padding:24px}a{color:#5b9fd4}</style>
</head><body>
<p><b>Latest review:</b> <a href="v2/audit.html">v2 / Task 1 — Content + image merge</a></p>
<p>Versions: <a href="v2/audit.html">v2</a> · <a href="v1/audit.html">v1</a> (original matrix) · <a href="VERSIONS.html">VERSIONS</a></p>
</body></html>`
write(path.join(REVIEW, 'audit.html'), latest)

const versionsHtml = `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Site Audit — HTML versions</title>
<style>
body{margin:0;font:15px/1.5 system-ui;background:#0f1419;color:#e7ecf3;padding:24px;max-width:720px}
a{color:#5b9fd4} .card{background:#1a2332;border:1px solid #2c3a4f;border-radius:10px;padding:16px;margin:12px 0}
.ver{color:#8dffc1;font-weight:700} .muted{color:#9aa8bc;font-size:13px}
</style></head><body>
<h1>Site Audit Data — Review HTML versions</h1>
<p class="muted">Task tracking for visual review files under <code>Site Audit Data/review/</code></p>

<div class="card">
  <div class="ver">v2</div>
  <p><b>Task 1</b> — Content + image merge review</p>
  <p class="muted">${esc(VERSION.generatedAt)}</p>
  <ul>
    ${VERSION.changelog.map((c) => `<li>${esc(c)}</li>`).join('')}
  </ul>
  <p><a href="v2/audit.html">Open v2 audit.html</a></p>
</div>

<div class="card">
  <div class="ver">v1</div>
  <p><b>Task 1</b> — Initial match matrix (pre–content merge UI)</p>
  <p class="muted">Archived when v2 was generated. Wide table layout; use v2 for balanced columns.</p>
  <p><a href="v1/audit.html">Open v1 audit.html</a></p>
</div>

<p><a href="audit.html">Latest pointer</a> → currently v2</p>
</body></html>`
write(path.join(REVIEW, 'VERSIONS.html'), versionsHtml)

write(
  path.join(REVIEW, 'VERSIONS.md'),
  `# Review HTML versions

| Version | Task | File | Notes |
|--------|------|------|--------|
| **v2** (latest) | Task 1 — Content + image merge | [v2/audit.html](v2/audit.html) | Balanced columns; shows merge results |
| v1 | Task 1 — Initial match matrix | [v1/audit.html](v1/audit.html) | Archived original matrix |

Generated: ${VERSION.generatedAt}

## v2 changelog
${VERSION.changelog.map((c) => `- ${c}`).join('\n')}
`,
)

// machine-readable version stamp
write(
  path.join(V2, 'version.json'),
  JSON.stringify({ ...VERSION, stats, path: 'review/v2/audit.html' }, null, 2),
)

console.log(
  JSON.stringify(
    {
      version: VERSION.id,
      matrix: path.join(V2, 'audit.html'),
      details: rows.length,
      stats,
    },
    null,
    2,
  ),
)
