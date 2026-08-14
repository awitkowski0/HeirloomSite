import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = path.dirname(fileURLToPath(import.meta.url))
let s = fs.readFileSync(path.join(dir, 'build-review-v3.mjs'), 'utf8')

s = s.replaceAll("path.join(REVIEW, 'v3')", "path.join(REVIEW, 'v5')")
s = s.replaceAll("id: 'v3'", "id: 'v5'")
s = s.replace(
  'Deep copy validation (complete sentences, grammar, punctuation)',
  'Team review v5: titles, natural voice, bed size, image dedupe',
)
s = s.replace(
  `changelog: [
    'Full writing pass on all matched hard-goods product copy',
    'Every description ends in complete sentences (no cut-off thoughts)',
    'Meta descriptions rebuilt from complete sentences only — no ellipsis cutoffs',
    'Grammar/punctuation sweep; AI-cliché softening; paragraph flow',
    'Validator: 0 hard-goods products still flagged after pass',
    'HTML v3: full body text on detail pages; copy QA chips on matrix',
  ],`,
  `changelog: [
    'Product titles are product names only (removed business name suffix)',
    'Reduced em-dashes and AI-sounding cadence for more natural prose',
    'Manufacturer names removed from description body copy',
    'Near-duplicate images removed; media.json cleaned',
    'Bed size verified via OTO pricebook: full/double for main cribs; twin only for Mini Newport',
  ],`,
)
s = s.replaceAll('url=v3/audit.html', 'url=v5/audit.html')
s = s.replaceAll('v3 — Deep copy validation', 'v5 — Team review')
s = s.replaceAll('Open v3 audit.html', 'Open v5 audit.html')
s = s.replaceAll('href="v3/', 'href="v5/')
s = s.replaceAll('review/v3/', 'review/v5/')
s = s.replace(
  '<span><a href="../v2/audit.html">v2</a> · <a href="../v1/audit.html">v1</a></span>',
  '<span><a href="../v4/audit.html">v4</a> · <a href="../v3/audit.html">v3</a> · <a href="../v2/audit.html">v2</a></span>',
)
s = s.replace(
  "ok('sents-complete', !danglingSent, 'No dangling sentence endings')",
  `ok('sents-complete', !danglingSent, 'No dangling sentence endings')
  ok('no-biz-title', !/Heirloom Cribs and More/i.test(t), 'Title has no business name')
  ok('no-emdash', !/[\\u2014\\u2013]/.test(d), 'No em/en dashes in description')
  ok('no-mfg-body', !/Old Time Oak|\\bOTO\\b|Fisher Quality|\\bFQP\\b/i.test(d), 'No manufacturer name in body')
  ok('no-policy', !/deposit|How ordering|non-refundable/i.test(d), 'No order policy language')`,
)
// VERSIONS page cards
s = s.replace(
  `<div class="card">
  <div class="ver">v3 (latest)</div>`,
  `<div class="card">
  <div class="ver">v5 (latest)</div>
  <p><b>Task 1</b> — Team review (titles, voice, bed size, images)</p>
  <p><a href="v5/audit.html">Open v5 audit.html</a></p>
</div>
<div class="card">
  <div class="ver">v4</div>
  <p><b>Task 1</b> — Soft-sell voice rewrite</p>
  <p><a href="v4/audit.html">Open v4</a></p>
</div>
<div class="card">
  <div class="ver">v3</div>`,
)

fs.writeFileSync(path.join(dir, 'build-review-v5.mjs'), s)
console.log('wrote build-review-v5.mjs')
