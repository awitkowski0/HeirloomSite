/*
 * Google Merchant Center RSS 2.0 feed (src/lib/merchant-feed.ts,
 * src/app/feed.xml/route.ts). Run with `npm test`.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  FEED_HEADERS,
  FEED_TITLE_NAMES,
  GOOGLE_PRODUCT_CATEGORY,
  additionalImages,
  feedItems,
  itemColor,
  itemMaterial,
  itemGroupId,
  merchantFeedXml,
  merchantPrice,
  xmlEscape,
} from '../src/lib/merchant-feed';
import { getInventory } from '../src/lib/content';
import { builderBrand, handlingBusinessDays, BUILDERS } from '../src/lib/seo';
import { deliveryChargeFor, SHIPPABLE_STATE_CODES } from '../src/lib/order-terms';
import { toCents } from '../src/lib/format';
import { variantHref } from '../src/lib/variants';
import type { InventoryItem } from '../src/types';

function tags(xml: string, name: string): string[] {
  const re = new RegExp(`<${name}>([\\s\\S]*?)</${name}>`, 'g');
  return [...xml.matchAll(re)].map(m => m[1]);
}

function firstItem(xml: string): string {
  const m = xml.match(/<item>[\s\S]*?<\/item>/);
  assert.ok(m, 'feed has no items');
  return m[0];
}

function itemWithId(xml: string, id: string): string {
  const items = xml.match(/<item>[\s\S]*?<\/item>/g) ?? [];
  const found = items.find(i => i.includes(`<g:id>${id}</g:id>`));
  assert.ok(found, `no item with g:id ${id}`);
  return found;
}

function configuration(overrides: Partial<InventoryItem> = {}): InventoryItem {
  return {
    productName: 'Test Crib',
    wood: 'Natural',
    category: 'Cribs',
    collection: null,
    variantType: 'finish',
    description: 'A crib with <oak> & "quotes".',
    extendedDescription: null,
    title: 'Test Crib — Heirloom Cribs and More',
    metaDescription: null,
    basePrice: 2500,
    tags: [],
    sku: 'KC-10-BrownMaple_OCS_100_Natural',
    slug: 'test-crib',
    dimensions: null,
    weight: null,
    addons: [],
    includes: [],
    bundle: [],
    related: [],
    stains: [{ name: 'Natural', inStock: true, priceAddition: 0, image: '/data/products/test.jpg' }],
    ...overrides,
  };
}

test('builder table maps OTO / FQP / KC and never the store name', () => {
  assert.equal(builderBrand('OTO-1201'), 'Old Town Oak');
  assert.equal(builderBrand('FQP-301'), 'Fisher');
  assert.equal(builderBrand('FQP 112 Madison Nightstand 2 Drawer'), 'Fisher');
  assert.equal(builderBrand('KC-10'), 'Kids Comfort');
  assert.equal(builderBrand('rdir-1'), null);
  assert.equal(BUILDERS.KC.name, 'Kids Comfort');
  assert.deepEqual(handlingBusinessDays('KC-10'), BUILDERS.KC.handling);
  assert.ok(!Object.values(BUILDERS).some(b => /heirloom/i.test(b.name)));
});

test('itemGroupId strips the wood/finish suffix and leaves product SKUs alone', () => {
  assert.equal(itemGroupId('OTO-1201-BrownMaple_OCS_100_Natural'), 'OTO-1201');
  assert.equal(itemGroupId('FQP-201-BrownMaple_OCS_100_Antique Slate'), 'FQP-201');
  assert.equal(itemGroupId('OTO-406-425'), 'OTO-406-425');
  assert.equal(itemGroupId('FQP-301'), 'FQP-301');
});

test('merchantPrice is always dollars.cents USD', () => {
  assert.equal(merchantPrice(0), '0.00 USD');
  assert.equal(merchantPrice(17_500), '175.00 USD');
  assert.equal(merchantPrice(195_000), '1950.00 USD');
  assert.equal(merchantPrice(257_800), '2578.00 USD');
});

test('xmlEscape encodes markup characters', () => {
  assert.equal(xmlEscape(`<oak> & "quotes" 'n'`), '&lt;oak&gt; &amp; &quot;quotes&quot; &apos;n&apos;');
});

test('feed is RSS 2.0 with the Google base namespace and cache headers', () => {
  assert.equal(FEED_HEADERS['Content-Type'], 'application/xml; charset=utf-8');
  assert.equal(FEED_HEADERS['Cache-Control'], 'public, s-maxage=3600, stale-while-revalidate=86400');
  const xml = merchantFeedXml();
  assert.match(xml, /^<\?xml version="1.0" encoding="UTF-8"\?>/);
  assert.match(xml, /<rss version="2.0" xmlns:g="http:\/\/base.google.com\/ns\/1.0">/);
  assert.match(xml, /<channel>/);
});

test('feed lists every sellable crib and case-good variant, and nothing else', () => {
  const inventory = getInventory();
  const xml = merchantFeedXml(inventory);
  const ids = tags(xml, 'g:id');
  const items = feedItems(inventory);

  assert.equal(ids.length, items.length);
  assert.equal(new Set(ids).size, ids.length, 'g:id values must be unique');
  assert.ok(ids.length >= 40, `expected a real catalogue, got ${ids.length} items`);

  const bySku = new Map(inventory.map(i => [i.sku, i]));
  for (const id of ids) {
    const row = bySku.get(id);
    assert.ok(row, `feed id ${id} missing from inventory`);
    assert.ok(
      ['Cribs', 'Mini Cribs', 'Dressers', 'Chests', 'Nightstands', 'Changing Tables'].includes(
        row.category ?? ''
      ),
      `${id} is ${row.category}`
    );
  }

  for (const name of ['Crib Mattress', 'Toddler Bed Rail Kit', '3/4 Guard Rail Kit', 'Full Guard Rail Kit']) {
    const row = inventory.find(i => i.productName === name);
    assert.ok(row?.sku, `${name} missing from inventory`);
    assert.equal(ids.includes(row.sku as string), false, `${name} leaked into the feed`);
  }
  assert.equal(
    ids.some(id => id.startsWith('rdir-') || id.startsWith('ltop-')),
    false,
    'hidden rugs/lamps must not appear'
  );
  for (const brand of tags(xml, 'g:brand')) {
    assert.ok(['Old Town Oak', 'Fisher', 'Kids Comfort'].includes(brand), brand);
  }
});

test('Addison Natural and Hudson match the product-page price, URL, brand, shipping and handling', () => {
  const inventory = getInventory();
  const xml = merchantFeedXml(inventory);

  const addison = inventory.find(i => i.sku === 'OTO-1201-BrownMaple_OCS_100_Natural');
  assert.ok(addison?.slug);
  const addisonItem = itemWithId(xml, addison.sku as string);
  assert.match(addisonItem, /<g:item_group_id>OTO-1201<\/g:item_group_id>/);
  assert.match(addisonItem, /<g:title>Addison Crib in Natural<\/g:title>/);
  assert.match(addisonItem, /<g:brand>Old Town Oak<\/g:brand>/);
  assert.equal(tags(addisonItem, 'g:price')[0], merchantPrice(toCents(addison.basePrice)));
  assert.equal(
    tags(addisonItem, 'g:link')[0],
    `https://heirloomcribsandmore.com${variantHref(addison.slug as string, addison.wood)}`
  );
  assert.match(addisonItem, /<g:image_link>https:\/\/heirloomcribsandmore.com\//);
  assert.match(addisonItem, /<g:availability>in_stock<\/g:availability>/);
  assert.match(addisonItem, /<g:condition>new<\/g:condition>/);
  assert.match(addisonItem, /<g:identifier_exists>no<\/g:identifier_exists>/);
  assert.equal(tags(addisonItem, 'g:min_handling_time')[0], '30');
  assert.equal(tags(addisonItem, 'g:max_handling_time')[0], '40');
  const addisonShip = merchantPrice(deliveryChargeFor(toCents(addison.basePrice), 'threshold'));
  assert.deepEqual(tags(addisonItem, 'g:region'), [...SHIPPABLE_STATE_CODES]);
  assert.equal(tags(addisonItem, 'g:country').every(c => c === 'US'), true);
  assert.equal(tags(addisonItem, 'g:price').filter(p => p === addisonShip).length, SHIPPABLE_STATE_CODES.length);

  const hudson = inventory.find(i => i.sku === 'FQP-301');
  assert.ok(hudson?.slug);
  const hudsonItem = itemWithId(xml, 'FQP-301');
  assert.match(hudsonItem, /<g:item_group_id>FQP-301<\/g:item_group_id>/);
  assert.match(hudsonItem, /<g:brand>Fisher<\/g:brand>/);
  assert.equal(tags(hudsonItem, 'g:price')[0], '1950.00 USD');
  assert.equal(tags(hudsonItem, 'g:min_handling_time')[0], '50');
  assert.equal(tags(hudsonItem, 'g:max_handling_time')[0], '70');
  assert.equal(
    tags(hudsonItem, 'g:price').filter(p => p === merchantPrice(deliveryChargeFor(195_000, 'threshold')))
      .length,
    SHIPPABLE_STATE_CODES.length
  );
});

test('Kids Comfort items pick up brand and handling from the builder table', () => {
  const xml = merchantFeedXml([configuration()]);
  const item = firstItem(xml);
  assert.match(item, /<g:id>KC-10-BrownMaple_OCS_100_Natural<\/g:id>/);
  assert.match(item, /<g:item_group_id>KC-10<\/g:item_group_id>/);
  assert.match(item, /<g:brand>Kids Comfort<\/g:brand>/);
  assert.doesNotMatch(item, /Heirloom Cribs/);
  assert.match(item, /<g:title>Test Crib in Natural<\/g:title>/);
  assert.match(item, /&lt;oak&gt; &amp; &quot;quotes&quot;\./);
  assert.equal(tags(item, 'g:min_handling_time')[0], '40');
  assert.equal(tags(item, 'g:max_handling_time')[0], '40');
});

test('google_product_category uses exact Google taxonomy strings, one per site category', () => {
  const xml = merchantFeedXml(getInventory());
  const allowed = new Set([
    'Furniture &gt; Baby &amp; Toddler Furniture &gt; Cribs &amp; Toddler Beds',
    'Furniture &gt; Baby &amp; Toddler Furniture &gt; Changing Tables',
    'Furniture &gt; Cabinets &amp; Storage &gt; Dressers',
    'Furniture &gt; Tables &gt; Nightstands',
  ]);
  const items = xml.match(/<item>[\s\S]*?<\/item>/g) ?? [];
  for (const item of items) {
    const cats = tags(item, 'g:google_product_category');
    assert.equal(cats.length, 1, item.slice(0, 120));
    assert.ok(allowed.has(cats[0]), cats[0]);
    assert.equal(tags(item, 'g:product_type').length, 1);
  }
  assert.equal(GOOGLE_PRODUCT_CATEGORY.Chests, GOOGLE_PRODUCT_CATEGORY.Dressers);
  assert.match(tags(itemWithId(xml, 'OTO-1303'), 'g:google_product_category')[0], /Nightstands$/);
  assert.match(
    tags(itemWithId(xml, 'FQP 107 Madison Changing Table 6 Drawer'), 'g:google_product_category')[0],
    /Changing Tables$/
  );
});

test('every feed title names the product type; Fisher cribs lead with the builder', () => {
  const xml = merchantFeedXml(getInventory());
  for (const title of tags(xml, 'g:title')) {
    assert.match(title, /crib|dresser|chest|nightstand|changing table/i, title);
  }
  assert.match(itemWithId(xml, 'FQP-201-BrownMaple_OCS_100_Seely'), /<g:title>Fisher Arched Top Crib in Seely<\/g:title>/);
  assert.match(itemWithId(xml, 'FQP-101'), /<g:title>Fisher Mission Crib in Brown Maple<\/g:title>/);
  assert.match(itemWithId(xml, 'OTO-1301-BrownMaple_OCS_100_Carbon'), /<g:title>Newport Crib in Carbon<\/g:title>/);
  assert.equal(FEED_TITLE_NAMES['arched-top'], 'Fisher Arched Top Crib');
});

test('color only for single-finish items; material only where the site states it; no mpn / age_group', () => {
  const inventory = getInventory();
  const xml = merchantFeedXml(inventory);
  const carbon = itemWithId(xml, 'OTO-1301-BrownMaple_OCS_100_Carbon');
  assert.deepEqual(tags(carbon, 'g:color'), ['Carbon']);
  assert.deepEqual(tags(carbon, 'g:material'), ['Brown Maple']);
  assert.deepEqual(tags(itemWithId(xml, 'OTO-1201-BrownMaple_OCS_100_Asbury-Brown'), 'g:color'), ['Asbury Brown']);
  const mission = itemWithId(xml, 'FQP-101');
  assert.deepEqual(tags(mission, 'g:color'), [], 'finish is chosen at order time');
  assert.deepEqual(tags(mission, 'g:material'), ['Brown Maple']);
  assert.deepEqual(tags(itemWithId(xml, 'OTO-1303'), 'g:color'), []);
  // "solid wood" only: no material claimed.
  assert.deepEqual(tags(itemWithId(xml, 'OTO-410'), 'g:material'), []);
  assert.deepEqual(tags(itemWithId(xml, 'FQP-201-BrownMaple_OCS_100_Seely'), 'g:material'), []);
  assert.equal(itemMaterial(configuration({ description: 'Solid hardwood.' })), null);
  assert.equal(itemColor(configuration({ variantType: 'none', wood: 'Default Title' })), null);
  assert.doesNotMatch(xml, /<g:mpn>|<g:gtin>|<g:age_group>/);
});

test('additional images: other real photos of the same wood item only, max 10, never the main image', () => {
  const inventory = getInventory();
  const xml = merchantFeedXml(inventory);
  const mission = itemWithId(xml, 'FQP-101');
  const main = tags(mission, 'g:image_link')[0];
  const extra = tags(mission, 'g:additional_image_link');
  assert.ok(extra.length > 0 && extra.length <= 10);
  assert.ok(!extra.includes(main));
  assert.equal(new Set(extra).size, extra.length);
  for (const url of extra) assert.match(url, /^https:\/\/heirloomcribsandmore\.com\/data\/products\/Mission\//);
  // Single-finish and single-photo items get none (another colour is another product).
  assert.deepEqual(tags(itemWithId(xml, 'OTO-1301-BrownMaple_OCS_100_Carbon'), 'g:additional_image_link'), []);
  assert.deepEqual(tags(itemWithId(xml, 'OTO-1303'), 'g:additional_image_link'), []);
  assert.deepEqual(additionalImages(configuration()), []);
});
