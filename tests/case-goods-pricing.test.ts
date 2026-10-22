/*
 * Case goods (dressers, chests, nightstands, changing tables) at the Heirloom
 * Pricing App's suggested price. Run with `npm test`.
 *
 * Source: 8808 product cards (read only, GET, 2026-10-20 10:30 PM ET). OTO
 * pieces use the card's "Suggested" value; combined pieces use their own
 * package section (Changing / Hutch / Mirror), e.g. French Country 7 Drawer
 * Dresser with Changing Table $2,899. Fisher Changing Table and Nightstand
 * were set in 432c18d. Only the price changes: the server pricer, the cart
 * and the checkout summary all charge it.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { cartSubtotalCents } from '../src/lib/pricing';
import { chargedSubtotalCents } from '../src/lib/cart-pricing';

interface PricingRow { productName: string; wood: string; basePrice: number; stains: Array<{ name: string; inStock: boolean }> }
interface InventoryRow { productName: string; sku: string; basePrice: number; category: string | null }

const pricing = JSON.parse(readFileSync(new URL('../data/pricing.json', import.meta.url), 'utf8')) as PricingRow[];
const inventory = JSON.parse(readFileSync(new URL('../public/data/inventory.json', import.meta.url), 'utf8')) as InventoryRow[];

/** [product, SKU, price, previous price] */
const CASE_GOODS: ReadonlyArray<[string, string, number, number]> = [
  ['Addison 3 Drawer Nightstand', 'OTO-1203', 1261, 1524],
  ['Addison 6 Drawer Dresser', 'OTO-1206', 2578, 2896],
  ['Addison 7 Drawer Dresser', 'OTO-1207', 2618, 3072],
  ['Addison Chest Dresser', 'OTO-1210', 2232, 2932],
  ['French Country 3 Drawer Dresser with Door', 'OTO-405', 2366, 3060],
  ['French Country 3 Drawer Dresser with Door and Changing Table', 'OTO-405-425', 2455, 3442],
  ['French Country 3 Drawer Nightstand', 'OTO-403', 1271, 1653],
  ['French Country 4 Drawer Dresser', 'OTO-404', 1966, 2520],
  ['French Country 4 Drawer Dresser with Changing Table', 'OTO-404-425', 2084, 2902],
  ['French Country 6 Drawer Dresser', 'OTO-406', 2275, 2920],
  ['French Country 6 Drawer Dresser with Changing Table', 'OTO-406-425', 2358, 3302],
  ['French Country 6 Drawer Dresser with Hutch Top', 'OTO-406-420', 4411, 4749],
  ['French Country 7 Drawer Dresser with Changing Table', 'OTO-407-425', 2899, 3513],
  ['French Country 7 Drawer Dresser with Top Mirror', 'OTO-407-415', 3540, 3961],
  ['French Country Chest', 'OTO-410', 2324, 3073],
  ['Mackenzie 6 Drawer Dresser', 'OTO-1406', 2447, 2979],
  ['Mackenzie 7 Drawer Dresser', 'OTO-1407', 3055, 3131],
  ['Mackenzie Chest', 'OTO-1410', 3008, 3084],
  ['Mackenzie Nightstand', 'OTO-1403', 1560, 1512],
  ['Newport 4 Drawer Chest', 'OTO-1304', 1952, 2156],
  ['Newport 7 Drawer Dresser', 'OTO-1307', 2473, 2732],
  ['Newport Nightstand', 'OTO-1303', 1023, 1030],
  ['West Lake 3 Drawer Nightstand', 'OTO-703', 1118, 1383],
  ['West Lake 4 Drawer Dresser', 'OTO-704', 1866, 2308],
  ['West Lake 6 Drawer Dresser', 'OTO-706', 2284, 2826],
  ['West Lake 7 Drawer Dresser', 'OTO-707', 2408, 2978],
  ['West Lake Chest', 'OTO-710', 2360, 2920],
  ['Changing Table - 6 Drawer', 'FQP 107 Madison Changing Table 6 Drawer', 1332, 1750],
  ['Nightstand - 2 Drawer', 'FQP 112 Madison Nightstand 2 Drawer', 662, 700],
];
const CATEGORIES = ['Dressers', 'Chests', 'Nightstands', 'Changing Tables'];

test('every case good in the catalog is priced here (no piece missed)', () => {
  const listed = new Set(CASE_GOODS.map(c => c[0]));
  const inCatalog = [...new Set(inventory.filter(r => r.category && CATEGORIES.includes(r.category)).map(r => r.productName))].sort();
  assert.deepEqual(inCatalog, [...listed].sort());
});

for (const [name, sku, price, previous] of CASE_GOODS) {
  test(`${name}: $${previous} -> $${price} on the page, in the cart and at checkout`, () => {
    const inv = inventory.filter(r => r.productName === name);
    assert.ok(inv.length > 0, `${name} missing from inventory`);
    for (const r of inv) {
      assert.equal(r.sku, sku, `${name} SKU`);
      assert.equal(r.basePrice, price, `${name} page price`);
    }
    const rows = pricing.filter(r => r.productName === name);
    assert.ok(rows.length > 0, `${name} missing from pricing`);
    for (const row of rows) {
      assert.equal(row.basePrice, price, `${name} / ${row.wood} server price`);
      const stain = row.stains.find(s => s.inStock) ?? row.stains[0];
      const line = { productName: name, wood: row.wood, stainName: stain.name };
      assert.equal(cartSubtotalCents([line]), price * 100, `${name} server charge`);
      assert.equal(cartSubtotalCents([{ ...line, quantity: 2 }]), price * 200, `${name} x2 server charge`);
      assert.equal(chargedSubtotalCents([{ productName: name, wood: row.wood, quantity: 1, price }]), price * 100, `${name} cart/checkout`);
    }
  });
}
