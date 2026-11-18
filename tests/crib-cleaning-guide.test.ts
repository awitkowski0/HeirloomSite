import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SITE_URL, SITE_NAME } from '../src/lib/seo';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel: string) => readFileSync(resolve(root, rel), 'utf8');

const PAGE = 'src/app/guides/how-to-clean-a-wooden-crib/page.tsx';
const HERO = 'public/images/guides/how-to-clean-a-wooden-crib/brown-maple-harvest-finish.jpg';
const PATH = '/guides/how-to-clean-a-wooden-crib';
const TITLE = 'How to Clean a Wooden Crib';
const DESCRIPTION =
  "Dust, then wipe with a damp cloth and mild soap. See what Old Town Oak, Fisher's and Kids Comfort say in their crib instructions.";
const HERO_ALT = 'Close-up of brown maple with a Harvest finish, showing the wood grain and sheen';

const OTO_QUOTE =
  '“The surface with which the baby can come in contact should be wiped clean using a damp cloth and a small amount of mild soap. DO NOT use strong detergents as they may be an irritant to the baby’s skin.”';
const FQP_QUOTE =
  '“When cleaning your furniture, use a non-toxic, non-abrasive cleaner. Mix a solution of water with a small amount of mild dishwashing liquid. Apply to crib surface with a soft damp cloth, lightly dampened in solution. After cleaning, dry completely with a soft dry cloth.”';
const KC_QUOTE =
  '“Your crib may be cleaned using a damp cloth with mild soap or a soft dry cloth. Avoid using furniture polish or cleaning agents that may be hazardous to children.”';
const REFINISH_QUOTE =
  '“If refinishing, use a non-toxic finish specified for children’s products.”';

function jpegDimensions(buf: Buffer): { width: number; height: number } {
  let i = 2;
  while (i < buf.length) {
    if (buf[i] !== 0xff) throw new Error('bad jpeg marker');
    const marker = buf[i + 1];
    const size = buf.readUInt16BE(i + 2);
    // SOF0 / SOF1 / SOF2
    if (marker >= 0xc0 && marker <= 0xc2) {
      return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
    }
    i += 2 + size;
  }
  throw new Error('no SOF');
}

test('guide page metadata uses the Brand title and description, relative canonical and og:url', () => {
  const src = read(PAGE);
  assert.match(src, /title: TITLE/);
  assert.ok(src.includes(`const TITLE = '${TITLE}'`));
  assert.ok(src.includes(DESCRIPTION));
  assert.ok(src.includes(`const PATH = '${PATH}'`));
  assert.match(src, /alternates:\s*\{\s*canonical:\s*PATH\s*\}/);
  assert.match(src, /url:\s*PATH/);
  assert.doesNotMatch(src, /vercel\.app/);
  // Title template in layout already appends " | Heirloom Cribs & More".
  assert.equal(TITLE.includes(SITE_NAME), false);
  assert.ok(src.includes('`${TITLE} | Heirloom Cribs & More`'));
  assert.ok(src.includes(`alt: HERO_ALT`) || src.includes(HERO_ALT));
  assert.ok(src.includes(HERO_ALT));
});

test('sitemap lists the guide on the apex host, not a vercel.app URL', () => {
  const src = read('src/app/sitemap.ts');
  assert.ok(src.includes("`${SITE_URL}/guides/how-to-clean-a-wooden-crib`"));
  // SITE_URL is the apex in production; tests may see localhost. Never a preview host.
  assert.ok(String(SITE_URL).startsWith('http'));
  assert.ok(!String(SITE_URL).includes('vercel.app'));
  assert.doesNotMatch(src, /vercel\.app/);
});

test('footer Guides column links to the new guide, matching other sitemap guides', () => {
  const src = read('src/components/layout/Footer.tsx');
  assert.ok(src.includes(`href="/guides/how-to-clean-a-wooden-crib"`));
  assert.ok(src.includes('How to Clean a Wooden Crib'));
});

