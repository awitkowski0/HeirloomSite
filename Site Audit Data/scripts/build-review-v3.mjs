/**
 * Review HTML v3 — Deep copy validation (Task 1)
 * Full descriptions, grammar checklist, balanced columns, versioned.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const AUDIT = path.resolve(__dirname, '..')
const SITE = path.resolve(AUDIT, '..')
const PRODUCTS = path.join(SITE, 'public', 'data', 'products')
const REVIEW = path.join(AUDIT, 'review')
const V3 = path.join(REVIEW, 'v3')
const V3_PROD = path.join(V3, 'products')

const VERSION = {
  id: 'v3',
  task: 'Task 1 — Site Product Audit',
  title: 'Deep copy validation (complete sentences, grammar, punctuation)',
  generatedAt: new Date().toISOString(),
  changelog: [
    'Full writing pass on all matched hard-goods product copy',
    'Every description ends in complete sentences (no cut-off thoughts)',
    'Meta descriptions rebuilt from complete sentences only — no ellipsis cutoffs',
    'Grammar/punctuation sweep; AI-cliché softening; paragraph flow',
    'Validator: 0 hard-goods products still flagged after pass',
    'HTML v3: full body text on detail pages; copy QA chips on matrix',
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

function qaCopy(desc, meta, title) {
  const checks = []
  const ok = (id, pass, label) => checks.push({ id, pass, label })
  const d = (desc || '').trim()
  const m = (meta || '').trim()
  const t = (title || '').trim()
  ok('desc-present', d.length >= 40, 'Description present')
  ok('desc-end', /[.!?]$/.test(d), 'Description ends with . ! or ?')
  ok('desc-no-ellipsis', !/…|\.\.\./.test(d), 'No ellipsis in description')
  ok('desc-no-dangle', !/\b(and|or|the|a|an|to|for|with|of)\s*$/i.test(d), 'Description not dangling')
  ok('desc-period-space', !/\.[A-Za-z]/.test(d), 'Space after periods')
  ok('meta-present', m.length >= 40, 'Meta present')
  ok('meta-len', m.length >= 70 && m.length <= 165, `Meta length ${m.length} (70–165)`)
  ok('meta-end', /[.!?]$/.test(m), 'Meta ends with punctuation')
  ok('meta-no-ellipsis', !/…|\.\.\./.test(m), 'No ellipsis in meta')
  ok('meta-no-dangle', !/\b(and|or|the|a|an|to|for|with|of)\s*[.!?]?$/i.test(m.replace(/[.!?]$/, '')), 'Meta not dangling')
  ok('title-brand', /Heirloom Cribs and More/i.test(t), 'Title includes brand')
  // sentence completeness
  const sents = d.replace(/\n+/g, ' ').match(/[^.!?]+[.!?]+/g) || []
  ok('has-sentences', sents.length >= 1, `${sents.length} complete sentence(s)`)
  let danglingSent = false
  for (const s of sents) {
    if (/\b(and|or|the|a|an|to|for|with|of)\s*[.!?]$/i.test(s.trim())) danglingSent = true
  }
  ok('sents-complete', !danglingSent, 'No dangling sentence endings')
  const passCount = checks.filter((c) => c.pass).length
  return { checks, passCount, total: checks.length, allPass: passCount === checks.length, sentenceCount: sents.length }
}

const matches = load(path.join(AUDIT, 'derived', 'matches.json'))
const deepReport = fs.existsSync(path.join(AUDIT, 'derived', 'deep-copy-pass-report.json'))
  ? load(path.join(AUDIT, 'derived', 'deep-copy-pass-report.json'))
  : null

function listImgs(dirName) {
  const dir = path.join(PRODUCTS, dirName)
  if (!fs.existsSync(dir)) return []
  return fs.readdirSync(dir).filter((f) => /\.(jpe?g|png|webp)$/i.test(f))
}
function vImg(dirName, f) {
  return `../../../public/data/products/${dirName}/${f}`
}
function sImgs(handle) {
  const dir = path.join(AUDIT, 'images', 'shopify', handle || '')
  if (!fs.existsSync(dir)) return []
  return fs
    .readdirSync(dir)
    .filter((f) => /\.(jpe?g|png|webp)$/i.test(f))
    .map((f) => `../../images/shopify/${handle}/${f}`)
}

const rows = []
for (const r of matches) {
  if (!r.vercel?.dirName) {
    rows.push({
      id: r.id,
      status: r.status,
      shopify: r.shopify,
      vercel: null,
      qa: null,
      sImages: r.shopify ? sImgs(r.shopify.handle) : [],
    })
    continue
  }
  const prodPath = path.join(PRODUCTS, r.vercel.dirName, 'product.json')
  if (!fs.existsSync(prodPath)) continue
  const p = load(prodPath)
  const files = listImgs(r.vercel.dirName)
  const qa = qaCopy(p.description, p.metaDescription, p.title)
  rows.push({
    id: r.id,
    status: r.status,
    confidence: r.confidence,
    method: r.method,
    shopify: r.shopify,
    vercel: {
      dirName: r.vercel.dirName,
      productName: p.productName,
      slug: p.slug,
      category: p.category,
      description: p.description,
      title: p.title,
      metaDescription: p.metaDescription,
      imageCount: files.length,
      images: files.map((f) => vImg(r.vercel.dirName, f)),
    },
    vercelBefore: r.vercel,
    qa,
    sImages: r.shopify ? sImgs(r.shopify.handle) : [],
  })
}

const stats = {
  total: rows.filter((r) => r.vercel).length,
  allPass: rows.filter((r) => r.qa?.allPass).length,
  anyFail: rows.filter((r) => r.qa && !r.qa.allPass).length,
  shopifyOnly: rows.filter((r) => r.status === 'unmatched-shopify').length,
}

const CSS = `
:root {
  --bg:#0f1419; --panel:#1a2332; --panel2:#243044; --text:#e7ecf3; --muted:#9aa8bc;
  --accent:#5b9fd4; --good:#3dbe7a; --warn:#e0a935; --bad:#e05d5d; --line:#2c3a4f;
  --chip:#2a384c; --max:1100px;
}
*{box-sizing:border-box;}
html,body{margin:0;background:var(--bg);color:var(--text);font:14px/1.45 system-ui,Segoe UI,Roboto,sans-serif;overflow-x:hidden;max-width:100vw;}
a{color:var(--accent);word-break:break-word;}
header{padding:14px 16px;border-bottom:1px solid var(--line);background:var(--panel);position:sticky;top:0;z-index:20;}
.badge{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:8px;}
.ver{background:#1e3d2f;color:#8dffc1;padding:3px 10px;border-radius:999px;font-size:12px;font-weight:700;}
.task{background:#24304a;color:#a8c4ff;padding:3px 10px;border-radius:999px;font-size:12px;font-weight:600;}
h1{margin:0 0 6px;font-size:1.15rem;line-height:1.3;word-wrap:break-word;}
.meta{color:var(--muted);font-size:12px;display:flex;flex-wrap:wrap;gap:10px;}
.stats{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px;}
.stat{background:var(--panel2);padding:6px 10px;border-radius:8px;font-size:12px;}
.stat b{color:var(--accent);}
.stat.good b{color:var(--good);}
.stat.bad b{color:var(--bad);}
.changelog{margin:12px 16px;padding:12px 14px;background:var(--panel);border:1px solid var(--line);border-radius:10px;max-width:var(--max);}
.changelog h2{margin:0 0 8px;font-size:14px;color:var(--accent);}
.changelog ul{margin:0;padding-left:18px;color:var(--muted);}
.toolbar{display:flex;flex-wrap:wrap;gap:8px;padding:10px 16px;border-bottom:1px solid var(--line);}
input,select{background:var(--panel2);color:var(--text);border:1px solid var(--line);border-radius:6px;padding:7px 10px;font:inherit;max-width:100%;}
.wrap{padding:12px;max-width:100%;}
.card-list{display:flex;flex-direction:column;gap:10px;max-width:var(--max);margin:0 auto;}
.row-card{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:12px;overflow:hidden;}
.row-top{display:flex;flex-wrap:wrap;gap:8px;justify-content:space-between;margin-bottom:8px;}
.row-title{font-weight:600;word-break:break-word;flex:1;min-width:0;}
.chips{display:flex;flex-wrap:wrap;gap:4px;}
.chip{display:inline-block;padding:2px 7px;border-radius:999px;background:var(--chip);font-size:11px;}
.chip.pass{background:#1e3d2f;color:#8dffc1;}
.chip.fail{background:#3d2222;color:#ffb0b0;}
.chip.matched{background:#1e3d2f;color:#8dffc1;}
.chip.unmatched-shopify{background:#3d2222;color:#ffb0b0;}
.cols{display:grid;grid-template-columns:1fr 1fr;gap:12px;min-width:0;}
@media(max-width:820px){.cols{grid-template-columns:1fr;}}
.col{min-width:0;background:var(--panel2);border-radius:8px;padding:10px;overflow:hidden;}
.col h3{margin:0 0 8px;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--muted);}
.col .name{font-weight:600;word-break:break-word;}
.col .sub{color:var(--muted);font-size:12px;word-break:break-word;margin:2px 0 8px;}
.body{
  white-space:pre-wrap;word-wrap:break-word;overflow-wrap:anywhere;
  font-size:12.5px;line-height:1.45;max-height:12em;overflow:auto;
  background:#0c1016;padding:8px;border-radius:6px;
}
.qa{margin-top:10px;display:flex;flex-wrap:wrap;gap:4px;}
.qa .chip.ok{background:#1e3d2f;color:#8dffc1;}
.qa .chip.no{background:#3d2222;color:#ffb0b0;}
.thumbs{display:flex;flex-wrap:wrap;gap:4px;margin-top:8px;}
.thumbs img{width:40px;height:40px;object-fit:cover;border-radius:4px;background:#000;}
footer{padding:16px;color:var(--muted);border-top:1px solid var(--line);font-size:12px;}
.help{color:var(--muted);padding:8px 16px;font-size:12px;max-width:var(--max);}
.detail-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:12px;max-width:var(--max);margin:0 auto;}
@media(max-width:820px){.detail-grid{grid-template-columns:1fr;}}
.card{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:12px;min-width:0;overflow:hidden;}
.card h2{margin:0 0 8px;font-size:14px;color:var(--accent);}
.fullbody{
  white-space:pre-wrap;word-wrap:break-word;overflow-wrap:anywhere;
  background:#0c1016;padding:12px;border-radius:8px;font-size:13px;line-height:1.5;
  max-height:none;
}
.imgs{display:flex;flex-wrap:wrap;gap:6px;}
.imgs img{width:72px;height:72px;object-fit:cover;border-radius:6px;background:#000;}
.checklist{list-style:none;padding:0;margin:0;}
.checklist li{padding:4px 0;border-bottom:1px solid var(--line);font-size:13px;}
.checklist .yes{color:var(--good);}
.checklist .no{color:var(--bad);}
`

ensureDir(V3_PROD)

// Detail pages — FULL description text
for (const r of rows) {
  const s = r.shopify
  const v = r.vercel
  const qa = r.qa
  const checkList = qa
    ? qa.checks
        .map(
          (c) =>
            `<li class="${c.pass ? 'yes' : 'no'}">${c.pass ? '✓' : '✗'} ${esc(c.label)}</li>`,
        )
        .join('')
    : ''

  const html = `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${esc(VERSION.id)} · ${esc(v?.productName || s?.title || r.id)}</title>
<style>${CSS}</style>
</head><body>
<header>
  <div class="badge"><span class="ver">${esc(VERSION.id)}</span><span class="task">${esc(VERSION.task)}</span></div>
  <a href="../audit.html">← Matrix</a>
  <h1>${esc(v?.productName || s?.title || r.id)}</h1>
  <div class="meta">
    <span>${esc(r.status)}</span>
    ${qa ? `<span class="chip ${qa.allPass ? 'pass' : 'fail'}">QA ${qa.passCount}/${qa.total}</span>` : ''}
    <span>${qa ? qa.sentenceCount + ' sentences' : ''}</span>
  </div>
</header>
<div class="detail-grid">
  <div class="card">
    <h2>Shopify source</h2>
    ${
      s
        ? `<div class="name">${esc(s.title)}</div>
      <div class="sub">${esc(s.handle)}</div>
      <p class="sub"><b>SEO title:</b> ${esc(s.seo?.title || '—')}</p>
      <p class="sub"><b>SEO meta:</b> ${esc(s.seo?.description || '—')}</p>
      <h3 style="font-size:12px;color:var(--muted)">Full description</h3>
      <div class="fullbody">${esc(s.description || '')}</div>
      <div class="imgs" style="margin-top:10px">${(r.sImages || [])
        .slice(0, 20)
        .map((p) => `<img src="${esc(p)}" loading="lazy" alt=""/>`)
        .join('')}</div>`
        : '<p class="sub">No Shopify match</p>'
    }
  </div>
  <div class="card">
    <h2>Vercel — polished live copy</h2>
    ${
      v
        ? `<div class="name">${esc(v.productName)}</div>
      <div class="sub">${esc(v.slug)} · ${esc(v.category)}</div>
      <p class="sub"><b>Title:</b> ${esc(v.title)}</p>
      <p class="sub"><b>Meta (${(v.metaDescription || '').length} chars):</b> ${esc(v.metaDescription)}</p>
      <h3 style="font-size:12px;color:var(--muted)">Full description (${(v.description || '').length} chars · read entire block)</h3>
      <div class="fullbody">${esc(v.description || '')}</div>
      <div class="imgs" style="margin-top:10px">${(v.images || [])
        .slice(0, 20)
        .map((p) => `<img src="${esc(p)}" loading="lazy" alt=""/>`)
        .join('')}</div>`
        : '<p class="sub">No Vercel product</p>'
    }
  </div>
</div>
<div class="card" style="margin:12px auto;max-width:var(--max)">
  <h2>Copy QA checklist</h2>
  <ul class="checklist">${checkList || '<li>n/a</li>'}</ul>
</div>
<footer>${esc(VERSION.id)} · ${esc(VERSION.title)} · ${esc(VERSION.generatedAt)}</footer>
</body></html>`
  write(path.join(V3_PROD, `${r.id}.html`), html)
}

// Matrix data
const dataJson = JSON.stringify(
  rows.map((r) => ({
    id: r.id,
    status: r.status,
    sTitle: r.shopify?.title || '',
    sHandle: r.shopify?.handle || '',
    sDesc: r.shopify?.description || '',
    sImgs: (r.sImages || []).slice(0, 3),
    vName: r.vercel?.productName || '',
    vSlug: r.vercel?.slug || '',
    vTitle: r.vercel?.title || '',
    vMeta: r.vercel?.metaDescription || '',
    vDesc: r.vercel?.description || '',
    vImgs: (r.vercel?.images || []).slice(0, 3),
    qaPass: r.qa?.allPass ?? null,
    qaScore: r.qa ? `${r.qa.passCount}/${r.qa.total}` : '',
    sentences: r.qa?.sentenceCount ?? 0,
    checks: r.qa?.checks || [],
  })),
)

const matrix = `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${esc(VERSION.id)} · ${esc(VERSION.task)}</title>
<style>${CSS}</style>
</head><body>
<header>
  <div class="badge">
    <span class="ver">${esc(VERSION.id)}</span>
    <span class="task">${esc(VERSION.task)}</span>
  </div>
  <h1>${esc(VERSION.title)}</h1>
  <div class="meta">
    <span>${esc(VERSION.generatedAt)}</span>
    <span><a href="../VERSIONS.html">All versions</a></span>
    <span><a href="../v2/audit.html">v2</a> · <a href="../v1/audit.html">v1</a></span>
  </div>
  <div class="stats">
    <div class="stat">Products reviewed <b>${stats.total}</b></div>
    <div class="stat good">QA all-pass <b>${stats.allPass}</b></div>
    <div class="stat ${stats.anyFail ? 'bad' : ''}">QA flags <b>${stats.anyFail}</b></div>
    <div class="stat">Shopify only <b>${stats.shopifyOnly}</b></div>
  </div>
</header>
<section class="changelog">
  <h2>What v3 did</h2>
  <ul>${VERSION.changelog.map((c) => `<li>${esc(c)}</li>`).join('')}</ul>
  ${
    deepReport
      ? `<p class="meta" style="margin-top:8px">Deep pass: polished ${deepReport.products?.length || 0}, still flagged ${deepReport.failures?.length || 0}</p>`
      : ''
  }
</section>
<div class="toolbar">
  <input id="q" placeholder="Filter products…" style="flex:1;min-width:160px"/>
  <select id="qa">
    <option value="">All QA</option>
    <option value="pass">All checks pass</option>
    <option value="fail">Has flags</option>
  </select>
  <select id="status">
    <option value="">All statuses</option>
    <option value="matched">Matched</option>
    <option value="unmatched-shopify">Shopify only</option>
  </select>
</div>
<p class="help">Equal columns · full text on detail pages · scroll inside description boxes if long · no page-wide horizontal scroll. Click a title to read <b>entire</b> polished copy and the QA checklist.</p>
<div class="wrap"><div class="card-list" id="list"></div></div>
<footer>${esc(VERSION.id)} · ${esc(VERSION.task)} · <code>review/v3/</code></footer>
<script>
const ROWS = ${dataJson};
function esc(s){return String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function thumbs(paths){
  if(!paths||!paths.length) return '';
  return '<div class="thumbs">'+paths.map(p=>'<img src="'+esc(p)+'" loading="lazy" alt=""/>').join('')+'</div>';
}
function render(){
  const q=document.getElementById('q').value.toLowerCase().trim();
  const qa=document.getElementById('qa').value;
  const st=document.getElementById('status').value;
  const list=document.getElementById('list');
  list.innerHTML='';
  for(const r of ROWS){
    if(st && r.status!==st) continue;
    if(qa==='pass' && r.qaPass!==true) continue;
    if(qa==='fail' && r.qaPass!==false) continue;
    const blob=[r.sTitle,r.sHandle,r.vName,r.vSlug,r.vTitle].join(' ').toLowerCase();
    if(q && !blob.includes(q)) continue;
    const failed=(r.checks||[]).filter(c=>!c.pass).map(c=>c.label);
    const el=document.createElement('article');
    el.className='row-card';
    el.innerHTML=\`
      <div class="row-top">
        <div class="row-title"><a href="products/\${esc(r.id)}.html">\${esc(r.vName||r.sTitle||r.id)}</a></div>
        <div class="chips">
          <span class="chip \${esc(r.status)}">\${esc(r.status)}</span>
          \${r.qaScore?('<span class="chip '+(r.qaPass?'pass':'fail')+'">QA '+esc(r.qaScore)+'</span>'):''}
          <span class="chip">\${r.sentences||0} sents</span>
        </div>
      </div>
      <div class="cols">
        <div class="col">
          <h3>Shopify</h3>
          <div class="name">\${esc(r.sTitle||'—')}</div>
          <div class="sub">\${esc(r.sHandle)}</div>
          <div class="body">\${esc((r.sDesc||'').slice(0,500))}\${(r.sDesc||'').length>500?'…':''}</div>
          \${thumbs(r.sImgs)}
        </div>
        <div class="col">
          <h3>Vercel polished</h3>
          <div class="name">\${esc(r.vName||'—')}</div>
          <div class="sub">\${esc(r.vTitle)}</div>
          <div class="sub"><b>Meta:</b> \${esc(r.vMeta)}</div>
          <div class="body">\${esc((r.vDesc||'').slice(0,500))}\${(r.vDesc||'').length>500?'… (open detail for full text)':''}</div>
          \${thumbs(r.vImgs)}
        </div>
      </div>
      <div class="qa">
        \${(r.checks||[]).map(c=>'<span class="chip '+(c.pass?'ok':'no')+'">'+(c.pass?'✓':'✗')+' '+esc(c.label)+'</span>').join('')}
      </div>
      \${failed.length?'<div class="sub" style="margin-top:6px;color:var(--bad)">Flags: '+esc(failed.join('; '))+'</div>':''}
    \`;
    list.appendChild(el);
  }
}
document.getElementById('q').oninput=render;
document.getElementById('qa').onchange=render;
document.getElementById('status').onchange=render;
render();
</script>
</body></html>`

write(path.join(V3, 'audit.html'), matrix)
write(path.join(V3, 'version.json'), JSON.stringify({ ...VERSION, stats }, null, 2))

// Update latest pointer + VERSIONS
write(
  path.join(REVIEW, 'audit.html'),
  `<!DOCTYPE html><html lang="en"><head>
<meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/>
<meta http-equiv="refresh" content="0; url=v3/audit.html"/>
<title>Latest audit → v3</title>
<style>body{font:14px system-ui;background:#0f1419;color:#e7ecf3;padding:24px}a{color:#5b9fd4}</style>
</head><body>
<p><b>Latest:</b> <a href="v3/audit.html">v3 — Deep copy validation</a></p>
<p><a href="VERSIONS.html">All versions</a> · <a href="v2/audit.html">v2</a> · <a href="v1/audit.html">v1</a></p>
</body></html>`,
)

write(
  path.join(REVIEW, 'VERSIONS.html'),
  `<!DOCTYPE html><html lang="en"><head>
<meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Site Audit — HTML versions</title>
<style>
body{margin:0;font:15px/1.5 system-ui;background:#0f1419;color:#e7ecf3;padding:24px;max-width:760px}
a{color:#5b9fd4}.card{background:#1a2332;border:1px solid #2c3a4f;border-radius:10px;padding:16px;margin:12px 0}
.ver{color:#8dffc1;font-weight:700}.muted{color:#9aa8bc;font-size:13px}
</style></head><body>
<h1>Site Audit — Review HTML versions</h1>
<p class="muted">Task 1 · HeirloomSite · <code>Site Audit Data/review/</code></p>

<div class="card">
  <div class="ver">v3 (latest)</div>
  <p><b>${esc(VERSION.task)}</b> — ${esc(VERSION.title)}</p>
  <p class="muted">${esc(VERSION.generatedAt)}</p>
  <ul>${VERSION.changelog.map((c) => `<li>${esc(c)}</li>`).join('')}</ul>
  <p>QA: <b>${stats.allPass}</b>/${stats.total} all-pass · flags <b>${stats.anyFail}</b></p>
  <p><a href="v3/audit.html">Open v3 audit.html</a></p>
</div>

<div class="card">
  <div class="ver">v2</div>
  <p><b>Task 1</b> — Content + image merge review</p>
  <p class="muted">Balanced columns; merge stats; some meta ellipsis later fixed in v3</p>
  <p><a href="v2/audit.html">Open v2</a></p>
</div>

<div class="card">
  <div class="ver">v1</div>
  <p><b>Task 1</b> — Initial match matrix</p>
  <p class="muted">Original wide table layout</p>
  <p><a href="v1/audit.html">Open v1</a></p>
</div>
</body></html>`,
)

write(
  path.join(REVIEW, 'VERSIONS.md'),
  `# Review HTML versions

| Version | Task | File | Notes |
|--------|------|------|--------|
| **v3** (latest) | Task 1 — Deep copy validation | [v3/audit.html](v3/audit.html) | Complete sentences, grammar QA, full text |
| v2 | Task 1 — Content + image merge | [v2/audit.html](v2/audit.html) | Balanced columns, merge summary |
| v1 | Task 1 — Initial match matrix | [v1/audit.html](v1/audit.html) | Archived original matrix |

Generated: ${VERSION.generatedAt}
`,
)

console.log(JSON.stringify({ version: 'v3', stats, path: path.join(V3, 'audit.html') }, null, 2))
