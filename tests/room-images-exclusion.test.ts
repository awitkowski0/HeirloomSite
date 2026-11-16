import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { getInventory } from '@/lib/content';
import { additionalImages, browsableInventory, feedItems } from '@/lib/merchant-feed';
import { roomProductSlugs, roomImagesFor } from '@/lib/room-images';

const root = process.cwd();
const read = (f: string) => readFileSync(resolve(root, f), 'utf8');
const ROOM_PATH = '/data/rooms/';

test('room images exist in their own file, never in the inventory the feed and schema read', () => {
  assert.ok(roomProductSlugs().length > 0, 'expected at least one approved room image');
  for (const slug of roomProductSlugs()) {
    for (const image of roomImagesFor(slug)) assert.ok(image.src.startsWith(ROOM_PATH) && image.alt.length > 0);
  }
  assert.equal(JSON.stringify(getInventory()).includes(ROOM_PATH), false);
});

test('the Merchant feed cannot emit a room image', () => {
  for (const item of feedItems(browsableInventory())) {
    assert.equal(additionalImages(item).some(u => u.includes(ROOM_PATH)), false, item.productName);
  }
  assert.equal(/room-images/.test(read('src/lib/merchant-feed.ts')), false);
  assert.equal(/room-images/.test(read('src/app/feed.xml/route.ts')), false);
});

test('Product JSON-LD and og:image are built from catalog images only', () => {
  const page = read('src/app/product/[slug]/[[...variant]]/page.tsx');
  assert.equal((page.match(/roomImagesFor/g) ?? []).length, 2, 'import and the rooms prop only');
  assert.ok(page.includes('rooms={roomImagesFor(slug)}'));
  const jsonLd = page.slice(page.indexOf('productJsonLd({'), page.indexOf('breadcrumbJsonLd(breadcrumb)'));
  assert.equal(jsonLd.includes('rooms'), false);
  assert.equal(/room-images/.test(read('src/lib/seo.ts')), false);
});

test('only owner-approved room images are imported', () => {
  const script = read('scripts/import-room-images.mjs');
  assert.ok(script.includes("reviewer_decision?.decision !== 'approved'"));
  assert.ok(script.includes("row.mode !== 'edit-room'"));
});
