import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getInventory } from '../src/lib/content';
import { additionalImages, browsableInventory, feedItems } from '../src/lib/merchant-feed';
import { roomImagesFor, roomProductSlugs } from '../src/lib/room-images';

/*
 * Room photographs are AI edits of the catalogue photos. They are for the site
 * only: a product image that is not a photo of the product as sold is
 * misrepresentation to Google Shopping.
 */
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (f: string) => readFileSync(resolve(root, f), 'utf8');
const ROOM_PATH = '/data/rooms/';

test('every indexed room image exists, has alt text, and sits under /data/rooms/', () => {
  assert.ok(roomProductSlugs().length > 0, 'expected at least one approved room image');
  for (const slug of roomProductSlugs()) {
    for (const image of roomImagesFor(slug)) {
      assert.ok(image.src.startsWith(ROOM_PATH), image.src);
      assert.ok(image.alt.length > 0, `${image.src} has no alt`);
      assert.ok(existsSync(resolve(root, 'public', decodeURIComponent(image.src).slice(1))), `${image.src} missing`);
      assert.ok(image.width <= 1200, `${image.src} wider than the 1200px import size`);
    }
  }
});

test('room images are never in the inventory the feed and the schema read', () => {
  assert.equal(JSON.stringify(getInventory()).includes(ROOM_PATH), false);
});

test('the Merchant feed cannot emit a room image', () => {
  for (const item of feedItems(browsableInventory())) {
    assert.equal(additionalImages(item).some(u => u.includes(ROOM_PATH)), false, item.productName);
  }
  assert.equal(/room-images/.test(read('src/lib/merchant-feed.ts')), false);
  assert.equal(/room-images/.test(read('src/app/feed.xml/route.ts')), false);
});

test('Product JSON-LD and og:image are built from catalogue images only', () => {
  const page = read('src/app/product/[slug]/[[...variant]]/page.tsx');
  // The import, and the one RoomSection call below the configurator.
  assert.equal((page.match(/roomImagesFor/g) ?? []).length, 2);
  const jsonLd = page.slice(page.indexOf('productJsonLd({'), page.indexOf('breadcrumbJsonLd('));
  assert.equal(jsonLd.includes('room'), false);
  assert.equal(/room-images/.test(read('src/lib/seo.ts')), false);
});

test('only owner-approved room images are imported', () => {
  const script = read('scripts/import-room-images.mjs');
  assert.ok(script.includes("reviewer_decision?.decision !== 'approved'"));
  assert.ok(script.includes("row.mode !== 'edit-room'"));
});
