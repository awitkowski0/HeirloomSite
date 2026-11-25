/*
 * Pricing App #63 slice 3 signed lines + #65 Muse MU4 fact block / JSON-LD
 * (Brand C 6949790350; CoS patch list 7117942456). Run with `npm test`.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sitemap from '../src/app/sitemap';
import { merchantFeedXml, feedItems, itemMaterial } from '../src/lib/merchant-feed';
import { getInventory, getProductBySlug } from '../src/lib/content';
import { organizationJsonLd, productJsonLd, BRAND_SITE_URL, SITE_URL } from '../src/lib/seo';
import {
  FACT_DELIVERY,
  FACT_LEAD_TIME_FQP,
  FACT_LEAD_TIME_OTO,
  FACT_MADE_TO_ORDER,
  FACT_ORDERING,
  FACT_RETURNS,
  FACT_SHIPPING,
  formatFactLine,
  productFactLines,
} from '../src/lib/product-fact-block';
import { PUBLISHED_EMAIL } from '../src/lib/published-contact';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel: string) => readFileSync(resolve(root, rel), 'utf8');
const BRAND = 'https://heirloomcribsandmore.com';
const CANONICAL_EMAIL = 'HeirloomCribs.Care@HeirloomCribsandMore.com';
const WOMAN_OWNED = 'Heirloom Cribs & More is a woman-owned business.';
const NEWARK =
  'We deliver in Pennsylvania, New Jersey and Maryland. Delivery to some Newark, NJ ZIP codes is quoted individually.';

test('#63 slice 3: /about-heirloom uses the canonical Newark, NJ sentence', () => {
  const src = read('src/app/about-heirloom/page.tsx');
  assert.ok(src.includes(NEWARK));
  assert.equal(src.includes('delivery to some ZIP codes in Newark is quoted individually'), false);
});

test('#63 slice 3: /faq and /why-hardwood use the one signed woman-owned sentence', () => {
  const faq = read('src/app/faq/page.tsx');
  const why = read('src/app/why-hardwood/page.tsx');
  assert.ok(faq.includes('Heirloom Cribs &amp; More is a woman-owned business.'));
  assert.ok(why.includes('Heirloom Cribs &amp; More is a woman-owned business.'));
  assert.equal(faq.includes('women-owned shop'), false);
  assert.equal(why.includes('women-owned business based in'), false);
  assert.equal(faq.includes(WOMAN_OWNED) || faq.includes('woman-owned business.'), true);
});

test('#63 slice 3: /shipping, /returns, /terms and /woods-and-finishes show the canonical email', () => {
  assert.equal(PUBLISHED_EMAIL, CANONICAL_EMAIL);
  for (const rel of [
    'src/app/shipping/page.tsx',
    'src/app/returns/page.tsx',
    'src/app/terms/page.tsx',
    'src/app/woods-and-finishes/page.tsx',
  ]) {
    const src = read(rel);
    const visible = src.replace(/mailto:[^"'>\s]+/g, '');
    assert.ok(visible.includes(CANONICAL_EMAIL), `${rel} missing visible canonical email`);
    assert.equal(
      visible.includes('heirloomcribs.care@heirloomcribsandmore.com'),
      false,
      `${rel} still shows the lowercase email`,
    );
  }
});

test('#63: Organization JSON-LD still has no streetAddress and is not LocalBusiness', () => {
  const org = organizationJsonLd();
  const types = Array.isArray(org['@type']) ? org['@type'] : [org['@type']];
  assert.ok(types.includes('Organization'));
  assert.equal(types.includes('LocalBusiness'), false);
  const addr = org.address as Record<string, unknown> | undefined;
  if (addr) {
    assert.equal('streetAddress' in addr, false);
  }
  assert.equal(JSON.stringify(org).includes('streetAddress'), false);
  assert.equal(JSON.stringify(org).includes('LocalBusiness'), false);
});

test('#65 MU4: Addison crib fact block uses signed static lines, OTO lead time, wood, finishes and kits', () => {
  const product = getProductBySlug('addison-crib');
  assert.ok(product);
  const config = product.configurations[0];
  const lines = productFactLines(product, config);
  const byLabel = Object.fromEntries(lines.map(l => [l.label, l.text]));
  assert.equal(byLabel['Made to order'], FACT_MADE_TO_ORDER);
  assert.equal(byLabel.Builder, 'Old Town Oak');
  assert.equal(byLabel['Lead time'], FACT_LEAD_TIME_OTO);
  assert.equal(byLabel.Wood, itemMaterial(config));
  assert.ok(byLabel['Finishes on our site']);
  assert.ok(byLabel['Finishes on our site'].includes('Natural'));
  assert.equal(byLabel['Finishes on our site'].includes(', and '), false);
  assert.equal(byLabel['Conversion kits'], 'listed on this page. You can add them to your order.');
  assert.equal(byLabel.Delivery, FACT_DELIVERY);
  assert.equal(byLabel.Shipping, FACT_SHIPPING);
  assert.equal(byLabel.Ordering, FACT_ORDERING);
  assert.equal(byLabel.Returns, FACT_RETURNS);
  assert.ok(formatFactLine(lines[0]).startsWith('Made to order: '));
});

test('#65 MU4: French Country case goods omit finishes and conversion kits; Fisher crib uses feed brand and 10 to 14 week lead time', () => {
  const dresser = getProductBySlug('french-country-4-drawer-dresser');
  assert.ok(dresser);
  const dresserLines = Object.fromEntries(
    productFactLines(dresser, dresser.configurations[0]).map(l => [l.label, l.text]),
  );
  assert.equal('Finishes on our site' in dresserLines, false);
  assert.equal('Conversion kits' in dresserLines, false);
  assert.equal(dresserLines.Builder, 'Old Town Oak');
  assert.equal(dresserLines['Lead time'], FACT_LEAD_TIME_OTO);
  assert.equal(dresserLines.Delivery, FACT_DELIVERY);

  const crib = getProductBySlug('moyerton');
  assert.ok(crib);
  const cribLines = Object.fromEntries(
    productFactLines(crib, crib.configurations[0]).map(l => [l.label, l.text]),
  );
  assert.equal(cribLines.Builder, 'Fisher');
  assert.equal(cribLines['Lead time'], FACT_LEAD_TIME_FQP);
  assert.ok(cribLines['Finishes on our site']);
  assert.ok(cribLines['Conversion kits']);
});

test('#65 MU4: Wood line is omitted when feed material is blank; Kids Comfort has no signed lead time', () => {
  const inventory = getInventory();
  const blank = inventory.find(i => i.sku && itemMaterial(i) == null && i.slug);
  if (blank && blank.slug) {
    const product = getProductBySlug(blank.slug);
    assert.ok(product);
    const lines = productFactLines(product, blank);
    assert.equal(lines.some(l => l.label === 'Wood'), false);
  }
  const kc = inventory.find(i => (i.sku ?? '').startsWith('KC-') && i.slug);
  if (kc && kc.slug) {
    const product = getProductBySlug(kc.slug);
    assert.ok(product);
    const lines = productFactLines(product, kc);
    assert.equal(lines.some(l => l.label === 'Lead time'), false);
  }
});

test('#65 MU4 JSON-LD keeps shippingDetails and return policy; availability stays InStock (Google enum), no MadeToOrder, no street or LocalBusiness', () => {
  const ld = productJsonLd({
    name: 'Addison Crib in Natural',
    path: '/product/addison-crib/natural',
    description: 'Addison Crib in Natural',
    images: ['/x.jpg'],
    sku: 'OTO-1201-BrownMaple_OCS_100_Natural',
    priceDollars: 2500,
    inStock: true,
  });
  const offer = ld.offers as Record<string, unknown>;
  assert.equal(offer.availability, 'https://schema.org/InStock');
  assert.notEqual(offer.availability, 'https://schema.org/MadeToOrder');
  assert.ok(Array.isArray(offer.shippingDetails));
  assert.equal((offer.shippingDetails as unknown[]).length, 2);
  assert.ok(offer.hasMerchantReturnPolicy);
  const blob = JSON.stringify(ld);
  assert.equal(blob.includes('MadeToOrder'), false);
  assert.equal(blob.includes('streetAddress'), false);
  assert.equal(blob.includes('LocalBusiness'), false);
  assert.equal(blob.includes('vercel.app'), false);
  const brand = ld.brand as { name?: string };
  assert.equal(brand.name, 'Old Town Oak');
});

test('L-20261123-7: canonical host is the brand site; sitemap and feed are unchanged in this PR', () => {
  assert.equal(BRAND_SITE_URL, BRAND);
  assert.equal(String(SITE_URL).includes('vercel.app'), false);
  assert.equal(BRAND_SITE_URL.includes('vercel.app'), false);
  const urls = sitemap().map(e => e.url);
  assert.equal(urls.every(u => u.startsWith(String(SITE_URL))), true);
  assert.equal(urls.some(u => u.includes('vercel.app')), false);
  // origin/dev still lists base + variant product URLs (HS #170 is not in this branch).
  assert.equal(urls.length, 248);
  const inventory = getInventory();
  const xml = merchantFeedXml(inventory);
  assert.equal(feedItems(inventory).length, 136);
  assert.equal((xml.match(/<g:link>/g) ?? []).length, 136);
  assert.equal(xml.includes('vercel.app'), false);
});

test('#63 flags left unsigned lines unchanged: origin wording is not rewritten here', () => {
  const about = read('src/app/about-heirloom/page.tsx');
  // Gap 7 is held under #25 Q10 — this PR must not invent a replacement.
  assert.ok(/made in the U\.S\. by craftspeople|made in the U.S./i.test(about) || about.includes('craftspeople'));
});
