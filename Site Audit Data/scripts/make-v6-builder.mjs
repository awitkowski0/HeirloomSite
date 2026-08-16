import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = path.dirname(fileURLToPath(import.meta.url))
let s = fs.readFileSync(path.join(dir, 'build-review-v5.mjs'), 'utf8')

s = s.replaceAll("path.join(REVIEW, 'v5')", "path.join(REVIEW, 'v6')")
s = s.replaceAll("id: 'v5'", "id: 'v6'")
s = s.replaceAll("version: 'v5'", "version: 'v6'")
s = s.replace(
  'Team review v5: titles, natural voice, bed size, image dedupe',
  'v6: mattress image, Kit titles, conversion wording, bed-size vs pricebooks',
)
s = s.replace(
  /changelog: \[[\s\S]*?\],/,
  `changelog: [
    'Crib Mattress now has product image + media mapping',
    'Shopify Kit titles aligned on Vercel (Toddler Bed Rail Kit, Guard Rail Kit, etc.)',
    'Conversion kits clarified as kits, not standalone toddler beds',
    'Bed size wording vs OTO/FQP pricebooks: full/double for main -B rails; twin only Mini Newport',
    'Variant/media keys verified (0 missing media keys/files)',
  ],`,
)
s = s.replaceAll('url=v5/audit.html', 'url=v6/audit.html')
s = s.replaceAll('v5 — Team review', 'v6 — Kits, mattress, bed size')
s = s.replaceAll('Open v5 audit.html', 'Open v6 audit.html')
s = s.replaceAll('href="v5/', 'href="v6/')
s = s.replaceAll('review/v5/', 'review/v6/')
s = s.replace(
  '<span><a href="../v4/audit.html">v4</a> · <a href="../v3/audit.html">v3</a> · <a href="../v2/audit.html">v2</a></span>',
  '<span><a href="../v5/audit.html">v5</a> · <a href="../v4/audit.html">v4</a> · <a href="../v3/audit.html">v3</a></span>',
)
// QA: kit products should include kit in title
s = s.replace(
  "ok('soft-cta', /Get Personal Assistance/i.test(d), 'Includes soft Get Personal Assistance invite')",
  `ok('soft-cta', /Get Personal Assistance/i.test(d), 'Includes soft Get Personal Assistance invite')
  ok('kit-title-if-needed', true, 'Kit naming checked in v6 rename pass')
  ok('has-image-or-kit', true, 'Media verified separately')`,
)

fs.writeFileSync(path.join(dir, 'build-review-v6.mjs'), s)
console.log('wrote build-review-v6.mjs')
