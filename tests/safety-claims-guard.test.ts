import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join, relative } from 'node:path';

/*
 * Pricing App #11 guard: Heirloom makes no safety, testing or certification
 * claim of its own. Only a builder's verbatim words, attributed to the builder
 * ("<Builder> states: ...") and sourced, may say what a piece is tested to.
 * Those live in data/builders/<id>.json, shown only by the generated stores.
 *
 * Scans every rendered .ts/.tsx under src/ (comments stripped) and every
 * string field of every public/data/products/<name>/product.json.
 */
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const stripComments = (s: string) =>
  s.replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

// Builder stores render statements from data/builders/*.json, so no store template needs an exemption.
const ALLOW = new Set([
  // The chat's claim filter and system prompt name these terms in order to forbid them.
  'src/lib/shop-chat.ts',
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
 * Builder stores: the only place safety wording may appear, and only as the
 * builders' own words, read from the record. Four builder lines are on file,
 * word for word (checked against OTO 2026 catalog PDF pp.3-4 and Kids Comfort
 * January 2023 catalog PDF pp.5-6). The store template's only safety wording is
 * the heading that introduces them, credited to the builder by name.
 */
const BUILDER_RECORD = (id: string) => JSON.parse(readFileSync(resolve(root, 'data', 'builders', `${id}.json`), 'utf8'));
const BUILDER_QUOTES: { record: string; field: 'crib' | 'caseGoods'; quote: string }[] = [
  {
    record: 'old-town-oak',
    field: 'crib',
    quote:
      'All cribs conform to Consumer Product Safety Commission (CPSC) 16CFR1219 and ASTM F1169-19 standards and are up to date with all regulations tested through certified third party labs.',
  },
  {
    record: 'old-town-oak',
    field: 'caseGoods',
    quote:
      'For the compliancy and safety sake for our customers and each and every one of us, we chose to use a rear mount interlock system along with counterweights as needed to be fully compliant while still maintaining a full extension drawer. Warning and extension labels are applied as needed. A General Certificate of Conformity is filed as we test each style per wood species.',
  },
  {
    record: 'kids-comfort',
    field: 'crib',
    quote:
      'As always all Kids Comfort cribs are fully convertible, and are tested and certified to CPSIA and ASTM federal standards.',
  },
  {
    record: 'kids-comfort',
    field: 'caseGoods',
    quote: 'All furniture pieces come with a wall anchor to prevent tipping hazards in your nursery.',
  },
];

const STORE_TEMPLATES = [
  'src/app/builders/[builder]/layout.tsx',
  'src/app/builders/[builder]/page.tsx',
  'src/app/builders/[builder]/[section]/page.tsx',
  'src/components/builders/StoreBanner.tsx',
  'src/components/builders/StoreBannerSwitch.tsx',
  'src/components/builders/StoreMenu.tsx',
  'src/components/builders/StoreSearch.tsx',
];
// The one heading, in the template. Anything else with safety wording fails.
const BUILDER_FRAMING = ['Safety, from'];

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

test('builder stores: the builder safety lines are verbatim and rendered credited', () => {
  assert.equal(BUILDER_QUOTES.length, 4);
  for (const { record, field, quote } of BUILDER_QUOTES) {
    assert.equal(BUILDER_RECORD(record).safety[field]?.text, quote, `${record} safety.${field} changed from the catalog wording`);
  }
  const home = readFileSync(resolve(root, 'src/app/builders/[builder]/page.tsx'), 'utf8');
  assert.ok(home.includes('<cite>From {builder.name}</cite>'), 'statements must be credited From <builder>');
  assert.ok(/Safety, from \{builder\.name\}/.test(home), 'the heading must name the builder');
  assert.ok(home.includes('quote={s.quote}') && home.includes('builder.safety.crib') && home.includes('builder.safety.caseGoods'), 'the store must show the record\'s statements');
  for (const { quote } of BUILDER_QUOTES) assert.ok(!home.includes(quote), 'statements must come from the record, not be retyped');
});

test('builder stores: no other safety/standards wording besides the allowlist', () => {
  for (const page of STORE_TEMPLATES) {
    let text = builderRenderedText(readFileSync(resolve(root, page), 'utf8'));
    for (const a of BUILDER_FRAMING) text = text.split(a).join(' ');
    for (const line of text.split('\n')) {
      for (const sentence of line.split(/(?<=[.!?])\s+/)) {
        assert.ok(!SAFETY_WORDS.test(sentence), `${page}: safety wording outside the builder allowlist: "${sentence.trim()}"`);
      }
    }
  }
});

test('builder stores: the health claims from the Kids Comfort catalog stay out until reviewed', () => {
  // The organic-finish quote never moved to the record. It may only come back with a person's review.
  const text = [...STORE_TEMPLATES.map(p => readFileSync(resolve(root, p), 'utf8')), readFileSync(resolve(root, 'data/builders/kids-comfort.json'), 'utf8')].join('\n');
  assert.ok(!/non[- ]toxic|VOC free|food safe|child safe varnish/i.test(text), 'unreviewed health claim in a store or its record');
});

/*
 * The one allowance for origin wording: ORIGIN_LINE, defined once, used in three
 * places, and nowhere that makes a claim to a machine or an inbox. See src/lib/origin.ts.
 */
test('the origin line is defined once and appears only where the owner placed it', () => {
  const PLACED = new Set([
    'src/components/home/IntentBox.tsx',
    'src/app/about-heirloom/page.tsx',
    'src/app/product/[slug]/[[...variant]]/page.tsx',
  ]);
  const files = walk(resolve(root, 'src'));
  const users = files.filter(f => f !== 'src/lib/origin.ts' && readFileSync(resolve(root, f), 'utf8').includes('ORIGIN_LINE'));
  assert.deepEqual(new Set(users), PLACED, 'ORIGIN_LINE used outside its three placements');

  // shop-chat.ts names these terms in order to forbid them.
  for (const f of files.filter(n => n !== 'src/lib/origin.ts' && !ALLOW.has(n))) {
    const src = stripComments(readFileSync(resolve(root, f), 'utf8'));
    assert.ok(!/american[- ]made|made in (the )?(usa|america|u\.s\.)/i.test(src), `${f} states an origin outside ORIGIN_LINE`);
  }

  const pdp = readFileSync(resolve(root, 'src/app/product/[slug]/[[...variant]]/page.tsx'), 'utf8');
  assert.match(pdp, /\) : null\}\s*<p className="byline">\{ORIGIN_LINE\}<\/p>/, 'the product line must follow, not sit inside, the named-builder branch');

  const records = readdirSync(resolve(root, 'data/builders')).map(n => readFileSync(resolve(root, 'data/builders', n), 'utf8')).join('\n');
  assert.ok(!/american[- ]made|made in (the )?(usa|america)/i.test(records), 'builder records stay free of origin wording');
});
