/*
 * Product JSON-LD (src/lib/seo.ts productJsonLd): one Offer per page, the
 * builder as brand, the no-returns policy. Run with `npm test`.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BRAND_SITE_URL, SITE_NAME, builderBrand, productJsonLd } from '../src/lib/seo';

type Ld = Record<string, unknown> & { offers: Record<string, unknown> };

function ld(over: Partial<Parameters<typeof productJsonLd>[0]> = {}): Ld {
  return productJsonLd({
    name: 'Newport Crib in Carbon',
    path: '/product/newport-crib/carbon',
    description: 'A crib',
    images: ['/data/products/Newport%20Crib/newport_crib_3.jpg'],
    sku: 'OTO-1301-BrownMaple_OCS_100_Carbon',
    priceDollars: 1900,
    inStock: true,
    ...over,
  }) as unknown as Ld;
}

test('a colour page is its own product: colour name, colour SKU, its own URL on Product and Offer', () => {
  const p = ld();
  assert.equal(p['@type'], 'Product');
  assert.equal(p.name, 'Newport Crib in Carbon');
  assert.equal(p.sku, 'OTO-1301-BrownMaple_OCS_100_Carbon');
  assert.match(String(p.url), /\/product\/newport-crib\/carbon$/);
  assert.equal(p.offers.url, p.url);
});

test('offers is a single Offer with the page price, USD, availability and NewCondition', () => {
  const o = ld().offers;
  assert.equal(o['@type'], 'Offer');
  assert.equal(o.price, 1900);
  assert.equal(o.priceCurrency, 'USD');
  assert.equal(o.availability, 'https://schema.org/InStock');
  assert.equal(o.itemCondition, 'https://schema.org/NewCondition');
  for (const k of ['lowPrice', 'highPrice', 'offerCount', 'priceValidUntil']) {
    assert.ok(!(k in o), `offers must not carry ${k}`);
  }
  assert.equal(ld({ inStock: false }).offers.availability, 'https://schema.org/OutOfStock');
});

test('brand is the builder (same table as the feed g:brand); Heirloom is the seller', () => {
  assert.deepEqual(ld().brand, { '@type': 'Brand', name: 'Old Town Oak' });
  const fisher = ld({ sku: 'FQP-201-BrownMaple_OCS_100_Seely', name: 'Arched Top in Seely' });
  assert.deepEqual(fisher.brand, { '@type': 'Brand', name: 'Fisher' });
  assert.equal(builderBrand('FQP 112 Madison Nightstand 2 Drawer'), 'Fisher');
  const seller = ld().offers.seller as Record<string, unknown>;
  assert.equal(seller['@type'], 'Organization');
  assert.equal(seller.name, SITE_NAME);
  // No builder prefix (rugs, lamps): the store name, as before.
  assert.deepEqual(ld({ sku: 'rdir-1' }).brand, { '@type': 'Brand', name: SITE_NAME });
});

test('return policy: made-to-order goods cannot be returned (MerchantReturnNotPermitted), US, links /returns', () => {
  const policy = ld().offers.hasMerchantReturnPolicy as Record<string, unknown>;
  assert.equal(policy['@type'], 'MerchantReturnPolicy');
  assert.equal(policy.returnPolicyCategory, 'https://schema.org/MerchantReturnNotPermitted');
  assert.equal(policy.applicableCountry, 'US');
  assert.match(String(policy.merchantReturnLink), /\/returns$/);
});

test('shipping details are kept: Curbside rate for the page price, PA/NJ/MD, builder handling window', () => {
  const ship = ld({ priceDollars: 2500 }).offers.shippingDetails as {
    shippingRate: { value: number; currency: string };
    shippingDestination: { addressRegion: string[] };
    deliveryTime: { handlingTime: { minValue: number; maxValue: number }; transitTime?: unknown };
  };
  assert.equal(ship.shippingRate.value, 325);
  assert.equal(ship.shippingRate.currency, 'USD');
  assert.deepEqual(ship.shippingDestination.addressRegion, ['PA', 'NJ', 'MD']);
  assert.deepEqual(
    [ship.deliveryTime.handlingTime.minValue, ship.deliveryTime.handlingTime.maxValue],
    [30, 40]
  );
  assert.equal(ship.deliveryTime.transitTime, undefined);
  const fisher = ld({ sku: 'FQP-101', priceDollars: 2000 }).offers.shippingDetails as typeof ship;
  assert.deepEqual(
    [fisher.deliveryTime.handlingTime.minValue, fisher.deliveryTime.handlingTime.maxValue],
    [50, 70]
  );
});

test('no invented identifiers, ratings or business address', () => {
  const json = JSON.stringify(ld());
  for (const k of ['aggregateRating', 'review', 'gtin', 'mpn', 'priceValidUntil', 'transitTime', 'LocalBusiness', 'streetAddress']) {
    assert.ok(!json.includes(`"${k}"`) && !json.includes(`"@type":"${k}"`), `unexpected ${k}`);
  }
  assert.ok(BRAND_SITE_URL.startsWith('https://'));
});
