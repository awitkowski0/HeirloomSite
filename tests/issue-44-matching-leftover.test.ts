import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/*
 * Pricing App #44 leftover slice (not /faq). Brand 6917264617 / L-20261115-1:
 * replace leftover customer-facing match/matching/to match with approved
 * wording only. /faq, the concept mock, and PR #45 stay untouched.
 */

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel: string) => readFileSync(resolve(root, rel), 'utf8');

const BANNED = /\b(?:match|matches|matching|matched)\b|\bto match\b/i;

const CHANGED_PRODUCTS = [
  '3-4 Guard Rail',
  'Addison Full Bed Rail Kit',
  'Addison Toddler Bed',
  'Bloomington',
  'Darlington',
  'French Country 3-4 Guard Rail',
  'Full Bed Rail Kit',
  'Full Guard Rail',
  'Guard Rail',
  'Mackenzie 3-4 Guard Rail',
  'Mackenzie Crib (Panel Back)',
  'Mackenzie Full Guard Rail',
  'Mission',
  'Newport 3-4 Guard Rail',
  'Newport Full Guard Rail',
  'Newport Toddler Bed',
  'Toddler Conversion Rail',
  'West Lake 3-4 Guard Rail',
  'West Lake Full Bed Rail Kit',
  'West Lake Full Guard Rail',
  'West Lake Toddler Bed',
];

test('leftover guide pages use approved wording and have no match/matching/to match, except the woods H2 left as a blocker', () => {
  const care = read('src/app/care/page.tsx');
  const finishes = read('src/app/finishes/page.tsx');
  const timeline = read('src/app/timeline/page.tsx');
  const woods = read('src/app/woods-and-finishes/page.tsx');

  assert.match(care, /Already have\s+a piece in the room\? Ask us before ordering\./);
  assert.doesNotMatch(care, BANNED);

  assert.ok(finishes.includes('Already have a piece in the room? Ask us before'));
  assert.ok(
    finishes.includes(
      'Ask us before deposit if a sensitivity or a piece already in the room needs a precise answer.',
    ),
  );
  assert.doesNotMatch(finishes, BANNED);

  assert.ok(timeline.includes('which finish to choose for your nursery'));
  assert.doesNotMatch(timeline, /which finish will match your room/);
  assert.doesNotMatch(timeline, BANNED);

  assert.ok(woods.includes("If you're unsure which finish to choose for your nursery, ask us before you order."));
  // No approved heading wording fit this section; left unchanged on purpose.
  assert.ok(woods.includes("Matching a room you've already planned"));
  const woodsWithoutH2 = woods.replace(
    /<h2 className="headline-md">Matching a room you've already planned<\/h2>/,
    '',
  );
  assert.doesNotMatch(woodsWithoutH2, BANNED);
});

test('changed product.json customer copy has no match/matching/to match', () => {
  for (const name of CHANGED_PRODUCTS) {
    const json = read(`public/data/products/${name}/product.json`);
    assert.doesNotMatch(json, BANNED, name);
  }
  const rail = read('public/data/products/3-4 Guard Rail/product.json');
  assert.ok(rail.includes('works with a crib from the same collection'));
  const addisonToddler = read('public/data/products/Addison Toddler Bed/product.json');
  assert.ok(addisonToddler.includes('from the same collection'));
  const westLakeToddler = read('public/data/products/West Lake Toddler Bed/product.json');
  assert.ok(westLakeToddler.includes('for the West Lake crib'));
});

test('/faq, Arched Top "match your style", and the Kids Comfort catalog quote were left unchanged', () => {
  const faq = read('src/app/faq/page.tsx');
  assert.ok(faq.includes('which finish will match your nursery'));
  assert.ok(faq.includes('matching existing furniture'));

  const arched = read('public/data/products/Arched Top/product.json');
  assert.ok(arched.includes('finished to match your style'));

  const kids = read('src/app/builders/kids-comfort/page.tsx');
  assert.ok(
    kids.includes(
      "Our transitional furniture will match your child's progressive growth phases, from baby… to toddler… to teenager.",
    ),
  );
});
