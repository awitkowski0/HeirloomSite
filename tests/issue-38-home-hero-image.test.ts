import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/*
 * Pricing App #38 Q5: home LCP / related showroom stills were PNGs stored
 * with a .jpg name. Keep the same photographs, but the files at these
 * paths must be real JPEGs so the image optimizer is not transcoding a
 * PNG on first paint.
 */

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const hero = resolve(root, 'public/data/products/showroom/showroom_0.jpg');
const heroMobile = resolve(root, 'public/data/products/showroom/showroom_0_mobile.jpg');

function assertRealJpeg(path: string, maxBytes: number) {
  const buf = readFileSync(path);
  assert.ok(buf.length >= 3);
  assert.equal(buf[0], 0xff);
  assert.equal(buf[1], 0xd8);
  assert.equal(buf[2], 0xff);
  assert.notEqual(buf.subarray(0, 8).toString('ascii'), '\x89PNG\r\n\x1a\n');
  assert.ok(buf.length < maxBytes, `${path} is still large: ${buf.length} bytes`);
}

test('home hero showroom_0.jpg is a real JPEG (not a mislabeled PNG)', () => {
  // Same photograph, much smaller than the old 1,238,698-byte PNG.
  assertRealJpeg(hero, 400_000);
});

test('showroom_0_mobile.jpg is a real JPEG (not a mislabeled PNG)', () => {
  // Same photograph and path, much smaller than the old 1,826,222-byte PNG.
  assertRealJpeg(heroMobile, 400_000);
});
