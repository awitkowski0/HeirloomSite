import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/*
 * HeirloomSite #158 / Phil t2095u: LOGO-1, STARTING-AT-1, CHECKOUT-1.
 * The updated logo is in the shared header and footer. Storefront pricing
 * (not checkout) is labeled "Starting at".
 */

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel: string) => readFileSync(resolve(root, rel), 'utf8');

test('updated logo files exist and are 128px-tall transparent PNGs', () => {
  const wide = resolve(root, 'public/brand/logo-wide.png');
  const text = resolve(root, 'public/brand/logo-text.png');
  assert.ok(existsSync(wide), 'public/brand/logo-wide.png missing');
  assert.ok(existsSync(text), 'public/brand/logo-text.png missing');
  assert.ok(statSync(wide).size > 10_000, 'logo-wide.png unexpectedly small');
  assert.ok(statSync(text).size > 10_000, 'logo-text.png unexpectedly small');
  const info = (rel: string) => {
    const buf = readFileSync(resolve(root, rel));
    assert.equal(buf.subarray(0, 8).toString('binary'), '\x89PNG\r\n\x1a\n');
    const w = buf.readUInt32BE(16);
    const h = buf.readUInt32BE(20);
    const colorType = buf[25];
    return { w, h, colorType, bytes: buf.length };
  };
  const wideInfo = info('public/brand/logo-wide.png');
  const textInfo = info('public/brand/logo-text.png');
  assert.equal(wideInfo.h, 128);
  assert.equal(wideInfo.w, 562);
  assert.equal(wideInfo.colorType, 6, 'logo-wide must be RGBA');
  assert.equal(textInfo.h, 128);
  assert.equal(textInfo.w, 452);
  assert.equal(textInfo.colorType, 6, 'logo-text must be RGBA');
});

test('layout uses the shared Header and Footer on every page', () => {
  const layout = read('src/app/layout.tsx');
  assert.ok(layout.includes("import Header from '@/components/layout/Header'"));
  assert.ok(layout.includes("import Footer from '@/components/layout/Footer'"));
  assert.ok(layout.includes('<Header'));
  assert.ok(layout.includes('<Footer'));
});

const PRICE_SOURCES = [
  'src/components/products/ProductCard.tsx',
  'src/components/shop/PieceLink.tsx',
  'src/components/gallery/GalleryCard.tsx',
  'src/components/gallery/GalleryCarousel.tsx',
  'src/components/search/SearchResultItem.tsx',
  'src/components/search/SearchResults.tsx',
  'src/components/product/ProductConfigurator.tsx',
  'src/components/product/BundleBuilder.tsx',
  'src/components/home/StyleCards.tsx',
];

test('storefront pricing labels use Starting at, not From', () => {
  for (const rel of PRICE_SOURCES) {
    const src = read(rel);
    assert.ok(src.includes('Starting at'), `${rel} missing "Starting at"`);
    assert.ok(!/`From \$\{/.test(src), `${rel} still has a From price template`);
    assert.ok(!/>From \{/.test(src), `${rel} still has a From price prefix`);
  }
});
