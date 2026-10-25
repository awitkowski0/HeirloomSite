/*
 * Tiered delivery and the PA/NJ/MD published-price area.
 * Run with `npm test`.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  DELIVERY_BANDS,
  EXCLUDED_METRO_ZIPS,
  SHIPPABLE_STATE_CODES,
  UNPUBLISHED_DELIVERY_MESSAGE,
  deliveryAreaStatus,
  deliveryChargeFor,
  isPublishedDeliveryArea,
} from '../src/lib/order-terms';
import { PricingError, priceCart, validateShipping } from '../src/lib/pricing';
import { handlingBusinessDays, productJsonLd, productShippingCents } from '../src/lib/seo';

const EDGES: ReadonlyArray<[number, number, number, string]> = [
  [0, 17_500, 29_900, '$0'],
  [249_999, 17_500, 29_900, '$2,499.99'],
  [250_000, 32_500, 42_500, '$2,500'],
  [349_999, 32_500, 42_500, '$3,499.99'],
  [350_000, 42_500, 55_000, '$3,500'],
  [449_999, 42_500, 55_000, '$4,499.99'],
  [450_000, 57_500, 72_500, '$4,500'],
  [599_999, 57_500, 72_500, '$5,999.99'],
  [600_000, 72_500, 92_500, '$6,000'],
  [749_999, 72_500, 92_500, '$7,499.99'],
  [750_000, 85_000, 110_000, '$7,500'],
  [899_999, 85_000, 110_000, '$8,999.99'],
  [900_000, 115_000, 147_500, '$9,000'],
  [1_500_000, 115_000, 147_500, '$15,000'],
];

test('deliveryChargeFor hits every band edge for Curbside and White Glove', () => {
  for (const [subtotal, curbside, whiteGlove, label] of EDGES) {
    assert.equal(deliveryChargeFor(subtotal, 'threshold'), curbside, `Curbside at ${label}`);
    assert.equal(deliveryChargeFor(subtotal, 'white_glove'), whiteGlove, `White Glove at ${label}`);
  }
  // The table is the only list, and the opening band is the $175 floor.
  assert.equal(DELIVERY_BANDS[0].threshold, 17_500);
  assert.equal(productShippingCents(Number.NaN), 17_500);
  assert.equal(productShippingCents(2_499.99), 17_500);
  assert.equal(productShippingCents(2_500), 32_500);
  assert.equal(productShippingCents(9_000), 115_000);
});

test('published delivery area: PA and MD and NJ outside Newark allowed; NY, VA and Newark blocked', () => {
  assert.deepEqual([...SHIPPABLE_STATE_CODES], ['PA', 'NJ', 'MD']);
  assert.equal(EXCLUDED_METRO_ZIPS.length, 21);
  assert.ok(EXCLUDED_METRO_ZIPS.every(z => /^071\d\d$/.test(z)));

  assert.equal(isPublishedDeliveryArea('PA', '17101'), true);
  assert.equal(isPublishedDeliveryArea('MD', '21201'), true);
  assert.equal(isPublishedDeliveryArea('NJ', '08001'), true);
  assert.equal(isPublishedDeliveryArea('NJ', '08608'), true);
  assert.equal(isPublishedDeliveryArea('nj', '08901-1234'), true);

  assert.equal(isPublishedDeliveryArea('NY', '10001'), false);
  assert.equal(isPublishedDeliveryArea('VA', '22201'), false);
  assert.equal(isPublishedDeliveryArea('CT', '06101'), false);
  assert.equal(isPublishedDeliveryArea('OH', '44101'), false);
  assert.equal(isPublishedDeliveryArea('NJ', '07102'), false);
  assert.equal(isPublishedDeliveryArea('NJ', '07102-1234'), false);
  assert.equal(isPublishedDeliveryArea('NJ', '07199'), false);
  // Hoboken, Jersey City, Elizabeth, Hackensack stay deliverable.
  assert.equal(isPublishedDeliveryArea('NJ', '07030'), true);
  assert.equal(isPublishedDeliveryArea('NJ', '07302'), true);
  assert.equal(isPublishedDeliveryArea('NJ', '07201'), true);
  assert.equal(isPublishedDeliveryArea('NJ', '07601'), true);
  // A ZIP must be complete and numeric: a malformed Newark ZIP is not a way round the list.
  for (const zip of ['0710', '7102', '071', 'O7102', '07102 ', '', '  ']) {
    assert.equal(isPublishedDeliveryArea('NJ', zip), false, `NJ "${zip}"`);
  }
  // A Newark ZIP does not become deliverable by pairing it with another state.
  assert.equal(isPublishedDeliveryArea('PA', '07102'), false);
  // ZIP+4 is accepted, and the Newark check sees through it.
  assert.equal(isPublishedDeliveryArea('PA', '17101-1234'), true);
  assert.equal(isPublishedDeliveryArea('NJ', '07102-1234'), false);
  // No price until there is a state AND a ZIP.
  assert.equal(isPublishedDeliveryArea('', '17101'), false);
  assert.equal(isPublishedDeliveryArea('PA', ''), false);
});

test('deliveryAreaStatus says why a price is withheld', () => {
  assert.equal(deliveryAreaStatus('PA', '17101'), 'ok');
  assert.equal(deliveryAreaStatus('PA', ''), 'zip_missing');
  assert.equal(deliveryAreaStatus('', '17101'), 'zip_missing');
  assert.equal(deliveryAreaStatus('PA', '1710'), 'zip_invalid');
  assert.equal(deliveryAreaStatus('NJ', '07102'), 'excluded_zip');
  assert.equal(deliveryAreaStatus('PA', '07102'), 'excluded_zip');
  assert.equal(deliveryAreaStatus('NY', '10001'), 'state');
  assert.equal(deliveryAreaStatus('NY', ''), 'state');
});

test('server rejects malformed ZIPs outright', () => {
  for (const zip of ['0710', '7102', 'O7102', '1710A', '12345-678']) {
    assert.throws(() => validateShipping(address('NJ', zip)), PricingError, zip);
  }
});

function address(state: string, zip: string): Record<string, unknown> {
  return {
    email: 'buyer@example.com',
    phone: '6105550134',
    firstName: 'Ada',
    lastName: 'Lovelace',
    address: '1 Main Street',
    city: 'Harrisburg',
    state,
    zip,
  };
}

test('server rejects unpublished areas and accepts PA, MD, and NJ 08xxx', () => {
  assert.equal(validateShipping(address('PA', '17101')).state, 'PA');
  assert.equal(validateShipping(address('MD', '21201')).state, 'MD');
  assert.equal(validateShipping(address('NJ', '08055')).zip, '08055');

  for (const [state, zip] of [
    ['NY', '10001'],
    ['NJ', '07102'],
    ['VA', '22202'],
  ] as const) {
    assert.throws(
      () => validateShipping(address(state, zip)),
      (err: unknown) => {
        assert.ok(err instanceof PricingError, `${state} ${zip} should be a PricingError`);
        assert.equal((err as PricingError).message, UNPUBLISHED_DELIVERY_MESSAGE);
        return true;
      }
    );
  }
});

interface PricingRow {
  productName: string;
  wood: string;
  basePrice: number;
  stains: Array<{ name: string; inStock: boolean }>;
}

test('priceCart recomputes delivery from the merchandise subtotal', () => {
  const pricing = JSON.parse(
    readFileSync(new URL('../data/pricing.json', import.meta.url), 'utf8')
  ) as PricingRow[];
  const row = pricing.find(r => r.productName === 'Hudson');
  assert.ok(row, 'Hudson missing from pricing.json');
  const stain = row.stains.find(s => s.inStock);
  assert.ok(stain, 'Hudson has no in-stock finish');
  const line = (quantity: number) => ({
    productName: row.productName,
    wood: row.wood,
    stainName: stain.name,
    quantity,
  });

  const one = priceCart([line(1)], 'PA', 'threshold');
  assert.equal(one.shippingCents, deliveryChargeFor(one.subtotalCents, 'threshold'));
  assert.equal(one.shippingCents, 17_500);

  const two = priceCart([line(2)], 'NJ', 'white_glove');
  assert.equal(two.shippingCents, deliveryChargeFor(two.subtotalCents, 'white_glove'));
  assert.ok(two.subtotalCents >= 350_000, 'two Hudson cribs should clear $3,500');
  assert.equal(two.shippingCents, 55_000);
});

test('product JSON-LD shipping rate follows the Curbside tier, destination is PA/NJ/MD, handling time follows the builder', () => {
  assert.deepEqual(handlingBusinessDays('OTO-1201'), { minValue: 30, maxValue: 40 });
  assert.deepEqual(handlingBusinessDays('KC-10'), { minValue: 40, maxValue: 40 });
  assert.deepEqual(handlingBusinessDays('FQP-501'), { minValue: 50, maxValue: 70 });
  assert.deepEqual(handlingBusinessDays('FQP 112 Madison Nightstand 2 Drawer'), {
    minValue: 50,
    maxValue: 70,
  });
  assert.deepEqual(handlingBusinessDays('rdir-1'), { minValue: 42, maxValue: 56 });

  const ld = productJsonLd({
    name: 'Test Crib',
    path: '/product/test-crib',
    description: 'A crib',
    images: [],
    sku: 'OTO-1201',
    priceDollars: 2500,
    inStock: true,
  });
  const offers = ld.offers as {
    shippingDetails: {
      shippingRate: { value: number };
      shippingDestination: { addressCountry: string; addressRegion: string[] };
      deliveryTime: { handlingTime: { minValue: number; maxValue: number; unitText: string } };
    };
  };
  assert.equal(offers.shippingDetails.shippingRate.value, 325);
  assert.equal(offers.shippingDetails.shippingDestination.addressCountry, 'US');
  assert.deepEqual(offers.shippingDetails.shippingDestination.addressRegion, ['PA', 'NJ', 'MD']);
  assert.equal(offers.shippingDetails.deliveryTime.handlingTime.minValue, 30);
  assert.equal(offers.shippingDetails.deliveryTime.handlingTime.maxValue, 40);
  assert.equal(offers.shippingDetails.deliveryTime.handlingTime.unitText, 'business days');

  const fisher = productJsonLd({
    name: 'Hudson',
    path: '/product/hudson',
    description: 'A crib',
    images: [],
    sku: 'FQP-301',
    priceDollars: 1950,
    inStock: true,
  });
  const fisherOffers = fisher.offers as { shippingDetails: { shippingRate: { value: number } } };
  assert.equal(fisherOffers.shippingDetails.shippingRate.value, 175);
});
