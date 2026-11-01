/*
 * The Merchant Center checkout deep link: /checkout/{id}:{qty}.
 * Run with `npm test` (builds the catalogue first).
 *
 * Two concerns: the id/qty parser must be total and safe (ids contain spaces,
 * never colons; a bad qty degrades to 1), and every feed id must resolve to its
 * product at the feed price, while an unknown id resolves to null (-> 404).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseCheckoutDeeplink,
  checkoutProductForFeedId,
  allFeedIds,
} from '@/lib/checkout-deeplink';

test('parseCheckoutDeeplink: id:qty, missing qty, ids with spaces, bad qty', () => {
  assert.deepEqual(parseCheckoutDeeplink('OTO-1301-BrownMaple_OCS_100_Carbon:1'), {
    id: 'OTO-1301-BrownMaple_OCS_100_Carbon',
    quantity: 1,
  });
  // No trailing quantity -> default 1, whole string is the id.
  assert.deepEqual(parseCheckoutDeeplink('OTO-1301-BrownMaple_OCS_100_Carbon'), {
    id: 'OTO-1301-BrownMaple_OCS_100_Carbon',
    quantity: 1,
  });
  // Spaces (already decoded by the router) are part of the id.
  assert.deepEqual(parseCheckoutDeeplink('FQP 112 Madison Nightstand 2 Drawer:1'), {
    id: 'FQP 112 Madison Nightstand 2 Drawer',
    quantity: 1,
  });
  assert.deepEqual(parseCheckoutDeeplink('FQP-201-BrownMaple_OCS_100_Antique Slate:3'), {
    id: 'FQP-201-BrownMaple_OCS_100_Antique Slate',
    quantity: 3,
  });
  // Bad / out-of-range quantities clamp to [1, 20]; the id stays intact.
  assert.deepEqual(parseCheckoutDeeplink('x:0'), { id: 'x', quantity: 1 });
  assert.deepEqual(parseCheckoutDeeplink('x:999'), { id: 'x', quantity: 20 });
  // Non-numeric tail is part of the id (will 404 upstream), not a quantity.
  assert.deepEqual(parseCheckoutDeeplink('x:abc'), { id: 'x:abc', quantity: 1 });
  assert.deepEqual(parseCheckoutDeeplink(''), { id: '', quantity: 1 });
});

test('checkoutProductForFeedId: feed ids resolve at the feed price', () => {
  const cases: Array<[string, string, number]> = [
    ['OTO-1301-BrownMaple_OCS_100_Carbon', 'Newport Crib', 1900],
    ['OTO-1201-BrownMaple_OCS_100_Natural', 'Addison Crib', 2500],
    ['FQP-201-BrownMaple_OCS_100_Antique Slate', 'Arched Top', 2050],
    ['FQP 112 Madison Nightstand 2 Drawer', 'Nightstand - 2 Drawer', 662],
    ['FQP 107 Madison Changing Table 6 Drawer', 'Changing Table - 6 Drawer', 1332],
  ];
  for (const [id, name, price] of cases) {
    const p = checkoutProductForFeedId(id);
    assert.ok(p, `expected ${id} to resolve`);
    assert.equal(p!.id, id);
    assert.equal(p!.productName, name);
    assert.equal(p!.priceDollars, price);
    assert.ok(p!.stainName.length > 0);
  }
});

test('checkoutProductForFeedId: unknown id resolves to null (-> 404)', () => {
  assert.equal(checkoutProductForFeedId('NOPE-does-not-exist'), null);
  assert.equal(checkoutProductForFeedId(''), null);
  assert.equal(checkoutProductForFeedId('OTO-1301'), null); // group id, not a feed id
});

test('allFeedIds: the full feed set, unique', () => {
  const ids = allFeedIds();
  assert.equal(ids.length, 136);
  assert.equal(new Set(ids).size, 136);
});
