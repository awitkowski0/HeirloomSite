/*
 * Pricing App #55: variant rel=canonical / og:url point at the base product;
 * sitemap lists 76 preferred URLs (adds /privacy, drops 173 variants).
 * Merchant Conditional GO 7118897871 guards stay in force. Run with `npm test`.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sitemap from '../src/app/sitemap';
import robots from '../src/app/robots';
import { merchantFeedXml, feedItems } from '../src/lib/merchant-feed';
import { getInventory, getAllProductSlugs } from '../src/lib/content';
import { productCanonicalPath, variantHref, variantPathsFor } from '../src/lib/variants';
import { BRAND_SITE_URL, SITE_URL } from '../src/lib/seo';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel: string) => readFileSync(resolve(root, rel), 'utf8');

const HOST = SITE_URL;
const BRAND = 'https://heirloomcribsandmore.com';

function pathOf(url: string): string {
  assert.ok(url.startsWith(HOST), `not on brand host: ${url}`);
  return url.slice(HOST.length) || '/';
}

function classify(
  url: string,
): 'home' | 'static' | 'category' | 'collection' | 'product_base' | 'product_variant' {
  const path = pathOf(url);
  if (path === '/') return 'home';
  if (path.startsWith('/products/') && path !== '/products') return 'category';
  if (path.startsWith('/collections/') && path !== '/collections') return 'collection';
  if (path.startsWith('/product/')) {
    const parts = path.split('/').filter(Boolean);
    return parts.length === 2 ? 'product_base' : 'product_variant';
  }
  return 'static';
}

// Counts are derived, not hard-coded: adding, hiding or de-listing a product
// must not break this test. The rules it guards are structural.
test('#55 sitemap: brand host only, no duplicates, /privacy present, base product URLs only (no variants)', () => {
  const entries = sitemap();
  const urls = entries.map(e => e.url);
  assert.ok(urls.length > 0);
  assert.equal(new Set(urls).size, urls.length);
  assert.equal(BRAND_SITE_URL, BRAND);
  assert.equal(SITE_URL.includes('vercel.app'), false);
  for (const url of urls) {
    assert.ok(url.startsWith(`${HOST}/`) || url === `${HOST}/`, url);
    assert.equal(url.includes('vercel.app'), false, url);
    const entry = entries.find(e => e.url === url);
    assert.ok(entry);
    assert.equal(Object.hasOwn(entry, 'lastModified'), false, url);
  }
  const counts = {
    home: 0,
    static: 0,
    category: 0,
    collection: 0,
    product_base: 0,
    product_variant: 0,
  };
  for (const url of urls) counts[classify(url)]++;
  assert.equal(counts.home, 1);
  assert.equal(counts.product_variant, 0);
  assert.ok(counts.product_base > 0);
  const slugs = new Set(getAllProductSlugs());
  for (const url of urls.filter(u => classify(u) === 'product_base')) {
    assert.ok(slugs.has(pathOf(url).split('/')[2]), `sitemap names an unknown product: ${url}`);
  }
  assert.ok(urls.includes(`${HOST}/privacy`));
  const sitemapSrc = read('src/app/sitemap.ts');
  assert.match(sitemapSrc, /url: `\$\{SITE_URL\}\/privacy`/);
  assert.doesNotMatch(sitemapSrc, /vercel\.app/);
});

test('#55 robots.txt still allows product paths and does not noindex them', () => {
  const manifest = robots();
  const rules = Array.isArray(manifest.rules) ? manifest.rules : [manifest.rules];
  for (const rule of rules) {
    const disallow = 'disallow' in rule ? rule.disallow : undefined;
    const list = Array.isArray(disallow) ? disallow : disallow ? [disallow] : [];
    assert.deepEqual(list, ['/checkout', '/search', '/api/']);
    assert.equal(list.some(d => String(d).startsWith('/product')), false);
  }
  assert.equal(manifest.sitemap, `${HOST}/sitemap.xml`);
});

test('#55 /privacy metadata is self-canonical with matching og:url', () => {
  const src = read('src/app/privacy/page.tsx');
  assert.match(src, /alternates:\s*\{\s*canonical:\s*'\/privacy'\s*\}/);
  assert.match(src, /url:\s*'\/privacy'/);
  // A page-level openGraph replaces the layout's: the share card must be whole.
  for (const field of ['title:', 'description:', 'images:', 'siteName:']) {
    assert.ok(src.includes(field), `/privacy openGraph missing ${field}`);
  }
});

test('#55 productCanonicalPath is the base product, distinct from a finish landing URL', () => {
  assert.equal(productCanonicalPath('addison-crib'), '/product/addison-crib');
  assert.equal(productCanonicalPath('arched-top'), '/product/arched-top');
  assert.equal(productCanonicalPath('bloomington'), '/product/bloomington');
  assert.equal(variantHref('addison-crib', 'natural'), '/product/addison-crib/natural');
  assert.equal(variantHref('arched-top', 'driftwood'), '/product/arched-top/driftwood');
  assert.equal(variantHref('bloomington', 'brown_maple'), '/product/bloomington/brown_maple');
  assert.notEqual(productCanonicalPath('addison-crib'), variantHref('addison-crib', 'natural'));
});

test('#55 generateMetadata sets canonical and og:url to the base; titles stay variant-specific; no noindex on variants', () => {
  const src = read('src/app/product/[slug]/[[...variant]]/page.tsx');
  assert.match(src, /const canonical = productCanonicalPath\(slug\);/);
  assert.match(src, /alternates:\s*\{\s*canonical\s*\}/);
  assert.match(src, /url:\s*canonical/);
  assert.match(src, /const title = variantName \? `\$\{product\.productName\} in \$\{variantName\}` : baseTitle;/);
  assert.match(src, /robots:\s*\{\s*index:\s*false\s*\}/);
  const robotsLine = src.indexOf('robots: { index: false }');
  const notFoundReturn = src.indexOf("if (!data) return { title: 'Product not found'");
  assert.ok(robotsLine > 0 && notFoundReturn > 0 && robotsLine > notFoundReturn);
  assert.ok(robotsLine < src.indexOf('const canonical = productCanonicalPath(slug);'));
});

test('#55 variant static params remain, so <g:link> URLs still build as HTTP 200 pages (no redirect)', () => {
  const slugs = getAllProductSlugs();
  const inventory = getInventory();
  const keys = new Set<string>();
  for (const slug of slugs) {
    const configurations = inventory.filter(i => i.slug === slug);
    for (const variant of variantPathsFor(configurations)) {
      keys.add([slug, ...variant].join('/'));
    }
  }
  assert.ok(keys.has('addison-crib/natural'));
  assert.ok(keys.has('arched-top/driftwood'));
  assert.ok(keys.has('bloomington/brown_maple'));
  assert.ok(keys.has('addison-crib'));
  const page = read('src/app/product/[slug]/[[...variant]]/page.tsx');
  assert.match(page, /for \(const variant of variantPathsFor\(configurations\)\)/);
  assert.doesNotMatch(page, /redirect\(/);
});

test('#55 product page JSON-LD offer path stays the variant URL, not the base canonical', () => {
  const src = read('src/app/product/[slug]/[[...variant]]/page.tsx');
  assert.match(src, /const canonical = productCanonicalPath\(slug\);/);
  assert.match(src, /path:\s*variantHref\(slug,\s*resolved\.wood,\s*resolved\.stain\)/);
  assert.match(src, /sku:\s*config\.sku/);
});

test('#55 feed.xml is unchanged: every item keeps variant <g:link> and item_group_id (guards 1 and 7)', () => {
  const inventory = getInventory();
  const xml = merchantFeedXml(inventory);
  const items = xml.match(/<item>[\s\S]*?<\/item>/g) ?? [];
  assert.ok(items.length > 0);
  assert.equal(items.length, feedItems(inventory).length);
  const links = [...xml.matchAll(/<g:link>([^<]+)<\/g:link>/g)].map(m => m[1]);
  const groups = [...xml.matchAll(/<g:item_group_id>([^<]+)<\/g:item_group_id>/g)].map(m => m[1]);
  assert.equal(links.length, items.length);
  assert.equal(groups.length, items.length);
  assert.equal(xml.includes('<g:canonical_link>'), false);
  const samples = [
    {
      idNeedle: 'OTO-1201-BrownMaple_OCS_100_Natural',
      link: `${BRAND}/product/addison-crib/natural`,
    },
    {
      idNeedle: 'FQP-201-BrownMaple_OCS_100_Driftwood',
      link: `${BRAND}/product/arched-top/driftwood`,
    },
    { idNeedle: 'FQP-601', link: `${BRAND}/product/bloomington/brown_maple` },
  ];
  for (const sample of samples) {
    const item = items.find(i => i.includes(`<g:id>${sample.idNeedle}`));
    assert.ok(item, `missing feed item ${sample.idNeedle}`);
    const escaped = sample.link.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    assert.match(item, new RegExp(`<g:link>${escaped}</g:link>`));
  }
  // Variant landing URLs are still used as <g:link> (not collapsed to the base).
  assert.ok(
    links.some(l => l.replace(BRAND, '').split('/').filter(Boolean).length > 2),
    'no feed item links to a variant URL',
  );
});
