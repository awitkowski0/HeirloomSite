import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { BRAND_SITE_URL } from '@/lib/seo';

/*
 * The builder/about pages are React server components (.tsx), which node --test
 * cannot import (its type-stripping does not handle JSX). So these assertions
 * read the page source as text. `npm run build` is what proves each route
 * actually renders/prerenders; the Vercel preview curl check (in the PR body)
 * proves the rendered canonical resolves to the brand domain.
 */
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (f: string) => readFileSync(resolve(root, f), 'utf8');

const PAGES = [
  { route: '/builders/old-town-oak', file: 'src/app/builders/old-town-oak/page.tsx' },
  {
    route: '/builders/fishers-quality-products',
    file: 'src/app/builders/fishers-quality-products/page.tsx',
  },
  { route: '/builders/kids-comfort', file: 'src/app/builders/kids-comfort/page.tsx' },
  { route: '/about-heirloom', file: 'src/app/about-heirloom/page.tsx' },
];

const FORBIDDEN = ['exceeds all safety standards', 'delivery included', 'free shipping', '.vercel.app'];

test('(a) every builder/about page exports a default component and metadata', () => {
  for (const p of PAGES) {
    const src = read(p.file);
    assert.match(src, /export default function/, `${p.route} has no default component`);
    assert.match(src, /export const metadata/, `${p.route} has no metadata`);
  }
});

test('(b) forbidden phrases never appear on the new pages', () => {
  for (const p of PAGES) {
    const src = read(p.file).toLowerCase();
    for (const phrase of FORBIDDEN) {
      assert.ok(!src.includes(phrase.toLowerCase()), `${p.route} contains forbidden phrase: ${phrase}`);
    }
  }
});

test('(c) FQP says Pennsylvania; OTO and KC never claim Pennsylvania', () => {
  const fqp = read('src/app/builders/fishers-quality-products/page.tsx');
  assert.match(fqp, /Made in Pennsylvania/, 'FQP page must say "Made in Pennsylvania"');

  for (const file of [
    'src/app/builders/old-town-oak/page.tsx',
    'src/app/builders/kids-comfort/page.tsx',
  ]) {
    const src = read(file);
    // The word "Pennsylvania" may appear (Heirloom is a PA-based reseller); what
    // is forbidden is a PA *origin* claim for a non-FQP builder's furniture.
    assert.ok(
      !/made in pennsylvania|built in pennsylvania/i.test(src),
      `${file} must not make a Pennsylvania origin claim (PA is FQP-only)`
    );
    assert.match(src, /made in the USA/, `${file} should carry the made-in-the-USA line`);
  }
});

test('(d) each page sets a canonical, and the brand host is heirloomcribsandmore.com (never a vercel.app host)', () => {
  assert.equal(BRAND_SITE_URL, 'https://heirloomcribsandmore.com');
  assert.ok(!BRAND_SITE_URL.includes('vercel.app'));
  for (const p of PAGES) {
    const src = read(p.file);
    assert.ok(
      src.includes(`canonical: '${p.route}'`) || src.includes(`canonical: "${p.route}"`),
      `${p.route} must set its own canonical (resolves against metadataBase = ${BRAND_SITE_URL})`
    );
  }
});

test('builder/about routes are in the sitemap and linked in the footer (no orphans)', () => {
  const sitemap = read('src/app/sitemap.ts');
  const footer = read('src/components/layout/Footer.tsx');
  for (const p of PAGES) {
    assert.ok(sitemap.includes(`${'${SITE_URL}'}${p.route}`), `${p.route} missing from sitemap`);
    assert.ok(footer.includes(`href="${p.route}"`), `${p.route} missing a footer link`);
  }
});
