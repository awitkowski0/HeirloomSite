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
 * Pricing App #63 / Nov 15 decision: 421 Manor Dr is mail-only and must
 * never appear in JSON-LD. PostalAddress may keep locality, region,
 * postal code and country. Visible page copy is unchanged.
 */

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function assertNoStreetInJsonLd(label: string, data: unknown) {
  const raw = jsonLdScript(data);
  assert.ok(!/"streetAddress"/.test(raw), `${label}: streetAddress key in JSON-LD`);
  assert.ok(!/421 Manor/i.test(raw), `${label}: "421 Manor" in JSON-LD`);
}

test('Organization JSON-LD keeps city/region/postal/country and has no street', () => {
  const ld = organizationJsonLd();
  const address = ld.address as Record<string, unknown>;
  assert.equal(address['@type'], 'PostalAddress');
  assert.equal(address.addressLocality, 'Nazareth');
  assert.equal(address.addressRegion, 'PA');
  assert.equal(address.postalCode, '18064');
  assert.equal(address.addressCountry, 'US');
  assert.equal(address.streetAddress, undefined);
  assertNoStreetInJsonLd('organizationJsonLd', ld);
});

test('every JSON-LD builder omits streetAddress and "421 Manor"', () => {
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

test('built HTML ld+json blocks have no streetAddress or "421 Manor" (when .next exists)', () => {
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
      assert.ok(!/421 Manor/i.test(body), `${file}: "421 Manor" in ld+json`);
    }
  }
  assert.ok(blocks > 0, 'expected at least one ld+json block in built HTML');
});
