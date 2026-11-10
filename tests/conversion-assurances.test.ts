/*
 * Conversion assurances on product pages follow the catalogue's own
 * bundle/includes data. Full-size cribs show "Built to convert as they grow".
 * The Mini Newport is a 2-stage crib → single (twin) bed path: it lists the
 * Twin Bed Conversion Kit (OTO-1380B) as an optional, sold-separately add-on
 * and shows Brand's part (b) 2-stage note, with no daybed or 4-in-1 claim.
 *
 * OTO-1380B is in the OTO price book (merchant/checks/2026-11-02-issue52-facts/
 * oto-pricebook-excerpt.txt line 60: Brown Maple unfinished $155, estimated
 * finishing $49). Retail is $368 (Phil via CoS and Director, 10:48 AM ET),
 * not that cost. OTO-401B stays at $481. Run with `npm test`.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { isConvertibleProduct, isConversionPiece } from '../src/lib/conversion';
import {
  MINI_NEWPORT_CONVERSION_NOTE_HEADING,
  MINI_NEWPORT_CONVERSION_NOTE_STAGE_1,
  MINI_NEWPORT_CONVERSION_NOTE_STAGE_1_LABEL,
  MINI_NEWPORT_CONVERSION_NOTE_STAGE_2,
  MINI_NEWPORT_CONVERSION_NOTE_STAGE_2_LABEL,
  MINI_NEWPORT_TWO_STAGE_NOTE,
  TWIN_BED_CONVERSION_ADDON_LABEL,
  TWIN_BED_CONVERSION_ADDON_LINE,
  TWIN_BED_CONVERSION_NAME,
  TWIN_BED_CONVERSION_PRICE,
  TWIN_BED_CONVERSION_SKU,
  TWIN_BED_CONVERSION_SLUG,
  isTwoStageTwinConversion,
  showsFourInOneConversionAssurance,
  twoStageConversionNote,
} from '../src/lib/mini-newport-conversion';
import { getInventory } from '../src/lib/content';
import { GOOGLE_PRODUCT_CATEGORY, merchantFeedXml } from '../src/lib/merchant-feed';

interface InventoryRow {
  productName: string;
  slug: string | null;
  category: string | null;
  collection: string | null;
  sku?: string | null;
  basePrice?: number;
  dimensions?: string | null;
  bundle?: { slug: string; productName: string; category: string | null; optional?: boolean; startsUnchecked?: boolean }[];
  includes?: { slug: string; productName: string; category: string | null }[];
}

const inventory = JSON.parse(
  readFileSync(new URL('../public/data/inventory.json', import.meta.url), 'utf8')
) as InventoryRow[];

const uniqueByName = new Map(inventory.map(r => [r.productName, r]));
const uniqueBySlug = new Map(inventory.filter(r => r.slug).map(r => [r.slug as string, r]));

const CRIB_NAMES = [
  'Addison Crib',
  'Addison Crib with Raised Panel Headboard',
  'French Country Crib (Panel Style Front)',
  'French Country Crib (Slat Style Front)',
  'Mackenzie Crib (Panel Back)',
  'Mackenzie Crib (Slat Back)',
  'Newport Crib',
  'West Lake Crib',
  'Arched Top',
  'Bloomington',
  'Darlington',
  'Hudson',
  'Mission',
  'Moyerton',
  'Princeton',
] as const;

const CASE_GOOD_SLUGS = [
  'addison-3-drawer-nightstand',
  'addison-6-drawer-dresser',
  'addison-7-drawer-dresser',
  'addison-chest-dresser',
  'changing-table-6-drawer',
  'french-country-3-drawer-dresser-with-door',
  'french-country-3-drawer-dresser-with-door-and-changing-table',
  'french-country-3-drawer-nightstand',
  'french-country-4-drawer-dresser',
  'french-country-4-drawer-dresser-with-changing-table',
  'french-country-6-drawer-dresser',
  'french-country-6-drawer-dresser-with-changing-table',
  'french-country-6-drawer-dresser-with-hutch-top',
  'french-country-7-drawer-dresser-with-changing-table',
  'french-country-7-drawer-dresser-with-top-mirror',
  'french-country-chest',
  'mackenzie-6-drawer-dresser',
  'mackenzie-7-drawer-dresser',
  'mackenzie-chest',
  'mackenzie-nightstand',
  'newport-4-drawer-chest',
  'newport-7-drawer-dresser',
  'newport-nightstand',
  'nightstand-2-drawer',
  'west-lake-3-drawer-nightstand',
  'west-lake-4-drawer-dresser',
  'west-lake-6-drawer-dresser',
  'west-lake-7-drawer-dresser',
  'west-lake-chest',
] as const;

const FOUR_IN_ONE = /4-in-1|4 in 1|four-in-one/i;
const DAYBED = /daybed/i;

test('every full-size crib is convertible and still shows the 4-in-1 assurance', () => {
  assert.equal(CRIB_NAMES.length, 15);
  for (const name of CRIB_NAMES) {
    const row = uniqueByName.get(name);
    assert.ok(row, `${name} missing from inventory`);
    assert.equal(row.category, 'Cribs', `${name} category`);
    assert.equal(isConvertibleProduct(row), true, `${name} should be convertible`);
    assert.equal(isTwoStageTwinConversion(row), false, `${name} is not the Mini 2-stage path`);
    assert.equal(showsFourInOneConversionAssurance(row), true, `${name} should keep the 4-in-1 line`);
    assert.equal(twoStageConversionNote(row), null);
  }
});

test('Mini Newport is a Mini Crib, is convertible as a 2-stage twin path, and shows the single-bed note', () => {
  const rows = inventory.filter(r => r.slug === 'mini-newport-with-mattress');
  assert.ok(rows.length > 0, 'Mini Newport missing from inventory');
  for (const row of rows) {
    assert.equal(row.category, 'Mini Cribs');
    assert.equal(isConvertibleProduct(row), true);
    assert.equal(isTwoStageTwinConversion(row), true);
    assert.equal(showsFourInOneConversionAssurance(row), false);
    const note = twoStageConversionNote(row);
    assert.deepEqual(note, MINI_NEWPORT_TWO_STAGE_NOTE);
    assert.equal(note?.heading, MINI_NEWPORT_CONVERSION_NOTE_HEADING);
    assert.equal(note?.stages[0].label, MINI_NEWPORT_CONVERSION_NOTE_STAGE_1_LABEL);
    assert.equal(note?.stages[0].text, MINI_NEWPORT_CONVERSION_NOTE_STAGE_1);
    assert.equal(note?.stages[1].label, MINI_NEWPORT_CONVERSION_NOTE_STAGE_2_LABEL);
    assert.equal(note?.stages[1].text, MINI_NEWPORT_CONVERSION_NOTE_STAGE_2);
    const noteText = [note?.heading, ...(note?.stages ?? []).flatMap(s => [s.label, s.text])].join(' ');
    assert.match(noteText, /single \(twin\) bed/i);
    assert.doesNotMatch(noteText, FOUR_IN_ONE);
    assert.doesNotMatch(noteText, DAYBED);
    assert.equal(
      ['Nursery Furniture', row.category, row.collection].filter(Boolean).join(' > '),
      'Nursery Furniture > Mini Cribs > Newport'
    );
    assert.equal(
      GOOGLE_PRODUCT_CATEGORY[row.category ?? ''],
      'Furniture > Baby & Toddler Furniture > Cribs & Toddler Beds'
    );
    const bundle = row.bundle ?? [];
    assert.equal(bundle.length, 1);
    assert.equal(bundle[0].slug, TWIN_BED_CONVERSION_SLUG);
    assert.equal(bundle[0].productName, TWIN_BED_CONVERSION_NAME);
    assert.equal(bundle[0].optional, true);
    assert.equal(bundle[0].startsUnchecked, true);
    assert.deepEqual(row.includes ?? [], []);
  }
});

test('OTO-1380B Twin Bed Conversion Kit is in variants at $368, not the price-book cost; OTO-401B stays $481', () => {
  const variants = JSON.parse(
    readFileSync(
      new URL('../public/data/products/Mini Newport Twin Bed Conversion/variants.json', import.meta.url),
      'utf8'
    )
  ) as Array<{ sku: string; basePrice: number; dimensions: string | null }>;
  assert.equal(variants.length, 1);
  assert.equal(variants[0].sku, TWIN_BED_CONVERSION_SKU);
  assert.equal(variants[0].basePrice, TWIN_BED_CONVERSION_PRICE);
  assert.equal(variants[0].basePrice, 368);
  assert.equal(variants[0].dimensions, '42 3/4"w x 36"h x 79 3/4"d');
  // Price-book cost is $155 + $49; retail must not use that sum. 401B stays $481.
  assert.notEqual(TWIN_BED_CONVERSION_PRICE, 155 + 49);
  assert.notEqual(TWIN_BED_CONVERSION_PRICE, 481);
  assert.notEqual(TWIN_BED_CONVERSION_PRICE, 155);
  assert.notEqual(TWIN_BED_CONVERSION_PRICE, 49);

  const kit = inventory.filter(r => r.sku === TWIN_BED_CONVERSION_SKU);
  assert.ok(kit.length > 0, 'OTO-1380B missing from inventory');
  for (const row of kit) {
    assert.equal(row.productName, TWIN_BED_CONVERSION_NAME);
    assert.equal(row.slug, TWIN_BED_CONVERSION_SLUG);
    assert.equal(row.category, 'Guard Rails & Conversions');
    assert.equal(row.basePrice, TWIN_BED_CONVERSION_PRICE);
    assert.equal(row.basePrice, 368);
    assert.equal(isConversionPiece(row as { slug: string; productName: string; category: string | null }), true);
  }
});

test('Mini product copy, add-on copy, and the 2-stage note match Brand exactly and have no daybed or 4-in-1 claim', () => {
  const files = [
    'public/data/products/Mini Newport with Mattress/product.json',
    'public/data/products/Mini Newport Twin Bed Conversion/product.json',
  ];
  for (const file of files) {
    const text = readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
    assert.doesNotMatch(text, FOUR_IN_ONE, file);
    assert.doesNotMatch(text, DAYBED, file);
  }
  const kit = JSON.parse(
    readFileSync(
      new URL('../public/data/products/Mini Newport Twin Bed Conversion/product.json', import.meta.url),
      'utf8'
    )
  ) as { productName: string; title: string; description: string };
  assert.equal(kit.productName, TWIN_BED_CONVERSION_NAME);
  assert.equal(kit.title, TWIN_BED_CONVERSION_NAME);
  assert.equal(kit.description, TWIN_BED_CONVERSION_ADDON_LINE);
  assert.equal(TWIN_BED_CONVERSION_ADDON_LABEL, 'Twin Bed Conversion Kit (sold separately)');
  assert.equal(
    TWIN_BED_CONVERSION_ADDON_LINE,
    'When your little one is ready, the Mini Newport converts to a single (twin) bed with the Twin Bed Conversion Kit, sold separately. As a twin bed, it measures 42 3/4"w x 36"h x 79 3/4"d.'
  );
  const brandStrings = [
    TWIN_BED_CONVERSION_NAME,
    TWIN_BED_CONVERSION_ADDON_LABEL,
    TWIN_BED_CONVERSION_ADDON_LINE,
    MINI_NEWPORT_CONVERSION_NOTE_HEADING,
    MINI_NEWPORT_CONVERSION_NOTE_STAGE_1_LABEL,
    MINI_NEWPORT_CONVERSION_NOTE_STAGE_1,
    MINI_NEWPORT_CONVERSION_NOTE_STAGE_2_LABEL,
    MINI_NEWPORT_CONVERSION_NOTE_STAGE_2,
  ];
  for (const s of brandStrings) {
    assert.doesNotMatch(s, FOUR_IN_ONE, s);
    assert.doesNotMatch(s, DAYBED, s);
  }
});

test('the 15 full-size cribs and 29 case goods are unchanged from the 21dd24b conversion behaviour', () => {
  assert.equal(CASE_GOOD_SLUGS.length, 29);
  for (const name of CRIB_NAMES) {
    const row = uniqueByName.get(name);
    assert.ok(row, `${name} missing`);
    assert.equal(showsFourInOneConversionAssurance(row), true, `${name}`);
    assert.equal(twoStageConversionNote(row), null, `${name}`);
  }
  for (const slug of CASE_GOOD_SLUGS) {
    const row = uniqueBySlug.get(slug);
    assert.ok(row, `${slug} missing`);
    assert.equal(isConvertibleProduct(row), false, `${slug} unexpectedly convertible`);
    assert.equal(showsFourInOneConversionAssurance(row), false, `${slug}`);
    assert.equal(twoStageConversionNote(row), null, `${slug}`);
  }
});

test('Twin Bed Conversion stays out of the merchant feed, like other OTO conversion kits; Mini crib items keep the Mini Cribs type', () => {
  const xml = merchantFeedXml(getInventory());
  assert.equal(xml.includes(TWIN_BED_CONVERSION_SKU), false, 'OTO-1380B leaked into the merchant feed');
  assert.equal(xml.includes(TWIN_BED_CONVERSION_SLUG), false);
  const miniBlocks = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)]
    .map(m => m[1])
    .filter(b => b.includes('mini-newport-with-mattress') || b.includes('OTO-1380-'));
  assert.equal(miniBlocks.length, 10);
  for (const block of miniBlocks) {
    assert.match(block, /<g:product_type>Nursery Furniture &gt; Mini Cribs &gt; Newport<\/g:product_type>/);
    assert.match(
      block,
      /<g:google_product_category>Furniture &gt; Baby &amp; Toddler Furniture &gt; Cribs &amp; Toddler Beds<\/g:google_product_category>/
    );
    assert.doesNotMatch(block, FOUR_IN_ONE);
    assert.doesNotMatch(block, DAYBED);
  }
});

test('a mattress-only bundle is not a conversion', () => {
  assert.equal(
    isConvertibleProduct({
      bundle: [{ slug: 'crib-mattress', productName: 'Crib Mattress', category: 'Accessories' }],
      includes: [],
    }),
    false
  );
  assert.equal(
    isConversionPiece({ slug: 'crib-mattress', productName: 'Crib Mattress', category: 'Accessories' }),
    false
  );
  assert.equal(
    isConversionPiece({
      slug: 'toddler-conversion-rail',
      productName: 'Toddler Bed Rail Kit',
      category: 'Accessories',
    }),
    true
  );
  assert.equal(
    isConversionPiece({
      slug: 'newport-toddler-bed',
      productName: 'Newport Toddler Bed',
      category: 'Guard Rails & Conversions',
    }),
    true
  );
  assert.equal(
    isConversionPiece({
      slug: TWIN_BED_CONVERSION_SLUG,
      productName: TWIN_BED_CONVERSION_NAME,
      category: 'Guard Rails & Conversions',
    }),
    true
  );
});
