import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { merchantFeedXml, feedItems } from '../src/lib/merchant-feed';
import { getInventory } from '../src/lib/content';
import { productJsonLd } from '../src/lib/seo';

/*
 * Pricing App #34 M1 S3b (Option B items 3–5): business-day handling plus
 * 1–10 business day transit on /shipping, every feed g:shipping row, and
 * product JSON-LD shippingDetails. Week lines and existing handling stay.
 */

const shippingPage = readFileSync(resolve(process.cwd(), 'src/app/shipping/page.tsx'), 'utf8');

test('/shipping keeps the week lines and adds matching business-day handling plus the confirmed transit sentence', () => {
  const en = '\u2013';
  assert.ok(shippingPage.includes(`Old Town Oak: about 6${en}8 weeks (30${en}40 business days)`));
  assert.ok(shippingPage.includes('Kids Comfort: about 8 weeks (about 40 business days)'));
  assert.ok(shippingPage.includes(`Fisher&rsquo;s: 10${en}14 weeks (50${en}70 business days)`));
  assert.match(
    shippingPage,
    /Delivery 1 to 10 business days after your piece is ready,\s+for PA\/NJ\/MD Curbside and White\s+Glove\./,
  );
  assert.ok(shippingPage.includes('We contact you to schedule delivery once your furniture is ready.'));
});

test('every feed g:shipping row has transit 1/10, and the row count is 816', () => {
  const inventory = getInventory();
  const xml = merchantFeedXml(inventory);
  const items = feedItems(inventory);
  const shippingBlocks = xml.match(/<g:shipping>[\s\S]*?<\/g:shipping>/g) ?? [];
  assert.equal(shippingBlocks.length, 816, `expected 816 g:shipping rows, got ${shippingBlocks.length}`);
  assert.equal(shippingBlocks.length, items.length * 2 * 3);
  for (const block of shippingBlocks) {
    assert.match(block, /<g:country>US<\/g:country>/);
    assert.match(block, /<g:region>(PA|NJ|MD)<\/g:region>/);
    assert.match(block, /<g:service>(Curbside|White Glove)<\/g:service>/);
    assert.match(block, /<g:price>\d+\.\d{2} USD<\/g:price>/);
    assert.match(block, /<g:min_transit_time>1<\/g:min_transit_time>/);
    assert.match(block, /<g:max_transit_time>10<\/g:max_transit_time>/);
    // Only the transit attributes were added inside the shipping row.
    assert.equal((block.match(/<g:(?!shipping>)[a-z_]+>/g) ?? []).length, 6);
  }
});

test('product JSON-LD shippingDetails keep builder handling and add transitTime 1–10 DAY', () => {
  const oto = productJsonLd({
    name: 'Addison Crib',
    path: '/product/addison-crib',
    description: 'A crib.',
    images: ['/og-default.jpg'],
    sku: 'OTO-100',
    priceDollars: 2500,
    inStock: true,
  });
  const fisher = productJsonLd({
    name: 'Arched Top Crib',
    path: '/product/arched-top',
    description: 'A crib.',
    images: ['/og-default.jpg'],
    sku: 'FQP-101',
    priceDollars: 2000,
    inStock: true,
  });
  type Ship = {
    name: string;
    deliveryTime: {
      handlingTime: { minValue: number; maxValue: number; unitCode: string };
      transitTime: { minValue: number; maxValue: number; unitCode: string; '@type': string };
    };
  };
  const otoShips = (oto as unknown as { offers: { shippingDetails: Ship[] } }).offers.shippingDetails;
  const fisherShips = (fisher as unknown as { offers: { shippingDetails: Ship[] } }).offers.shippingDetails;
  assert.equal(otoShips.length, 2);
  assert.deepEqual(
    [otoShips[0].deliveryTime.handlingTime.minValue, otoShips[0].deliveryTime.handlingTime.maxValue],
    [30, 40],
  );
  assert.deepEqual(
    [fisherShips[0].deliveryTime.handlingTime.minValue, fisherShips[0].deliveryTime.handlingTime.maxValue],
    [50, 70],
  );
  for (const ship of [...otoShips, ...fisherShips]) {
    const t = ship.deliveryTime.transitTime;
    assert.equal(t['@type'], 'QuantitativeValue');
    assert.equal(t.minValue, 1);
    assert.equal(t.maxValue, 10);
    assert.equal(t.unitCode, 'DAY');
  }
});
