import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/*
 * Pricing App #38 Q5: the home LCP hero was a 1.2 MB PNG stored with a .jpg
 * name. Keep the same photograph, but the file at this path must be a real
 * JPEG so the image optimizer is not transcoding a PNG on first paint.
 */

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const hero = resolve(root, 'public/data/products/showroom/showroom_0.jpg');

test('home hero showroom_0.jpg is a real JPEG (not a mislabeled PNG)', () => {
  const buf = readFileSync(hero);
  assert.ok(buf.length >= 3);
  assert.equal(buf[0], 0xff);
  assert.equal(buf[1], 0xd8);
  assert.equal(buf[2], 0xff);
  assert.notEqual(buf.subarray(0, 8).toString('ascii'), '\x89PNG\r\n\x1a\n');
  // Same photograph, much smaller than the old 1,238,698-byte PNG.
  assert.ok(buf.length < 400_000, `hero is still large: ${buf.length} bytes`);
});
