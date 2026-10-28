import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  SHOPIFY_REDIRECTS,
  SHOPIFY_PRODUCT_REDIRECTS_PERMANENT,
  SHOPIFY_PAGE_REDIRECTS_PERMANENT,
  SHOPIFY_GONE_PATHS,
  GONE_ROUTE,
} from '@/lib/shopify-redirects';
import { GET as goneGET, HEAD as goneHEAD } from '@/app/gone/route';
import nextConfig from '../next.config';
import { getAllProductSlugs } from '@/lib/content';

test('redirect table has the expected group sizes', () => {
  assert.equal(SHOPIFY_PRODUCT_REDIRECTS_PERMANENT.length, 60);
  assert.equal(SHOPIFY_PAGE_REDIRECTS_PERMANENT.length, 17);
  assert.equal(SHOPIFY_REDIRECTS.length, 77);
  assert.equal(SHOPIFY_REDIRECTS.filter(r => r.permanent).length, 77);
  assert.equal(SHOPIFY_REDIRECTS.filter(r => !r.permanent).length, 0);
  assert.equal(SHOPIFY_GONE_PATHS.length, 1);
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

const ruleFor = (source: string) => {
  const r = SHOPIFY_REDIRECTS.find(x => x.source === source);
  assert.ok(r, `missing rule: ${source}`);
  return r!;
};

// Decision a1: the three rail handles are confirmed, so permanent (308).
test('a1: /products/oto-401b-bed-rail -> /product/full-bed-rail-kit is 308', () => {
  const r = ruleFor('/products/oto-401b-bed-rail');
  assert.equal(r.destination, '/product/full-bed-rail-kit');
  assert.equal(r.permanent, true);
});

test('a1: /products/oto-475-3-4-guard-rail -> /product/34-guard-rail is 308', () => {
  const r = ruleFor('/products/oto-475-3-4-guard-rail');
  assert.equal(r.destination, '/product/34-guard-rail');
  assert.equal(r.permanent, true);
});

test('a1: /products/three-quarter-guard-rail -> /product/34-guard-rail is 308', () => {
  const r = ruleFor('/products/three-quarter-guard-rail');
  assert.equal(r.destination, '/product/34-guard-rail');
  assert.equal(r.permanent, true);
});

// Oct 28: the last three 307s are promoted to 308.
test('/pages/my-journey -> /about-heirloom is 308', () => {
  const r = ruleFor('/pages/my-journey');
  assert.equal(r.destination, '/about-heirloom');
  assert.equal(r.permanent, true);
});

test('/pages/about-us -> /about-heirloom is 308', () => {
  const r = ruleFor('/pages/about-us');
  assert.equal(r.destination, '/about-heirloom');
  assert.equal(r.permanent, true);
});

test('/collections/box-tops -> /products/dressers-changing-tables is 308', () => {
  const r = ruleFor('/collections/box-tops');
  assert.equal(r.destination, '/products/dressers-changing-tables');
  assert.equal(r.permanent, true);
});

test('NO redirect in the old-store table is temporary (every mapping is a 308)', () => {
  const temporary = SHOPIFY_REDIRECTS.filter(r => r.permanent !== true).map(r => r.source);
  assert.deepEqual(temporary, [], `temporary redirects found: ${temporary.join(', ')}`);
});

test('/about-heirloom (the new target for about-us and my-journey) is a real page', () => {
  assert.ok(existsSync(join(process.cwd(), 'src/app/about-heirloom/page.tsx')));
});

// Decision b1: the withdrawn Tundra rug answers 410 Gone.
const TUNDRA =
  '/products/woolable-sheep-of-the-world-tundra-washable-wool-hand-tufted-non-slip-backing-area-rug-blended-sheep-beige';

test('b1: the Tundra rug URL is rewritten to the 410 route, not redirected', async () => {
  assert.ok(SHOPIFY_GONE_PATHS.includes(TUNDRA));
  assert.ok(!SHOPIFY_REDIRECTS.some(r => r.source === TUNDRA), 'must not also be a redirect');
  const rewrites = await nextConfig.rewrites!();
  assert.ok(!Array.isArray(rewrites), 'rewrites should use the phased form');
  const before = (rewrites as { beforeFiles: { source: string; destination: string }[] }).beforeFiles;
  assert.ok(
    before.some(r => r.source === TUNDRA && r.destination === GONE_ROUTE),
    'missing beforeFiles rewrite for the Tundra rug',
  );
});

test('b1: the gone route answers 410 with noindex (GET and HEAD)', async () => {
  for (const res of [goneGET(), goneHEAD()]) {
    assert.equal(res.status, 410);
    assert.equal(res.headers.get('x-robots-tag'), 'noindex');
  }
  assert.match(await goneGET().text(), /no longer available/);
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
  expect('/products/three-quarter-guard-rail', '/product/34-guard-rail', true);
  expect('/products/oto-490-guard-rail', '/product/guard-rail', true);
  expect('/products/oto-401a-toddler-rail', '/product/toddler-conversion-rail', true);
  expect('/pages/caring-for-your-custom-wood-furniture', '/care', true);
  expect('/pages/data-sharing-opt-out', '/privacy', true);
  expect('/policies/refund-policy', '/returns', true);
  expect('/policies/terms-of-service', '/terms', true);
  expect('/collections/all', '/products', true);
  expect('/collections/baby-cribs', '/products/cribs', true);
  expect('/collections/newport-collection', '/collections/newport', true);
  expect('/cart', '/checkout', true);
  expect('/pages/about-us', '/about-heirloom', true);
  expect('/pages/my-journey', '/about-heirloom', true);
  expect('/collections/box-tops', '/products/dressers-changing-tables', true);
});

test('URLs with no equivalent are deliberately absent from the redirects (404, or 410 for the rug)', () => {
  const sources = new Set(SHOPIFY_REDIRECTS.map(r => r.source));
  for (const left404 of [
    '/products/fqp-102-toddler-conversion-kit',
    '/products/fqp-103-full-bedrails-conversion-kit',
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
