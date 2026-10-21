/*
 * Old Town Oak (OTO) optional guard rails on each crib's pick list. Run with
 * `npm test`.
 *
 * Inventory (read only, 2026-10-20): the OTO builder book (Heirloom Pricing
 * App src/data/catalog.ts, the add-on cards on 8808) and the per-crib rail
 * SKU map in qc-knowledge/specs/PA-SUGGEST-v1.4.md @24cd513:
 *   Addison / Addison Raised Panel  OTO-1275 (3/4)  OTO-1290 (full)
 *   French Country Slat / Panel     OTO-475         OTO-490
 *   Newport                         OTO-1375        OTO-1390
 *   Mackenzie Slat / Panel          OTO-1475        OTO-1490
 *   West Lake                       OTO-775         OTO-790
 * Prices: 3/4 $275, full $265 - the v1.4 PA Suggest market value at position
 * 0.50 (Buckeye + AFF rail evidence); 8808 does not compute rails yet.
 * OTO-1275 / OTO-1290 / OTO-490 keep their own site prices ($320 / $309 /
 * $309) when bought alone, so on the crib's pick list they carry a per-crib
 * add-on price (bundlePriceOverrides). The per-crib SKUs had no price
 * anywhere, so their own price is the v1.4 value.
 *
 * The rails are NOT in the package (bundleOptional): the package total (crib
 * + both kits) is unchanged, and each rail adds exactly its price in the cart,
 * the checkout summary and the server pricer alike. Default ticks (Phil,
 * 2026-10-20 9:49 PM): every row starts ticked except the full guard rail
 * (bundleUnchecked), so the initial picker total is package + 3/4 rail +
 * mattress.
 *
 * Left off on purpose (no price anywhere - book, 8808 or site): Mini Newport's
 * Twin Bed Conversion OTO-1380B, and the Mackenzie kit SKUs OTO-1401A /
 * OTO-1402B (the site sells OTO-1402A + OTO-1401B for both Mackenzie cribs).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { priceCart, cartSubtotalCents } from '../src/lib/pricing';
import { chargedSubtotalCents, type PricedCartLineInput } from '../src/lib/cart-pricing';

interface Rail { name: string; sku: string; price: number; list: number; override: boolean }
interface Crib { name: string; crib: number; pkg: number; toddler: string; full: string; split: [number, number]; rails: [Rail, Rail] }

const A34: Rail = { name: '3/4 Guard Rail Kit', sku: 'OTO-1275', price: 275, list: 320, override: true };
const AFULL: Rail = { name: 'Full Guard Rail Kit', sku: 'OTO-1290', price: 265, list: 309, override: true };
const FC34: Rail = { name: 'French Country 3/4 Guard Rail Kit', sku: 'OTO-475', price: 275, list: 275, override: false };
const FCFULL: Rail = { name: 'French Country Full Guard Rail Kit', sku: 'OTO-490', price: 265, list: 309, override: true };
const own = (name: string, sku: string, price: number): Rail => ({ name, sku, price, list: price, override: false });

const CRIBS: readonly Crib[] = [
  { name: 'Addison Crib', crib: 2500, pkg: 2950, toddler: 'Addison Toddler Bed Rail Kit', full: 'Addison Full Bed Rail Kit', split: [90, 360], rails: [A34, AFULL] },
  { name: 'Addison Crib with Raised Panel Headboard', crib: 2650, pkg: 3100, toddler: 'Addison Toddler Bed Rail Kit', full: 'Addison Full Bed Rail Kit', split: [90, 360], rails: [A34, AFULL] },
  { name: 'French Country Crib (Panel Style Front)', crib: 2700, pkg: 3200, toddler: 'Toddler Bed Rail Kit', full: 'Full Bed Rail Kit', split: [100, 400], rails: [FC34, FCFULL] },
  { name: 'French Country Crib (Slat Style Front)', crib: 2300, pkg: 2850, toddler: 'Toddler Bed Rail Kit', full: 'Full Bed Rail Kit', split: [109, 441], rails: [FC34, FCFULL] },
  { name: 'Mackenzie Crib (Panel Back)', crib: 2450, pkg: 2900, toddler: 'Mackenzie Toddler Bed Rail Kit', full: 'Mackenzie Full Bed Rail Kit', split: [90, 360], rails: [own('Mackenzie 3/4 Guard Rail Kit', 'OTO-1475', 275), own('Mackenzie Full Guard Rail Kit', 'OTO-1490', 265)] },
  { name: 'Mackenzie Crib (Slat Back)', crib: 2450, pkg: 2900, toddler: 'Mackenzie Toddler Bed Rail Kit', full: 'Mackenzie Full Bed Rail Kit', split: [90, 360], rails: [own('Mackenzie 3/4 Guard Rail Kit', 'OTO-1475', 275), own('Mackenzie Full Guard Rail Kit', 'OTO-1490', 265)] },
  { name: 'Newport Crib', crib: 1900, pkg: 2350, toddler: 'Newport Toddler Bed Rail Kit', full: 'Newport Full Bed Rail Kit', split: [90, 360], rails: [own('Newport 3/4 Guard Rail Kit', 'OTO-1375', 275), own('Newport Full Guard Rail Kit', 'OTO-1390', 265)] },
  { name: 'West Lake Crib', crib: 2250, pkg: 2700, toddler: 'West Lake Toddler Bed Rail Kit', full: 'West Lake Full Bed Rail Kit', split: [90, 360], rails: [own('West Lake 3/4 Guard Rail Kit', 'OTO-775', 275), own('West Lake Full Guard Rail Kit', 'OTO-790', 265)] },
];
const MATTRESS = 'Crib Mattress';
const MATTRESS_PRICE = 310;
const KIT_LIST: Record<string, number> = {};
for (const c of CRIBS) { KIT_LIST[c.toddler] = 109; KIT_LIST[c.full] = 481; }

interface Override { productName: string; wood: string; stainName: string; price: number }
interface PricingRow { productName: string; wood: string; basePrice: number; bundleOverrides?: Override[]; stains: Array<{ name: string; inStock: boolean }> }
interface BundleRow { productName: string; slug: string; price: number; listPrice?: number; bundleOverride?: boolean; optional?: boolean; startsUnchecked?: boolean; image: string | null; category: string | null }
interface InventoryRow { productName: string; sku: string; basePrice: number; category: string | null; bundle?: BundleRow[] }
type Line = { productName: string; wood: string; stainName: string; quantity?: number; bundledWith?: { productName: string; wood: string } };

const pricing = JSON.parse(readFileSync(new URL('../data/pricing.json', import.meta.url), 'utf8')) as PricingRow[];
const inventory = JSON.parse(readFileSync(new URL('../public/data/inventory.json', import.meta.url), 'utf8')) as InventoryRow[];
const cents = (d: number) => Math.round(d * 100);
const rowsFor = (n: string) => pricing.filter(r => r.productName === n);

function cribLine(row: PricingRow): Line {
  const stain = row.stains.find(s => s.inStock);
  assert.ok(stain, `${row.productName} has no in-stock finish`);
  return { productName: row.productName, wood: row.wood, stainName: stain.name };
}
/** A pick-list line exactly as ProductConfigurator adds it: bundledWith only for an overridden row. */
function addOnLine(row: PricingRow, name: string, overridden: boolean): Line {
  if (overridden) {
    const o = row.bundleOverrides?.find(b => b.productName === name);
    assert.ok(o, `${row.productName} / ${row.wood} has no add-on price for ${name}`);
    return { productName: name, wood: o.wood, stainName: o.stainName, bundledWith: { productName: row.productName, wood: row.wood } };
  }
  const own = rowsFor(name);
  assert.equal(own.length, 1, `${name}: one pricing row`);
  return { productName: name, wood: own[0].wood, stainName: own[0].stains[0].name };
}
/** The cart lines' displayed prices, as the product page stores them. */
function asCart(row: PricingRow, c: Crib, lines: Line[]): PricedCartLineInput[] {
  return lines.map(l => {
    if (l.productName === row.productName) return { productName: l.productName, wood: l.wood, quantity: 1, price: row.basePrice };
    const rail = c.rails.find(r => r.name === l.productName);
    const price = rail ? rail.price : l.productName === c.toddler ? c.split[0] : c.split[1];
    const list = rail ? rail.list : KIT_LIST[l.productName];
    return { productName: l.productName, wood: l.wood, quantity: 1, price, ...(l.bundledWith ? { listPrice: list, bundledWith: l.bundledWith } : {}) };
  });
}

