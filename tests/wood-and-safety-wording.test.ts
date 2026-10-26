import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';

/*
 * Brand wording guards (global).
 * 1. No Heirloom-voice "meets/exceeds ... CPSC/ASTM" safety claim.
 * 2. No Heirloom-voice "non-toxic"/"baby-safe" claim.
 * 3. No Cherry / Red Oak in sold-wood copy (we sell Brown Maple only; the
 *    Cherry/Red Oak variant links 404 live).
 * Covers the public-facing copy files below AND every product.json description.
 * Assertions run against RENDERED copy, so block comments are stripped first.
 */
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const stripComments = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '');
const rendered = (f: string) => stripComments(readFileSync(resolve(root, f), 'utf8'));

// #112 "four pages" (home = page + HomeHero + ProvenanceBand).
const FOUR_PAGES = [
  'src/app/page.tsx',
  'src/components/home/HomeHero.tsx',
  'src/components/home/ProvenanceBand.tsx',
  'src/app/safety/page.tsx',
  'src/app/why-hardwood/page.tsx',
  'src/app/finishes/page.tsx',
];

// All public-facing copy files cleaned across #112 + this follow-up.
const COPY_FILES = [
  ...FOUR_PAGES,
  'src/app/faq/page.tsx',
  'src/app/care/page.tsx',
  'src/app/safe-sleep/page.tsx',
  'src/app/how-conversion-works/page.tsx',
  'src/lib/seo.ts',
  'src/app/layout.tsx',
  'src/components/product/PurchaseAssurances.tsx',
];

// Cherry/Red Oak sold-wood copy is cleaned on the prose pages (not product data,
// whose variant plumbing legitimately references the woods).
const WOOD_COPY_FILES = [...FOUR_PAGES, 'src/app/faq/page.tsx', 'src/app/care/page.tsx'];

function productDescriptions(): { file: string; description: string }[] {
  const dir = resolve(root, 'public/data/products');
  const out: { file: string; description: string }[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name, 'product.json');
    if (!existsSync(p)) continue;
    const d = JSON.parse(readFileSync(p, 'utf8'));
    if (typeof d.description === 'string') out.push({ file: `${name}/product.json`, description: d.description });
  }
  return out;
}

const MEETS = /meets?\s+or\s+exceeds?|meet\s+or\s+exceed|meeting\s+or\s+exceeding/i;

test('no "meets/exceeds ... CPSC/ASTM" claim in copy files', () => {
  for (const f of COPY_FILES) {
    assert.ok(!MEETS.test(rendered(f)), `${f} still has a meets/exceeds claim`);
    assert.ok(!/exceeds?\s+all\s+safety\s+standards/i.test(rendered(f)), `${f} has "exceeds all safety standards"`);
    assert.ok(!/Built to CPSC and ASTM/i.test(rendered(f)), `${f} has "Built to CPSC and ASTM"`);
  }
});

test('no "meets/exceeds ... CPSC/ASTM" claim in any product description', () => {
  for (const { file, description } of productDescriptions()) {
    assert.ok(!MEETS.test(description), `${file} description still has a meets/exceeds claim`);
  }
});

test('no Heirloom-voice non-toxic/baby-safe claim in copy files', () => {
  for (const f of COPY_FILES) {
    const src = rendered(f);
    assert.ok(!/non-toxic/i.test(src), `${f} still has a non-toxic claim`);
    assert.ok(!/baby-safe/i.test(src), `${f} still has a baby-safe claim`);
  }
});

test('no non-toxic/baby-safe claim in any product description', () => {
  for (const { file, description } of productDescriptions()) {
    assert.ok(!/non-toxic/i.test(description), `${file} description still has a non-toxic claim`);
    assert.ok(!/baby-safe/i.test(description), `${file} description still has a baby-safe claim`);
  }
});

test('no Cherry or Red Oak in sold-wood copy', () => {
  for (const f of WOOD_COPY_FILES) {
    const src = rendered(f);
    assert.ok(!/cherry/i.test(src), `${f} still mentions cherry in sold-wood copy`);
    assert.ok(!/red oak/i.test(src), `${f} still mentions red oak in sold-wood copy`);
  }
});

test('Brown Maple is still named as a wood on the home/safety/why-hardwood/finishes copy', () => {
  for (const f of FOUR_PAGES) {
    assert.match(rendered(f), /brown maple/i, `${f} should still name brown maple`);
  }
});

test('no "Sustainably sourced" claim on the four pages or home components', () => {
  for (const f of FOUR_PAGES) {
    assert.ok(!/sustainably sourced/i.test(rendered(f)), `${f} still says "Sustainably sourced"`);
  }
});
