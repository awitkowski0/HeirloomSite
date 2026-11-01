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
  // Assembly comes only with White Glove; product copy must not promise or describe assembly.
  [/\bassembl\w*/i, 'assembly wording'],
  // Unsourced fit / install claims removed in copy v2 (no builder source on file).
  [/tool[- ]free/i, 'tool-free'],
  [/\bno gaps\b/i, 'no gaps'],
  [/fits? all convertible cribs/i, 'fits all convertible cribs'],
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

/*
 * Builder pages: the only place safety wording may appear, and only as the
 * builders' own words. Six builder lines are allowed, word for word, each with
 * its credit (checked against OTO 2026 catalog PDF pp.3-4 and Kids Comfort
 * January 2023 catalog PDF pp.5-6). Any other rendered text on these pages
 * that uses safety/standards wording fails unless it is one of the short
 * framing lines below (headings and "no safety claims of its own" notes).
 */
const BUILDER_QUOTES: { page: string; credit: string; quote: string }[] = [
  {
    page: 'src/app/builders/old-town-oak/page.tsx',
    credit: 'Old Town Oak states: ',
    quote:
      'All cribs conform to Consumer Product Safety Commission (CPSC) 16CFR1219 and ASTM F1169-19 standards and are up to date with all regulations tested through certified third party labs.',
  },
  {
    page: 'src/app/builders/old-town-oak/page.tsx',
    credit: 'Old Town Oak states: ',
    quote:
      'For the compliancy and safety sake for our customers and each and every one of us, we chose to use a rear mount interlock system along with counterweights as needed to be fully compliant while still maintaining a full extension drawer. Warning and extension labels are applied as needed. A General Certificate of Conformity is filed as we test each style per wood species.',
  },
  {
    page: 'src/app/builders/kids-comfort/page.tsx',
    credit: 'Kids Comfort states: ',
    quote:
      'As always all Kids Comfort cribs are fully convertible, and are tested and certified to CPSIA and ASTM federal standards.',
  },
  {
    page: 'src/app/builders/kids-comfort/page.tsx',
    credit: 'Kids Comfort states: ',
    quote: 'All furniture pieces come with a wall anchor to prevent tipping hazards in your nursery.',
  },
  {
    page: 'src/app/builders/kids-comfort/page.tsx',
    credit: 'Kids Comfort states: ',
    quote:
      'All our standard products are created with child safe varnishes and meet ASTM standards and consumer safety product standards.',
  },
  {
    // Organic finish, shown as a blockquote under the catalog credit line, always with the glue disclosure.
    page: 'src/app/builders/kids-comfort/page.tsx',
    credit: "Kids Comfort's January 2023 catalog describes the finish this way:",
    quote:
      'Our Organic finish is a linseed oil derived from natural flaxseed. This product is non toxic, 100% VOC free, has no chemical driers, is non flammable, compostable, and environmentally & food safe. Two applications of this organic finish is hand rubbed onto raw wood, preserving the natural beauty and appearance of your furniture.',
  },
];
// Shown with the organic finish quote (Brand: always together). Not a safety claim on its own.
const KC_GLUE =
  "The glue used in assembling Kid's Comfort Organic products is not totally chemical free but it is water-based with a very low chemical content. The only reason we use this glue is lack of any organic wood glues. We are committed to upgrading as organic glues are developed.";

const BUILDER_FRAMING = [
  "Safety and compliance, in Old Town Oak's words",
  "Safety and compliance, in Kids Comfort's words",
  'Heirloom Cribs & More does not build furniture and makes no safety claims of its own.',
  'Read its own words on construction and safety',
  // KC owner letter (catalog p.6), quoted and attributed; mentions safety as a value, not a standard.
  'we realize the importance of quality, safety, endurance, and service',
  // KC stain-line name from its catalog, not a certification claim.
  'Ohio Certified Stains',
  // KC catalog customization limit (quoted, attributed to "The catalog").
  '*Due to federal standards, customization on cribs is not available',
];

const SAFETY_WORDS =
  /\b(safe|safety|safely|standards|(safety|astm|cpsc|federal|crib) standard|cpsc|astm|cpsia|jpma|certif\w*|tested|conform\w*|complian\w*|compliant|toxic|voc|hazards?|tipping|tip-over|greenguard|lead[- ]free|lead paint|regulations?|lab|labs)\b/i;

function builderRenderedText(src: string): string {
  // Rendered strings only: template literals, quoted string props, and JSX text.
  const body = stripComments(src).replace(/^import .*$/gm, '');
  const parts: string[] = [];
  for (const m of body.matchAll(/`([^`]*)`/g)) parts.push(m[1]);
  for (const m of body.matchAll(/'([^'\n]{12,})'/g)) parts.push(m[1]);
  for (const m of body.matchAll(/>([^<>{}`]+)</g)) parts.push(m[1]);
  return parts.join('\n').replace(/\$\{[^}]*\}/g, ' ');
}

test('builder pages: the six builder safety lines are verbatim and credited', () => {
  assert.equal(BUILDER_QUOTES.length, 6);
  for (const { page, credit, quote } of BUILDER_QUOTES) {
    const src = readFileSync(resolve(root, page), 'utf8');
    if (credit.endsWith('states: ')) {
      assert.ok(src.includes(`${credit}"${quote}"`), `${page}: missing or changed: ${credit}"${quote.slice(0, 60)}…"`);
    } else {
      assert.ok(src.includes(credit), `${page}: missing credit line "${credit}"`);
      assert.ok(src.includes(`"${quote}"`), `${page}: missing or changed quote "${quote.slice(0, 60)}…"`);
      assert.ok(src.indexOf(credit) < src.indexOf(`"${quote}"`), `${page}: credit must come before the quote`);
    }
  }
  const kc = readFileSync(resolve(root, 'src/app/builders/kids-comfort/page.tsx'), 'utf8');
  assert.ok(kc.includes(`"${KC_GLUE}"`), 'KC glue disclosure must stay with the organic finish quote');
});

test('builder pages: no other safety/standards wording besides the allowlist', () => {
  for (const page of new Set(BUILDER_QUOTES.map(q => q.page))) {
    let text = builderRenderedText(readFileSync(resolve(root, page), 'utf8'));
    const allowed = [
      ...BUILDER_QUOTES.filter(q => q.page === page).flatMap(q => [`${q.credit}"${q.quote}"`, `"${q.quote}"`, q.credit]),
      `"${KC_GLUE}"`,
      ...BUILDER_FRAMING,
    ].sort((a, b) => b.length - a.length);
    for (const a of allowed) text = text.split(a).join(' ');
    for (const line of text.split('\n')) {
      for (const sentence of line.split(/(?<=[.!?])\s+/)) {
        assert.ok(!SAFETY_WORDS.test(sentence), `${page}: safety wording outside the builder allowlist: "${sentence.trim()}"`);
      }
    }
  }
});
