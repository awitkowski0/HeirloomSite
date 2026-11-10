/*
 * Conversion assurances on product pages ("Built to convert as they grow")
 * follow the catalogue's own bundle/includes conversion data, not a handle
 * list. Mini Newport has no priced conversion kit in the catalogue
 * (Twin Bed Conversion OTO-1380B is recorded as unpriced and is not in
 * inventory). Run with `npm test`.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { isConvertibleProduct, isConversionPiece } from '../src/lib/conversion';
import { GOOGLE_PRODUCT_CATEGORY } from '../src/lib/merchant-feed';

interface InventoryRow {
  productName: string;
  slug: string | null;
  category: string | null;
  collection: string | null;
  sku?: string | null;
  bundle?: { slug: string; productName: string; category: string | null }[];
  includes?: { slug: string; productName: string; category: string | null }[];
}

const inventory = JSON.parse(
  readFileSync(new URL('../public/data/inventory.json', import.meta.url), 'utf8')
) as InventoryRow[];

const uniqueByName = new Map(inventory.map(r => [r.productName, r]));

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

test('every full-size crib is convertible from its own bundle or includes', () => {
  for (const name of CRIB_NAMES) {
    const row = uniqueByName.get(name);
    assert.ok(row, `${name} missing from inventory`);
    assert.equal(row.category, 'Cribs', `${name} category`);
    assert.equal(isConvertibleProduct(row), true, `${name} should be convertible`);
  }
});

test('Mini Newport is a Mini Crib and is not convertible: empty bundle, no OTO-1380B', () => {
  const rows = inventory.filter(r => r.slug === 'mini-newport-with-mattress');
  assert.ok(rows.length > 0, 'Mini Newport missing from inventory');
  for (const row of rows) {
    assert.equal(row.category, 'Mini Cribs');
    assert.deepEqual(row.bundle ?? [], []);
    assert.deepEqual(row.includes ?? [], []);
    assert.equal(isConvertibleProduct(row), false);
    assert.equal(
      ['Nursery Furniture', row.category, row.collection].filter(Boolean).join(' > '),
      'Nursery Furniture > Mini Cribs > Newport'
    );
    assert.equal(
      GOOGLE_PRODUCT_CATEGORY[row.category ?? ''],
      'Furniture > Baby & Toddler Furniture > Cribs & Toddler Beds'
    );
  }
  assert.equal(
    inventory.some(r => r.sku === 'OTO-1380B'),
    false,
    'unpriced Twin Bed Conversion OTO-1380B must stay out of inventory'
  );
});

test('no other browsable furniture is treated as convertible', () => {
  const furniture = ['Dressers', 'Chests', 'Nightstands', 'Changing Tables', 'Mini Cribs'];
  for (const row of uniqueByName.values()) {
    if (row.category === 'Cribs') continue;
    if (furniture.includes(row.category ?? '') || row.slug === 'mini-newport-with-mattress') {
      assert.equal(
        isConvertibleProduct(row),
        false,
        `${row.productName} (${row.category}) unexpectedly convertible`
      );
    }
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
});
