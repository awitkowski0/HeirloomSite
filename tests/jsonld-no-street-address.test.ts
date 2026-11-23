import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  organizationJsonLd,
  webSiteJsonLd,
  merchantReturnPolicyJsonLd,
  productJsonLd,
  breadcrumbJsonLd,
  itemListJsonLd,
  faqPageJsonLd,
  jsonLdScript,
} from '../src/lib/seo';

/*
 * Pricing App #63 / #243 / ADDR-1: Organization JSON-LD has no street
 * and no LocalBusiness. PostalAddress is Bethlehem, PA 18020.
 */

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function assertNoStreetInJsonLd(label: string, data: unknown) {
  const raw = jsonLdScript(data);
  assert.ok(!/"streetAddress"/.test(raw), `${label}: streetAddress key in JSON-LD`);
  assert.ok(!/"LocalBusiness"/.test(raw), `${label}: LocalBusiness in JSON-LD`);
}

test('Organization JSON-LD keeps city/region/postal/country and has no street', () => {
  const ld = organizationJsonLd();
  const address = ld.address as Record<string, unknown>;
  assert.equal(address['@type'], 'PostalAddress');
  assert.equal(address.addressLocality, 'Bethlehem');
  assert.equal(address.addressRegion, 'PA');
  assert.equal(address.postalCode, '18020');
  assert.equal(address.addressCountry, 'US');
  assert.equal(address.streetAddress, undefined);
  assert.equal(ld['@type'], 'Organization');
  assertNoStreetInJsonLd('organizationJsonLd', ld);
});

test('every JSON-LD builder omits streetAddress and LocalBusiness', () => {
  assertNoStreetInJsonLd('organizationJsonLd', organizationJsonLd());
  assertNoStreetInJsonLd('webSiteJsonLd', webSiteJsonLd());
  assertNoStreetInJsonLd('merchantReturnPolicyJsonLd', merchantReturnPolicyJsonLd());
  assertNoStreetInJsonLd(
    'productJsonLd',
    productJsonLd({
      name: 'Test',
      path: '/product/test',
      description: 'Test',
      images: ['/x.jpg'],
      sku: 'OTO-1201',
      priceDollars: 100,
      inStock: true,
    }),
  );
  assertNoStreetInJsonLd(
    'breadcrumbJsonLd',
    breadcrumbJsonLd([
      { name: 'Home', path: '/' },
      { name: 'Test', path: '/product/test' },
    ]),
  );
  assertNoStreetInJsonLd(
    'itemListJsonLd',
    itemListJsonLd(
      [{ slug: 'test', productName: 'Test' } as never],
      '/products',
    ),
  );
  assertNoStreetInJsonLd(
    'faqPageJsonLd',
    faqPageJsonLd([{ question: 'Q?', answerText: 'A.' }]),
  );
});

test('built HTML ld+json blocks have no streetAddress or LocalBusiness (when .next exists)', () => {
  const built = resolve(root, '.next/server/app');
  if (!existsSync(built)) {
    // npm test runs before next build; the builder tests above still guard the source.
    return;
  }
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      const st = statSync(p);
      if (st.isDirectory()) walk(p);
      else if (name.endsWith('.html')) files.push(p);
    }
  };
  walk(built);
  assert.ok(files.length > 0, 'expected prerendered HTML under .next/server/app');
  let blocks = 0;
  for (const file of files) {
    const html = readFileSync(file, 'utf8');
    const re = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(html))) {
      blocks += 1;
      const body = m[1];
      assert.ok(!/"streetAddress"/.test(body), `${file}: streetAddress in ld+json`);
      assert.ok(!/"LocalBusiness"/.test(body), `${file}: LocalBusiness in ld+json`);
    }
  }
  assert.ok(blocks > 0, 'expected at least one ld+json block in built HTML');
});
