import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  SHOPIFY_REDIRECTS,
  SHOPIFY_PRODUCT_REDIRECTS_PERMANENT,
  SHOPIFY_PRODUCT_REDIRECTS_CANDIDATE,
} from '@/lib/shopify-redirects';
import { getAllProductSlugs } from '@/lib/content';

test('product redirect groups have the expected sizes', () => {
  assert.equal(SHOPIFY_PRODUCT_REDIRECTS_PERMANENT.length, 55);
  assert.equal(SHOPIFY_PRODUCT_REDIRECTS_CANDIDATE.length, 5);
  assert.equal(SHOPIFY_REDIRECTS.length, 60);
});

test('every rule is well-formed, path-only, with no self-redirect', () => {
  for (const r of SHOPIFY_REDIRECTS) {
    assert.ok(r.source.startsWith('/products/'), `source: ${r.source}`);
    assert.ok(r.destination.startsWith('/product/'), `destination: ${r.destination}`);
    assert.equal(typeof r.permanent, 'boolean');
    assert.notEqual(r.source, r.destination);
    assert.ok(!r.source.includes('?') && !r.destination.includes('?'));
  }
});

test('sources are unique', () => {
  const s = SHOPIFY_REDIRECTS.map(r => r.source);
  assert.equal(new Set(s).size, s.length);
});

test('every /product/<slug> destination is a real product page', () => {
  const slugs = new Set(getAllProductSlugs());
  for (const r of SHOPIFY_REDIRECTS) {
    const slug = r.destination.slice('/product/'.length);
    assert.ok(slugs.has(slug), `not a product: ${r.destination}`);
  }
});

test('exact/strong are 308, candidates are 307', () => {
  for (const r of SHOPIFY_PRODUCT_REDIRECTS_PERMANENT) assert.equal(r.permanent, true, r.source);
  for (const r of SHOPIFY_PRODUCT_REDIRECTS_CANDIDATE) assert.equal(r.permanent, false, r.source);
});

test('spot-check specific product mappings', () => {
  const by = new Map(SHOPIFY_REDIRECTS.map(r => [r.source, r]));
  const expect = (s: string, d: string, p: boolean) => {
    const r = by.get(s);
    assert.ok(r, `missing ${s}`);
    assert.equal(r!.destination, d);
    assert.equal(r!.permanent, p);
  };
  expect('/products/newport-crib', '/product/newport-crib', true);
  expect('/products/mini-newport', '/product/mini-newport-with-mattress', true);
  expect('/products/three-quarter-guard-rail', '/product/34-guard-rail', false);
  expect('/products/oto-490-guard-rail', '/product/full-guard-rail', false);
});

test('the two weak FQP conversion-kit handles are left as 404', () => {
  const s = new Set(SHOPIFY_REDIRECTS.map(r => r.source));
  assert.ok(!s.has('/products/fqp-102-toddler-conversion-kit'));
  assert.ok(!s.has('/products/fqp-103-full-bedrails-conversion-kit'));
});