for (const c of CRIBS) {
  const [r34, rFull] = c.rails;
  test(`${c.name}: pick list = package kits, ${r34.sku} + ${rFull.sku} guard rails, mattress`, () => {
    const invRows = inventory.filter(i => i.productName === c.name);
    assert.ok(invRows.length > 0, `${c.name} missing from inventory`);
    for (const inv of invRows) {
      assert.deepEqual(
        (inv.bundle ?? []).map(b => [b.productName, b.price, b.bundleOverride ?? false, b.listPrice ?? null, b.optional ?? false, !(b.startsUnchecked ?? false)]),
        [
          [c.toddler, c.split[0], true, KIT_LIST[c.toddler], false, true],
          [c.full, c.split[1], true, KIT_LIST[c.full], false, true],
          [r34.name, r34.price, r34.override, r34.override ? r34.list : null, true, true],
          [rFull.name, rFull.price, rFull.override, rFull.override ? rFull.list : null, true, false],
          [MATTRESS, MATTRESS_PRICE, false, null, false, true],
        ],
        `${c.name} pick list (name, price, add-on price?, own price, outside the package?, starts ticked?)`
      );
      for (const b of inv.bundle ?? []) assert.ok(b.image, `${c.name}: ${b.productName} has a thumbnail`);
      // Initial picker total = crib + every row that starts ticked = package + 3/4 rail + mattress.
      const initial = inv.basePrice + (inv.bundle ?? []).filter(b => !b.startsUnchecked).reduce((sum, b) => sum + b.price, 0);
      assert.equal(initial, c.pkg + r34.price + MATTRESS_PRICE, `${c.name} initial picker total`);
      const img = (n: string) => (inv.bundle ?? []).find(b => b.productName === n)?.image ?? '';
      assert.match(img(r34.name), /3_4_guard_rail_0\.jpg$|34_guard_rail_0\.jpg$/, `${r34.name} uses the 3/4 guard rail photo`);
      assert.match(img(rFull.name), /full_guard_rail_0\.jpg$|guard_rail_0\.jpg$/, `${rFull.name} uses the full guard rail photo`);
    }
    // Each rail is the builder's SKU for this crib, and its own price is as stated.
    for (const r of c.rails) {
      const own = inventory.filter(i => i.productName === r.name);
      assert.equal(own.length, 1, `${r.name}: one inventory row`);
      assert.equal(own[0].sku, r.sku, `${r.name} SKU`);
      assert.equal(own[0].basePrice, r.list, `${r.name} price on its own`);
      assert.ok(r.price <= r.list, `${r.name}: pick-list price $${r.price} exceeds its own price $${r.list}`);
    }

    for (const row of rowsFor(c.name)) {
      const where = `${c.name} / ${row.wood}`;
      const kits = [addOnLine(row, c.toddler, true), addOnLine(row, c.full, true)];
      const l34 = addOnLine(row, r34.name, r34.override);
      const lFull = addOnLine(row, rFull.name, rFull.override);
      const combos: Array<[string, Line[], number]> = [
        ['package (crib + both kits) unchanged', [cribLine(row), ...kits], c.pkg],
        ['crib + 3/4 rail', [cribLine(row), l34], c.crib + r34.price],
        ['crib + full rail', [cribLine(row), lFull], c.crib + rFull.price],
        ['package + 3/4 rail', [cribLine(row), ...kits, l34], c.pkg + r34.price],
        ['package + full rail', [cribLine(row), ...kits, lFull], c.pkg + rFull.price],
        ['package + both rails', [cribLine(row), ...kits, l34, lFull], c.pkg + r34.price + rFull.price],
      ];
      for (const [label, lines, expected] of combos) {
        // Server (invoice) = cart and checkout summary.
        assert.equal(cartSubtotalCents(lines), cents(expected), `${where} ${label} (server)`);
        assert.equal(chargedSubtotalCents(asCart(row, c, lines)), cents(expected), `${where} ${label} (cart = checkout)`);
      }
      // The default cart (Add to Cart without touching the picker): crib, both
      // kits, 3/4 rail, mattress - server = cart = checkout = the initial total.
      const mat = addOnLine(row, MATTRESS, false);
      const defaults = [cribLine(row), ...kits, l34, mat];
      const matCart = (ls: Line[]) => asCart(row, c, ls.filter(l => l !== mat)).concat(ls.includes(mat) ? [{ productName: MATTRESS, wood: mat.wood, quantity: 1, price: MATTRESS_PRICE }] : []);
      assert.equal(cartSubtotalCents(defaults), cents(c.pkg + r34.price + MATTRESS_PRICE), `${where} default cart (server)`);
      assert.equal(chargedSubtotalCents(matCart(defaults)), cents(c.pkg + r34.price + MATTRESS_PRICE), `${where} default cart (cart = checkout)`);
      const all = [cribLine(row), ...kits, l34, lFull];
      assert.equal(priceCart(all, 'NJ', 'threshold').totalCents, cents(c.pkg + r34.price + rFull.price + 175), `${where} + curbside`);
      assert.equal(priceCart(all, 'NJ', 'white_glove').totalCents, cents(c.pkg + r34.price + rFull.price + 225), `${where} + white glove`);
      // A rail bought without its crib is charged its own price, cart and server alike.
      const alone = [l34, lFull];
      assert.equal(cartSubtotalCents(alone), cents(r34.list + rFull.list), `${where} rails alone (server)`);
      assert.equal(chargedSubtotalCents(asCart(row, c, alone)), cents(r34.list + rFull.list), `${where} rails alone (cart)`);
    }
  });
}

