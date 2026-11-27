import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CRIBS_H1,
  CRIBS_INTRO,
  CRIBS_META,
  CRIBS_TITLE,
  HOME_H1,
  HOME_INTRO,
  HOME_META,
  HOME_TITLE,
} from '../src/lib/s2a-home-cribs-copy';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const SERIAL_COMMA = /New Jersey, and|Products, and|NJ, and|day bed, and/;

test("S2a constants match Brand 7225176032 strings exactly", () => {
  assert.equal(HOME_TITLE, 'Solid Wood Convertible Cribs | Heirloom Cribs & More');
  assert.equal(
    HOME_H1,
    'Solid wood convertible cribs, delivered in Pennsylvania, New Jersey and Maryland',
  );
  assert.equal(
    HOME_META,
    'Solid wood convertible cribs and nursery furniture from builders we resell. Delivery in Pennsylvania, New Jersey and Maryland.',
  );
  assert.equal(
    HOME_INTRO,
    "Every convertible crib starts as a crib and is designed to grow with your child. The cribs here come from Old Town Oak, Fisher's Quality Products and Kids Comfort, builders we resell, in solid hardwood and the finishes you choose. Each product page lists the stages and conversion kits for that crib. On most cribs, conversion rail kits are sold separately, so check the page or ask us before you order. We deliver in Pennsylvania, New Jersey and Maryland. Shipping is charged separately, and assembly comes only with White Glove. See how conversion works and why solid hardwood.",
  );
  assert.equal(CRIBS_TITLE, 'Convertible Cribs in Solid Wood | Heirloom Cribs & More');
  assert.equal(CRIBS_H1, 'Solid wood convertible cribs');
  assert.equal(
    CRIBS_META,
    "Browse convertible cribs from Old Town Oak, Fisher's Quality Products and Kids Comfort. Delivery in PA, NJ and MD.",
  );
  assert.equal(
    CRIBS_INTRO,
    'A 4-in-1 convertible crib is a crib that converts to a toddler bed, a day bed and a full-size bed. Our builders describe the stages a little differently, so check the product page for the stages and kits that apply to your crib. On most cribs, conversion rail kits are sold separately. The Mini Newport converts to a single (twin) bed with the Twin Bed Conversion Kit, sold separately. We deliver in Pennsylvania, New Jersey and Maryland. Shipping is charged separately, and assembly comes only with White Glove.',
  );
});

test('home and /products/cribs intros are different, with no serial comma or curly apostrophe', () => {
  assert.notEqual(HOME_INTRO, CRIBS_INTRO);
  for (const s of [HOME_TITLE, HOME_H1, HOME_META, HOME_INTRO, CRIBS_TITLE, CRIBS_H1, CRIBS_META, CRIBS_INTRO]) {
    assert.doesNotMatch(s, SERIAL_COMMA, s);
    assert.equal(s.includes('\u2019'), false, s);
    assert.doesNotMatch(s, /crafted|certified|\bWBE\b|nationwide|\bmatch(?:ing)?\b|we build|Amish|other areas|\bdaybed\b|\$\s*[\d,]+/i, s);
  }
  assert.ok(HOME_INTRO.includes("Fisher's"));
  assert.ok(CRIBS_META.includes("Fisher's"));
});

test('home and cribs pages render the S2a strings', () => {
  const hero = readFileSync(resolve(root, 'src/components/home/HomeHero.tsx'), 'utf8');
  const home = readFileSync(resolve(root, 'src/app/page.tsx'), 'utf8');
  const listing = readFileSync(resolve(root, 'src/app/products/[category]/page.tsx'), 'utf8');
  assert.match(hero, /HOME_H1/);
  assert.match(hero, /HOME_INTRO/);
  assert.match(hero, /href="\/how-conversion-works"/);
  assert.match(hero, /href="\/why-hardwood"/);
  assert.match(home, /absolute: HOME_TITLE/);
  assert.match(home, /description: HOME_META/);
  assert.match(listing, /slug === 'cribs'/);
  assert.match(listing, /absolute: CRIBS_TITLE/);
  assert.match(listing, /description: CRIBS_META/);
  assert.match(listing, /CRIBS_H1/);
  assert.match(listing, /CRIBS_INTRO/);
  // Other category pages still use the taxonomy name and description.
  assert.match(listing, /title: node\.name/);
  assert.match(listing, /description: node\.description/);
});
