import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  SHOPIFY_REDIRECTS,
  SHOPIFY_PRODUCT_REDIRECTS_PERMANENT,
  SHOPIFY_PRODUCT_REDIRECTS_CANDIDATE,
  SHOPIFY_PAGE_REDIRECTS_PERMANENT,
  SHOPIFY_PAGE_REDIRECTS_TEMPORARY,
} from '@/lib/shopify-redirects';
import { getAllProductSlugs } from '@/lib/content';

test('redirect table has the expected group sizes', () => {
  assert.equal(SHOPIFY_PRODUCT_REDIRECTS_PERMANENT.length, 57);
  assert.equal(SHOPIFY_PRODUCT_REDIRECTS_CANDIDATE.length, 3);
  assert.equal(SHOPIFY_PAGE_REDIRECTS_PERMANENT.length, 13);
  assert.equal(SHOPIFY_PAGE_REDIRECTS_TEMPORARY.length, 2);
  assert.equal(SHOPIFY_REDIRECTS.length, 75);
});

test('every rule is well-formed, path-only, with no self-redirect', () => {
  for (const r of SHOPIFY_REDIRECTS) {
    assert.ok(r.source.startsWith('/'), `source not a path: ${r.source}`);
    assert.ok(r.destination.startsWith('/'), `destination not a path: ${r.destination}`);
    assert.equal(typeof r.permanent, 'boolean', `permanent not boolean: ${r.source}`);
    assert.notEqual(r.source, r.destination, `self redirect: ${r.source}`);
    assert.ok(!r.source.includes('?'), `source carries a query: ${r.source}`);
    assert.ok(!r.destination.includes('?'), `destination carries a query: ${r.destination}`);
  }
});

test('sources are unique (no rule is shadowed by another)', () => {
  const sources = SHOPIFY_REDIRECTS.map(r => r.source);
  assert.equal(new Set(sources).size, sources.length);
});

test('no source is also a destination (no redirect chains within the table)', () => {
  const sources = new Set(SHOPIFY_REDIRECTS.map(r => r.source));
  for (const r of SHOPIFY_REDIRECTS) {
    assert.ok(!sources.has(r.destination), `chain: ${r.source} -> ${r.destination}`);
  }
});

test('every /product/<slug> destination is a real product page', () => {
  const slugs = new Set(getAllProductSlugs());
  for (const r of SHOPIFY_REDIRECTS) {
    if (r.destination.startsWith('/product/')) {
      const slug = r.destination.slice('/product/'.length);
      assert.ok(slugs.has(slug), `redirect target is not a product: ${r.destination}`);
    }
  }
});

test('exact/strong product handles are permanent (308)', () => {
  for (const r of SHOPIFY_PRODUCT_REDIRECTS_PERMANENT) {
    assert.equal(r.permanent, true, `${r.source} should be permanent`);
    assert.ok(r.source.startsWith('/products/'));
    assert.ok(r.destination.startsWith('/product/'));
  }
});

test('candidate product handles are temporary (307), pending review', () => {
  for (const r of SHOPIFY_PRODUCT_REDIRECTS_CANDIDATE) {
    assert.equal(r.permanent, false, `${r.source} should be temporary`);
  }
});

test('page/policy/collection equivalents are permanent (308)', () => {
  for (const r of SHOPIFY_PAGE_REDIRECTS_PERMANENT) {
    assert.equal(r.permanent, true, `${r.source} should be permanent`);
  }
});

test('spot-check specific mappings and statuses', () => {
  const by = new Map(SHOPIFY_REDIRECTS.map(r => [r.source, r]));
  const expect = (source: string, destination: string, permanent: boolean) => {
    const r = by.get(source);
    assert.ok(r, `missing rule: ${source}`);
    assert.equal(r!.destination, destination, `dest for ${source}`);
    assert.equal(r!.permanent, permanent, `permanent for ${source}`);
  };
  expect('/products/newport-crib', '/product/newport-crib', true);
  expect('/products/mini-newport', '/product/mini-newport-with-mattress', true);
  expect('/products/three-quarter-guard-rail', '/product/34-guard-rail', false);
  expect('/products/oto-490-guard-rail', '/product/guard-rail', true);
  expect('/products/oto-401a-toddler-rail', '/product/toddler-conversion-rail', true);
  expect('/pages/caring-for-your-custom-wood-furniture', '/care', true);
  expect('/pages/data-sharing-opt-out', '/privacy', false);
  expect('/policies/refund-policy', '/returns', true);
  expect('/policies/terms-of-service', '/terms', true);
  expect('/collections/all', '/products', true);
  expect('/collections/baby-cribs', '/products/cribs', true);
  expect('/collections/newport-collection', '/collections/newport', true);
  expect('/cart', '/checkout', true);
  expect('/pages/about-us', '/', false);
});

test('URLs with no true equivalent are deliberately absent (stay 404)', () => {
  const sources = new Set(SHOPIFY_REDIRECTS.map(r => r.source));
  for (const left404 of [
    '/products/fqp-102-toddler-conversion-kit',
    '/products/fqp-103-full-bedrails-conversion-kit',
    '/collections/box-tops',
    '/pages/my-journey',
    '/password',
    '/v1/produce',
    '/account',
    '/account/login',
    '/blogs/news',
    '/products/woolable-sheep-of-the-world-tundra-washable-wool-hand-tufted-non-slip-backing-area-rug-blended-sheep-beige',
  ]) {
    assert.ok(!sources.has(left404), `should be left as 404: ${left404}`);
  }
});
