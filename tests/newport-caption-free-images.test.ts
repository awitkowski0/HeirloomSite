/*
 * OTO-1301 Newport crib: six stains use the Brand-passed caption-free crops,
 * padded to the old 1120x928 canvas and saved under new `_v2` names (the
 * /data/products images are served immutable, so nothing is overwritten).
 * Earthtone, Manchester, Carbon and Natural failed Brand's colour check and
 * keep their old images until Phil decides. The product page and the feed
 * must use the same file for each stain.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { getInventory } from '../src/lib/content';
import { merchantFeedXml } from '../src/lib/merchant-feed';
import { pickDefaultImage } from '../src/lib/images';

const DIR = join(process.cwd(), 'public/data/products/Newport Crib');
const BASE = '/data/products/Newport%20Crib/';

const SWAPPED: Record<string, string> = {
  'OTO-1301-BrownMaple_OCS_100_Almond': 'newport_crib_1_v2.jpg',
  'OTO-1301-BrownMaple_OCS_100_Asbury-Brown': 'newport_crib_2_v2.jpg',
  'OTO-1301-BrownMaple_OCS_100_Ebony': 'newport_crib_5_v2.jpg',
  'OTO-1301-BrownMaple_OCS_100_Harvest': 'newport_crib_6_v2.jpg',
  'OTO-1301-BrownMaple_OCS_100_Michaels-Cherry': 'newport_crib_8_v2.jpg',
  'OTO-1301-BrownMaple_OCS_100_Sandstone': 'newport_crib_9_v2.jpg',
};
const UNCHANGED: Record<string, string> = {
  'OTO-1301-BrownMaple_OCS_100_Natural': 'newport_crib_0.jpg',
  'OTO-1301-BrownMaple_OCS_100_Carbon': 'newport_crib_3.jpg',
  'OTO-1301-BrownMaple_OCS_100_Earthtone': 'newport_crib_4.jpg',
  'OTO-1301-BrownMaple_OCS_100_Manchester': 'newport_crib_7.jpg',
};

function newportBySku() {
  return new Map(getInventory().filter(i => i.slug === 'newport-crib').map(i => [i.sku, i]));
}

/** Width and height from a baseline or progressive JPEG's SOF marker. */
function jpegSize(file: string): [number, number] {
  const b = readFileSync(file);
  let i = 2;
  while (i < b.length) {
    const marker = b[i + 1];
    const len = b.readUInt16BE(i + 2);
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      return [b.readUInt16BE(i + 7), b.readUInt16BE(i + 5)];
    }
    i += 2 + len;
  }
  throw new Error(`no SOF in ${file}`);
}

test('the six Brand-passed stains use the new _v2 images (page hero = feed image_link)', () => {
  const inv = newportBySku();
  const xml = merchantFeedXml(getInventory());
  for (const [sku, file] of Object.entries(SWAPPED)) {
    const item = inv.get(sku);
    assert.ok(item, `missing ${sku}`);
    assert.equal(pickDefaultImage(item!.stains), BASE + file, `${sku} hero`);
    assert.ok(xml.includes(`<g:image_link>https://heirloomcribsandmore.com${BASE}${file}</g:image_link>`), `${sku} feed`);
  }
});

test('the four Brand colour FAIL stains still use their old images', () => {
  const inv = newportBySku();
  const xml = merchantFeedXml(getInventory());
  for (const [sku, file] of Object.entries(UNCHANGED)) {
    assert.equal(pickDefaultImage(inv.get(sku)!.stains), BASE + file, `${sku} hero`);
    assert.ok(xml.includes(`<g:image_link>https://heirloomcribsandmore.com${BASE}${file}</g:image_link>`), `${sku} feed`);
  }
});

test('new files are 1120x928 like the old ones, and the old files are kept', () => {
  for (const file of Object.values(SWAPPED)) {
    assert.deepEqual(jpegSize(join(DIR, file)), [1120, 928], file);
    assert.ok(existsSync(join(DIR, file.replace('_v2', ''))), `old ${file} kept`);
  }
});
