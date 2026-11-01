import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join, relative } from 'node:path';

/*
 * Pricing App #11 guard: Heirloom makes no safety, testing or certification
 * claim of its own. Only a builder's verbatim words, attributed to the builder
 * ("<Builder> states: ...") and sourced, may say what a piece is tested to.
 * Those live on the builder pages, which are the only allow-listed files.
 *
 * Scans every rendered .ts/.tsx under src/ (comments stripped) and every
 * string field of every public/data/products/<name>/product.json.
 */
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const stripComments = (s: string) =>
  s.replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

// Builder pages carry verbatim, attributed builder quotes (OTO 2026 catalog, KC Jan 2023 catalog).
const ALLOW = new Set([
  'src/app/builders/old-town-oak/page.tsx',
  'src/app/builders/kids-comfort/page.tsx',
]);

const SITE_PHRASES: [RegExp, string][] = [
  [/\bexceeds?\b[^.\n]{0,60}\b(standard|cpsc|astm|regulation)/i, 'exceeds ... standards'],
  [/rigorously tested/i, 'rigorously tested'],
  [/non[- ]?toxic/i, 'non-toxic'],
  [/baby-safe/i, 'baby-safe'],
  [/greenguard/i, 'GREENGUARD'],
  [/\bJPMA\b/i, 'JPMA'],
  [/\bCPSIA\b/i, 'CPSIA'],
  [/lead[- ]free/i, 'lead-free'],
  [/zero[- ]VOC|VOC[- ]free/i, 'VOC claim'],
  [/(cpsc|astm)[^.\n]{0,20}\b(compliant|certified|tested)\b/i, 'CPSC/ASTM compliant/certified/tested'],
  [/\b(compliant|certified|tested)\b[^.\n]{0,30}\b(cpsc|astm)\b/i, 'compliant/certified/tested to CPSC/ASTM'],
  [/safety[- ]certified/i, 'safety-certified'],
  [/safety (&amp;|&|and) certifications/i, 'Safety & certifications'],
  [/sells compliant/i, 'sells compliant'],
  [/meets all (federal )?safety standards/i, 'meets all safety standards'],
  [/standards they are tested to|what they are tested against/i, 'tested to/against'],
  [/do heirloom cribs meet/i, 'Do Heirloom cribs meet ...'],
  [/\bWBE\b/, 'WBE'],
];

// Heirloom-voice safe/safety lines in product descriptions (Brand, #113 left-unchanged list).
const PRODUCT_PHRASES: [RegExp, string][] = [
  ...SITE_PHRASES,
  [/\bsafe(ly|ty)?\b/i, 'safe/safely/safety'],
  [/\bsecure\b|\bsecurity\b/i, 'secure/security'],
  [/\b(complete|full-length|secure) protection\b/i, 'protection claim'],
  [/prevent accidents/i, 'prevent accidents'],
  [/federal safety standards/i, 'federal safety standards'],
];

function walk(dir: string, out: string[] = []): string[] {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(n)) out.push(relative(root, p));
  }
  return out;
}

function productStrings(): { file: string; field: string; text: string }[] {
  const dir = resolve(root, 'public/data/products');
  const out: { file: string; field: string; text: string }[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name, 'product.json');
    if (!existsSync(p)) continue;
    const d = JSON.parse(readFileSync(p, 'utf8'));
    for (const field of ['description', 'extendedDescription', 'title', 'metaDescription']) {
      if (typeof d[field] === 'string') out.push({ file: `${name}/product.json`, field, text: d[field] });
    }
  }
  return out;
}

test('no Heirloom-voice safety/certification claim in rendered src copy', () => {
  const files = walk(resolve(root, 'src')).filter(f => !ALLOW.has(f));
  assert.ok(files.length > 50, 'src scan found too few files');
  for (const f of files) {
    const src = stripComments(readFileSync(resolve(root, f), 'utf8'));
    for (const [re, label] of SITE_PHRASES) {
      assert.ok(!re.test(src), `${f} has "${label}" (${src.match(re)?.[0]})`);
    }
  }
});

test('no Heirloom-voice safety claim in any product.json copy field', () => {
  const rows = productStrings();
  assert.ok(rows.length > 50);
  for (const { file, field, text } of rows) {
    for (const [re, label] of PRODUCT_PHRASES) {
      assert.ok(!re.test(text), `${file} ${field} has "${label}" (${text.match(re)?.[0]})`);
    }
  }
});

test('builder safety lines on builder pages stay verbatim and attributed', () => {
  const oto = readFileSync(resolve(root, 'src/app/builders/old-town-oak/page.tsx'), 'utf8');
  assert.ok(
    oto.includes(
      'Old Town Oak states: "All cribs conform to Consumer Product Safety Commission (CPSC) 16CFR1219 and ASTM F1169-19 standards and are up to date with all regulations tested through certified third party labs."',
    ),
  );
  const kc = readFileSync(resolve(root, 'src/app/builders/kids-comfort/page.tsx'), 'utf8');
  assert.ok(
    kc.includes(
      'Kids Comfort states: "As always all Kids Comfort cribs are fully convertible, and are tested and certified to CPSIA and ASTM federal standards."',
    ),
  );
  // Every rendered "tested"/"certified"/"conform" line on a builder page is a "<Builder> states:" quote or inside a quoted block.
  for (const [src, name] of [[oto, 'Old Town Oak'], [kc, 'Kids Comfort']] as const) {
    for (const line of stripComments(src).split('\n')) {
      if (/\b(tested|conform)\b/i.test(line)) {
        assert.ok(line.includes(`${name} states: "`) || /^\s*\{`"/.test(line), `unattributed builder safety line: ${line.trim()}`);
      }
    }
  }
});
