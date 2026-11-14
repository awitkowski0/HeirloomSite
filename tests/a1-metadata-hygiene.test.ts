import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SITE_NAME, SITE_URL, webSiteJsonLd } from '../src/lib/seo';

/*
 * Pricing App #55 A1 (a3–a5): og:url on /products and /collections,
 * /search and 404 drop the inherited homepage canonical, one robots tag
 * each, and the WebSite JSON-LD no longer carries a SearchAction.
 */

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel: string) => readFileSync(resolve(root, rel), 'utf8');

test('/products and /collections set og:url to their own path', () => {
  const products = read('src/app/products/page.tsx');
  assert.match(products, /alternates:\s*\{\s*canonical:\s*'\/products'\s*\}/);
  assert.match(products, /openGraph:\s*\{\s*url:\s*'\/products'\s*\}/);

  const collections = read('src/app/collections/page.tsx');
  assert.match(collections, /alternates:\s*\{\s*canonical:\s*'\/collections'\s*\}/);
  assert.match(collections, /openGraph:\s*\{\s*url:\s*'\/collections'\s*\}/);
});

test('/search and 404 drop the inherited homepage canonical', () => {
  const search = read('src/app/search/page.tsx');
  assert.match(search, /alternates:\s*\{\s*canonical:\s*null\s*\}/);
  assert.doesNotMatch(search, /canonical:\s*'\/'/);

  const notFound = read('src/app/not-found.tsx');
  assert.match(notFound, /alternates:\s*\{\s*canonical:\s*null\s*\}/);
  assert.doesNotMatch(notFound, /canonical:\s*'\/'/);
});

test('/search keeps a single noindex, follow robots setting; 404 does not add a second robots export', () => {
  const search = read('src/app/search/page.tsx');
  assert.match(search, /robots:\s*\{\s*index:\s*false,\s*follow:\s*true\s*\}/);
  assert.equal([...search.matchAll(/\brobots\s*:/g)].length, 1);

  const notFound = read('src/app/not-found.tsx');
  assert.doesNotMatch(notFound, /\brobots\s*:/);
});

test('WebSite JSON-LD keeps name and url and has no SearchAction', () => {
  const data = webSiteJsonLd();
  assert.equal(data['@type'], 'WebSite');
  assert.equal(data.name, SITE_NAME);
  assert.equal(data.url, SITE_URL);
  assert.equal(SITE_NAME, 'Heirloom Cribs & More');
  assert.ok(String(SITE_URL).startsWith('http'));
  assert.ok(!String(SITE_URL).includes('vercel.app'));
  assert.equal(data.potentialAction, undefined);
  assert.doesNotMatch(JSON.stringify(data), /SearchAction/);
});

test('search box and robots Disallow: /search are unchanged', () => {
  const robots = read('src/app/robots.ts');
  assert.match(robots, /disallow: \['\/checkout', '\/search', '\/api\/'\]/);

  const searchBar = read('src/components/search/SearchBar.tsx');
  assert.match(searchBar, /role=["']search["']/);
});
