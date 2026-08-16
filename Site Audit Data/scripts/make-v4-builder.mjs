import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = path.dirname(fileURLToPath(import.meta.url))
let s = fs.readFileSync(path.join(dir, 'build-review-v3.mjs'), 'utf8')

s = s.replace(
  'Review HTML v3 — Deep copy validation (Task 1)\n * Full descriptions, grammar checklist, balanced columns, versioned.',
  'Review HTML v4 — Soft-sell voice rewrite (Task 1)\n * No order/deposit policy on PDPs; warm nursery storytelling; versioned.',
)
s = s.replaceAll("path.join(REVIEW, 'v3')", "path.join(REVIEW, 'v4')")
s = s.replaceAll("id: 'v3'", "id: 'v4'")
s = s.replace(
  'Deep copy validation (complete sentences, grammar, punctuation)',
  'Soft-sell voice rewrite — no order policy on PDPs',
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
    'Removed deposit, cancellation, and checkout-policy language from product descriptions',
    'Rewrote PDPs for warm, inviting nursery storytelling (grow-with-child, safety, quality)',
    'Soft CTA only: Get Personal Assistance — same/next business day, no hard sell',
    'Deduped repetitive merged sentences; complete thoughts only',
    'HTML v4: balanced columns + full polished copy for voice review',
  ],`,
)
s = s.replaceAll('url=v3/audit.html', 'url=v4/audit.html')
s = s.replaceAll('v3 — Deep copy validation', 'v4 — Soft-sell voice rewrite')
s = s.replaceAll('Open v3 audit.html', 'Open v4 audit.html')
s = s.replaceAll('href="v3/', 'href="v4/')
s = s.replaceAll('review/v3/', 'review/v4/')
s = s.replaceAll("version: 'v3'", "version: 'v4'")
// Keep links to older versions
s = s.replace(
  '<span><a href="../v2/audit.html">v2</a> · <a href="../v1/audit.html">v1</a></span>',
  '<span><a href="../v3/audit.html">v3</a> · <a href="../v2/audit.html">v2</a> · <a href="../v1/audit.html">v1</a></span>',
)
// Expand VERSIONS card list - insert v4 card before v3 in versions html section
s = s.replace(
  `<div class="card">
  <div class="ver">v3 (latest)</div>`,
  `<div class="card">
  <div class="ver">v4 (latest)</div>
  <p><b>Task 1</b> — Soft-sell voice rewrite</p>
  <p class="muted">No deposit/order policy on PDPs; warm CTA to Get Personal Assistance</p>
  <p><a href="v4/audit.html">Open v4 audit.html</a></p>
</div>

<div class="card">
  <div class="ver">v3</div>`,
)
s = s.replace('v3 (latest)', 'v3')
// fix double latest if any
s = s.replace(
  `| **v3** (latest) | Task 1 — Deep copy validation | [v3/audit.html](v3/audit.html) | Complete sentences, grammar QA, full text |
| v2 | Task 1 — Content + image merge | [v2/audit.html](v2/audit.html) | Balanced columns, merge summary |
| v1 | Task 1 — Initial match matrix | [v1/audit.html](v1/audit.html) | Archived original matrix |`,
  `| **v4** (latest) | Task 1 — Soft-sell voice rewrite | [v4/audit.html](v4/audit.html) | No order policy; warm nursery copy |
| v3 | Task 1 — Deep copy validation | [v3/audit.html](v3/audit.html) | Complete sentences, grammar QA |
| v2 | Task 1 — Content + image merge | [v2/audit.html](v2/audit.html) | Balanced columns, merge summary |
| v1 | Task 1 — Initial match matrix | [v1/audit.html](v1/audit.html) | Archived original matrix |`,
)

// Extra QA checks for policy language
s = s.replace(
  "ok('sents-complete', !danglingSent, 'No dangling sentence endings')",
  `ok('sents-complete', !danglingSent, 'No dangling sentence endings')
  ok('no-deposit', !/\\\\bdeposit\\\\b|cancellation|non-refundable|50%|How ordering/i.test(d+m), 'No order/deposit policy language')
  ok('soft-cta', /Get Personal Assistance/i.test(d), 'Includes soft Get Personal Assistance invite')`,
)

fs.writeFileSync(path.join(dir, 'build-review-v4.mjs'), s)
console.log('wrote build-review-v4.mjs', s.includes("id: 'v4'"))
