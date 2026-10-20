/*
 * Old Town Oak (OTO) crib pricing and pick-list add-ons, through the server
 * pricer (src/lib/pricing.ts) and the cart/checkout resolver
 * (src/lib/cart-pricing.ts). Run with `npm test`.
 *
 * Source: Heirloom Pricing App (8808, v1.3.1, competitor position 0.50),
 * read-only, 2026-10-20 - each crib's "PA Suggest" crib and package price and
 * the package composition ("In our package: <crib>, <toddler kit>, <full
 * kit>"). The app gives one add-on amount for the two kits together; it is
 * split 20% toddler / 80% full (the market split: every priced competitor
 * puts ~16-21% of the pair on the toddler kit, and the OTO book costs are
 * $30 / $155), in whole dollars with an exact sum: crib + both kits = package.
 *
 * Each crib line pairs with its OWN builder's kits (Addison kits for Addison,
 * etc.); the French Country cribs share OTO-401A/B with the Fisher cribs,
 * whose $250 add-on price is kept per crib - see the shared-kit test below.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { priceCart, cartSubtotalCents } from '../src/lib/pricing';
import { chargedSubtotalCents, type PricedCartLineInput } from '../src/lib/cart-pricing';

interface Oto { name: string; sku: string; crib: number; pkg: number; toddler: string; full: string; split: [number, number] }
const OTO: readonly Oto[] = [
  { name: 'Addison Crib', sku: 'OTO-1201', crib: 2500, pkg: 2950, toddler: 'Addison Toddler Bed Rail Kit', full: 'Addison Full Bed Rail Kit', split: [90, 360] },
  { name: 'Addison Crib with Raised Panel Headboard', sku: 'OTO-1202', crib: 2650, pkg: 3100, toddler: 'Addison Toddler Bed Rail Kit', full: 'Addison Full Bed Rail Kit', split: [90, 360] },
  { name: 'French Country Crib (Panel Style Front)', sku: 'OTO-402', crib: 2700, pkg: 3200, toddler: 'Toddler Bed Rail Kit', full: 'Full Bed Rail Kit', split: [100, 400] },
  { name: 'French Country Crib (Slat Style Front)', sku: 'OTO-401', crib: 2300, pkg: 2850, toddler: 'Toddler Bed Rail Kit', full: 'Full Bed Rail Kit', split: [110, 440] },
  { name: 'Mackenzie Crib (Panel Back)', sku: 'OTO-1402', crib: 2450, pkg: 2900, toddler: 'Mackenzie Toddler Bed Rail Kit', full: 'Mackenzie Full Bed Rail Kit', split: [90, 360] },
  { name: 'Mackenzie Crib (Slat Back)', sku: 'OTO-1401', crib: 2450, pkg: 2900, toddler: 'Mackenzie Toddler Bed Rail Kit', full: 'Mackenzie Full Bed Rail Kit', split: [90, 360] },
  { name: 'Newport Crib', sku: 'OTO-1301', crib: 1900, pkg: 2350, toddler: 'Newport Toddler Bed Rail Kit', full: 'Newport Full Bed Rail Kit', split: [90, 360] },
  { name: 'West Lake Crib', sku: 'OTO-701', crib: 2250, pkg: 2700, toddler: 'West Lake Toddler Bed Rail Kit', full: 'West Lake Full Bed Rail Kit', split: [90, 360] },
];
const TODDLER_LIST = 109;
const FULL_LIST = 481;
const MATTRESS = 'Crib Mattress';
const MATTRESS_PRICE = 310;

interface Override { productName: string; wood: string; stainName: string; price: number }
interface PricingRow { productName: string; wood: string; basePrice: number; bundleOverrides?: Override[]; stains: Array<{ name: string; inStock: boolean }> }
interface InventoryRow {
  productName: string;
  basePrice: number;
  includes?: Array<{ productName: string }>;
  bundle?: Array<{ productName: string; price: number; listPrice?: number; bundleOverride?: boolean; image: string | null }>;
}
type Line = { productName: string; wood: string; stainName: string; quantity?: number; bundledWith?: { productName: string; wood: string } };

const pricing = JSON.parse(readFileSync(new URL('../data/pricing.json', import.meta.url), 'utf8')) as PricingRow[];
const inventory = JSON.parse(readFileSync(new URL('../public/data/inventory.json', import.meta.url), 'utf8')) as InventoryRow[];
const cents = (d: number) => Math.round(d * 100);
const rowsFor = (n: string) => pricing.filter(r => r.productName === n);

function cribLine(row: PricingRow, quantity = 1): Line {
  const stain = row.stains.find(s => s.inStock);
  assert.ok(stain, `${row.productName} has no in-stock finish`);
  return { productName: row.productName, wood: row.wood, stainName: stain.name, quantity };
}
function kitLine(row: PricingRow, kit: string): Line {
  const o = row.bundleOverrides?.find(b => b.productName === kit);
  assert.ok(o, `${row.productName} / ${row.wood} has no add-on price for ${kit}`);
  return { productName: o.productName, wood: o.wood, stainName: o.stainName, bundledWith: { productName: row.productName, wood: row.wood } };
}
function asCart(row: PricingRow, p: Oto, lines: Line[]): PricedCartLineInput[] {
  return lines.map(l => {
    if (l.productName === row.productName) return { productName: l.productName, wood: l.wood, quantity: l.quantity ?? 1, price: row.basePrice };
    const isToddler = l.productName === p.toddler;
    const list = isToddler ? TODDLER_LIST : FULL_LIST;
    return {
      productName: l.productName, wood: l.wood, quantity: l.quantity ?? 1,
      price: l.bundledWith ? (isToddler ? p.split[0] : p.split[1]) : list,
      ...(l.bundledWith ? { listPrice: list, bundledWith: l.bundledWith } : {}),
    };
  });
}

for (const p of OTO) {
  test(`${p.name} (${p.sku}): crib, each kit, both kits = package, pick list, delivery`, () => {
    assert.equal(p.split[0] + p.split[1], p.pkg - p.crib, 'split sums to package - crib');
    assert.equal(p.split[0], Math.round((p.pkg - p.crib) * 0.2), 'toddler kit is 20% of the pair (market split)');
    assert.equal(p.split[1], (p.pkg - p.crib) - p.split[0], 'full kit is the other 80%');
    const rows = rowsFor(p.name);
    assert.ok(rows.length > 0, `${p.name} missing from data/pricing.json`);
    for (const row of rows) {
      const where = `${p.name} / ${row.wood}`;
      assert.equal(row.basePrice, p.crib, `${where} crib price`);
      // Only the package kits carry an add-on price for this crib.
      assert.deepEqual(
        (row.bundleOverrides ?? []).map(o => [o.productName, o.price]).sort(),
        [[p.full, p.split[1]], [p.toddler, p.split[0]]].sort(),
        `${where} add-on prices`
      );
      const combos: Array<[string, Line[], number]> = [
        ['crib only', [cribLine(row)], p.crib],
        ['crib + toddler kit', [cribLine(row), kitLine(row, p.toddler)], p.crib + p.split[0]],
        ['crib + full kit', [cribLine(row), kitLine(row, p.full)], p.crib + p.split[1]],
        ['crib + both = package', [cribLine(row), kitLine(row, p.toddler), kitLine(row, p.full)], p.pkg],
      ];
      for (const [label, lines, expected] of combos) {
        assert.equal(cartSubtotalCents(lines), cents(expected), `${where} ${label} (server)`);
        assert.equal(chargedSubtotalCents(asCart(row, p, lines)), cents(expected), `${where} ${label} (cart)`);
      }
      const both = [cribLine(row), kitLine(row, p.toddler), kitLine(row, p.full)];
      assert.equal(priceCart(both, 'NJ', 'threshold').totalCents, cents(p.pkg + 175), `${where} package + curbside`);
      assert.equal(priceCart(both, 'NJ', 'white_glove').totalCents, cents(p.pkg + 225), `${where} package + white glove`);
      // Kits without the crib: their own standalone prices, cart and server alike.
      const alone = [kitLine(row, p.toddler), kitLine(row, p.full)];
      assert.equal(cartSubtotalCents(alone), cents(TODDLER_LIST + FULL_LIST));
      assert.equal(chargedSubtotalCents(asCart(row, p, alone)), cents(TODDLER_LIST + FULL_LIST));
    }
    // Pick list on the product page: exactly the two package kits (at the
    // add-on price, with a thumbnail) and the mattress at its own price.
    for (const inv of inventory.filter(i => i.productName === p.name)) {
      assert.equal(inv.basePrice, p.crib);
      assert.deepEqual(inv.includes ?? [], [], `${p.name}: nothing listed as included`);
      assert.deepEqual(
        (inv.bundle ?? []).map(b => [b.productName, b.price, b.bundleOverride ?? false, b.listPrice ?? null]),
        [
          [p.toddler, p.split[0], true, TODDLER_LIST],
          [p.full, p.split[1], true, FULL_LIST],
          [MATTRESS, MATTRESS_PRICE, false, null],
        ],
        `${p.name} pick list`
      );
      for (const b of inv.bundle ?? []) assert.ok(b.image, `${p.name}: ${b.productName} has a thumbnail`);
    }
  });
}

test('Mini Newport with Mattress (OTO-1380): package = crib $1,800, no kits', () => {
  for (const row of rowsFor('Mini Newport with Mattress')) {
    assert.equal(row.basePrice, 1800);
    assert.deepEqual(row.bundleOverrides ?? [], []);
    assert.equal(cartSubtotalCents([cribLine(row)]), cents(1800));
  }
});

test('shared kits OTO-401A/B: Fisher $250 and French Country add-on prices stay per crib', () => {
  const mission = rowsFor('Mission')[0];
  const fcSlat = rowsFor('French Country Crib (Slat Style Front)')[0];
  const cart = [
    cribLine(mission), kitLine(mission, 'Toddler Bed Rail Kit'), kitLine(mission, 'Full Bed Rail Kit'),
    cribLine(fcSlat), kitLine(fcSlat, 'Toddler Bed Rail Kit'), kitLine(fcSlat, 'Full Bed Rail Kit'),
  ];
  const priced = priceCart(cart, 'NJ', 'threshold');
  assert.deepEqual(priced.lines.map(l => l.unitCents / 100), [2000, 250, 250, 2300, 110, 440]);
  assert.equal(priced.subtotalCents, cents(2500 + 2850));
  // Standalone kit prices unchanged.
  assert.equal(rowsFor('Toddler Bed Rail Kit')[0].basePrice, TODDLER_LIST);
  assert.equal(rowsFor('Full Bed Rail Kit')[0].basePrice, FULL_LIST);
});