test('Mini Newport with Mattress: no pick list (Twin Bed Conversion OTO-1380B has no price anywhere)', () => {
  for (const inv of inventory.filter(i => i.productName === 'Mini Newport with Mattress')) {
    assert.deepEqual(inv.bundle ?? [], []);
  }
  assert.equal(inventory.some(i => i.sku === 'OTO-1380B'), false);
});

test('only OTO cribs list guard rails; Fisher cribs keep kits + mattress', () => {
  const railNames = new Set(CRIBS.flatMap(c => c.rails.map(r => r.name)));
  for (const fisher of ['Arched Top', 'Bloomington', 'Darlington', 'Hudson', 'Mission', 'Moyerton', 'Princeton']) {
    const inv = inventory.find(i => i.productName === fisher);
    assert.ok(inv, `${fisher} missing`);
    assert.deepEqual((inv.bundle ?? []).map(b => b.productName), ['Toddler Bed Rail Kit', 'Full Bed Rail Kit', MATTRESS], `${fisher} pick list`);
    assert.equal((inv.bundle ?? []).some(b => railNames.has(b.productName)), false);
  }
  // Only the guard rails are outside the package, and only the full guard
  // rails start unticked; on Fisher (and everywhere else) every row starts ticked.
  const fullRails = new Set(CRIBS.map(c => c.rails[1].name));
  for (const inv of inventory) for (const b of inv.bundle ?? []) {
    assert.equal(b.optional ?? false, railNames.has(b.productName), `${inv.productName}: ${b.productName} optional flag`);
    assert.equal(b.startsUnchecked ?? false, fullRails.has(b.productName), `${inv.productName}: ${b.productName} starts unticked`);
  }
});
