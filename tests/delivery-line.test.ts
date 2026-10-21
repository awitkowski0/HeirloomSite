/*
 * The "Curbside $175 or white-glove $225 delivery" assurance block on product
 * pages (src/lib/delivery-line.ts, used by ProductConfigurator). Run with
 * `npm test`.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { showsPurchaseAssurances, deliveryLineTitle } from '../src/lib/delivery-line';

interface InventoryRow { productName: string; category: string | null; variantType?: string }
const inventory = JSON.parse(readFileSync(new URL('../public/data/inventory.json', import.meta.url), 'utf8')) as InventoryRow[];
const byName = new Map(inventory.map(r => [r.productName, r]));

test('delivery line wording and amounts come from order-terms ($175 / $225)', () => {
  assert.equal(deliveryLineTitle(), 'Curbside $175 or white-glove $225 delivery');
});

test('every crib and mini crib shows the delivery line, whatever its variant type', () => {
  const cribs = inventory.filter(r => r.category === 'Cribs' || r.category === 'Mini Cribs');
  const types = new Set(cribs.map(r => r.variantType));
  assert.ok(types.has('wood') && types.has('finish'), `expected wood- and finish-variant cribs, got ${[...types]}`);
  for (const r of cribs) assert.ok(showsPurchaseAssurances(r.category), `${r.productName} (${r.variantType}) hides the delivery line`);
  for (const name of [
    'Addison Crib', 'Addison Crib with Raised Panel Headboard', 'French Country Crib (Panel Style Front)',
    'French Country Crib (Slat Style Front)', 'Mackenzie Crib (Panel Back)', 'Mackenzie Crib (Slat Back)',
    'Newport Crib', 'West Lake Crib', 'Mini Newport with Mattress',
    'Arched Top', 'Bloomington', 'Darlington', 'Hudson', 'Mission', 'Moyerton', 'Princeton',
  ]) {
    const r = byName.get(name);
    assert.ok(r, `${name} missing from inventory`);
    assert.ok(showsPurchaseAssurances(r.category), `${name} hides the delivery line`);
  }
});

test('case goods show it too; kits, rails and the mattress do not', () => {
  for (const c of ['Dressers', 'Chests', 'Nightstands', 'Changing Tables']) {
    assert.ok(inventory.some(r => r.category === c), `no ${c} in inventory`);
    assert.ok(showsPurchaseAssurances(c), `${c} hides the delivery line`);
  }
  for (const name of ['Crib Mattress', 'Toddler Bed Rail Kit', 'Full Bed Rail Kit', '3/4 Guard Rail Kit', 'Addison Toddler Bed Rail Kit']) {
    const r = byName.get(name);
    assert.ok(r, `${name} missing from inventory`);
    assert.equal(showsPurchaseAssurances(r.category), false, `${name} (${r.category}) shows the delivery block`);
  }
  // Every category in the catalogue is decided (no product falls through by accident).
  for (const r of inventory) assert.equal(typeof showsPurchaseAssurances(r.category), 'boolean');
});