test('Brand v2 copy is present verbatim, without [builder-quote] tags', () => {
  const src = read(PAGE);
  const rendered = src.replace(/\/\*[\s\S]*?\*\//g, '');
  assert.doesNotMatch(rendered, /\[builder-quote/);
  assert.ok(src.includes(OTO_QUOTE));
  assert.ok(src.includes(FQP_QUOTE));
  assert.ok(src.includes(KC_QUOTE));
  assert.ok(src.includes(REFINISH_QUOTE));
  assert.ok(
    src.includes(
      "That is the cleaning step in the crib instructions we keep from Old Town Oak, Fisher's and Kids Comfort, which name mild soap or mild dishwashing liquid.",
    ),
  );
  assert.ok(
    src.includes(
      'The crib instructions we keep from each of them describe cleaning with a damp cloth and a mild soap or dishwashing liquid.',
    ),
  );
  assert.ok(src.includes('hand rubbed onto raw wood'));
  const h2s = [
    "Start with your crib's instructions",
    'The everyday routine',
    "What Old Town Oak's instructions say",
    "What Fisher's Quality Products' instructions say",
    "What Kids Comfort's instructions say",
    "While you're cleaning, check the bolts",
    'If you ever refinish',
    'Where to go next',
  ];
  for (const h of h2s) {
    assert.ok(src.includes(h), `missing H2: ${h}`);
  }
  assert.equal([...src.matchAll(/<h2 className="headline-md">/g)].length, 8);
});

test('the ten Brand links point at the seven live paths', () => {
  const src = read(PAGE);
  const hrefs = [...src.matchAll(/<Link href="([^"]+)" className="doc-link">/g)].map(m => m[1]);
  assert.deepEqual(hrefs, [
    '/contact',
    '/care',
    '/builders/old-town-oak',
    '/builders/fishers-quality-products',
    '/builders/kids-comfort',
    '/contact',
    '/why-hardwood',
    '/builders/old-town-oak',
    '/builders/kids-comfort',
    '/finishes',
  ]);
});

test('house rules: no Manor address, Shopify, nationwide, certified/WBE, or unattributed handcrafted', () => {
  const src = read(PAGE);
  assert.doesNotMatch(src, /421\s*Manor/);
  assert.doesNotMatch(src, /shopify/i);
  assert.doesNotMatch(src, /nationwide/i);
  assert.doesNotMatch(src, /\bWBE\b/);
  assert.doesNotMatch(src, /certified/i);
  assert.doesNotMatch(src, /handcrafted/i);
  // "non-toxic" only inside the two Brand-signed builder quotes
  const withoutQuotes = src.split(FQP_QUOTE).join(' ').split(REFINISH_QUOTE).join(' ');
  assert.doesNotMatch(withoutQuotes, /non-toxic/i);
  assert.equal(SITE_NAME, 'Heirloom Cribs & More');
  assert.ok(src.includes('Heirloom Cribs & More does not build furniture'));
  // Brand signed no serial comma in this list
  assert.ok(src.includes("Old Town Oak, Fisher's and Kids Comfort"));
  assert.doesNotMatch(src, /Old Town Oak, Fisher's, and Kids Comfort/);
});

test('hero image is the 1000x1000 Harvest finish close-up with the matching alt', () => {
  const abs = resolve(root, HERO);
  assert.equal(existsSync(abs), true, `missing ${HERO}`);
  const buf = readFileSync(abs);
  assert.equal(buf[0], 0xff);
  assert.equal(buf[1], 0xd8);
  const { width, height } = jpegDimensions(buf);
  assert.equal(width, 1000);
  assert.equal(height, 1000);
  const src = read(PAGE);
  assert.ok(src.includes("/images/guides/how-to-clean-a-wooden-crib/brown-maple-harvest-finish.jpg"));
  assert.ok(src.includes(HERO_ALT));
  assert.match(src, /width=\{1000\}/);
  assert.match(src, /height=\{1000\}/);
});
