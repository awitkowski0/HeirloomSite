/*
 * OTO guard rails, toddler beds and the Mackenzie full bed rail kit: the hero
 * images had a burned-in caption ("3/4 Guardrail Option: 1275", "Toddler Bed
 * Add On: 401A", ...). Each hero is now the same live pixels cropped above the
 * caption (clean white gap, nothing of the product cut) and re-centred on the
 * original 1200x1000 white canvas, saved under a new `_v2` name because
 * /data/products images are served immutable. Old files are kept. The product
 * page hero and the feed image_link must use the new file.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { getInventory } from '../src/lib/content';
import { merchantFeedXml } from '../src/lib/merchant-feed';
import { pickDefaultImage } from '../src/lib/images';

/** slug -> [product folder, new hero file] */
const SWAPPED: Record<string, [string, string]> = {
  '34-guard-rail': ['3-4 Guard Rail', '3_4_guard_rail_0_v2.jpg'],
  'french-country-34-guard-rail': ['French Country 3-4 Guard Rail', 'french_country_34_guard_rail_0_v2.jpg'],
  'mackenzie-34-guard-rail': ['Mackenzie 3-4 Guard Rail', 'mackenzie_34_guard_rail_0_v2.jpg'],
  'newport-34-guard-rail': ['Newport 3-4 Guard Rail', 'newport_34_guard_rail_0_v2.jpg'],
  'west-lake-34-guard-rail': ['West Lake 3-4 Guard Rail', 'west_lake_34_guard_rail_0_v2.jpg'],
  'full-guard-rail': ['Full Guard Rail', 'full_guard_rail_0_v2.jpg'],
  'guard-rail': ['Guard Rail', 'guard_rail_0_v2.jpg'],
  'mackenzie-full-guard-rail': ['Mackenzie Full Guard Rail', 'mackenzie_full_guard_rail_0_v2.jpg'],
  'newport-full-guard-rail': ['Newport Full Guard Rail', 'newport_full_guard_rail_0_v2.jpg'],
  'west-lake-full-guard-rail': ['West Lake Full Guard Rail', 'west_lake_full_guard_rail_0_v2.jpg'],
  'mackenzie-toddler-bed': ['Mackenzie Toddler Bed', 'mackenzie_toddler_bed_0_v2.jpg'],
  'mackenzie-full-bed-rail-kit': ['Mackenzie Full Bed Rail Kit', 'mackenzie_full_bed_rail_kit_0_v2.jpg'],
  'newport-toddler-bed': ['Newport Toddler Bed', 'newport_toddler_bed_0_v2.jpg'],
  'toddler-conversion-rail': ['Toddler Conversion Rail', 'toddler_conversion_rail_0_v2.jpg'],
  'west-lake-toddler-bed': ['West Lake Toddler Bed', 'west_lake_toddler_bed_0_v2.jpg'],
};

const PRODUCTS = join(process.cwd(), 'public/data/products');
const url = (folder: string, file: string) => `/data/products/${encodeURIComponent(folder)}/${file}`;

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

test('new _v2 files exist, are 1200x1000 like the old ones, and the old files are kept', () => {
  for (const [folder, file] of Object.values(SWAPPED)) {
    const path = join(PRODUCTS, folder, file);
    assert.ok(existsSync(path), `${folder}/${file} exists`);
    assert.deepEqual(jpegSize(path), [1200, 1000], file);
    assert.ok(existsSync(join(PRODUCTS, folder, file.replace('_v2', ''))), `old ${file} kept`);
  }
});

test('media.json hero entry is repointed to the _v2 file and the old name is gone from it', () => {
  for (const [folder, file] of Object.values(SWAPPED)) {
    const media = JSON.parse(readFileSync(join(PRODUCTS, folder, 'media.json'), 'utf8')) as Record<string, string[]>;
    const first = Object.values(media)[0];
    assert.equal(first[0], file, `${folder} hero`);
    assert.ok(!JSON.stringify(media).includes(`"${file.replace('_v2', '')}"`), `${folder} old name not referenced`);
  }
});

test('page hero uses the caption-free file; feed never carries the old one', () => {
  const inv = getInventory();
  const xml = merchantFeedXml(inv);
  for (const [slug, [folder, file]] of Object.entries(SWAPPED)) {
    const items = inv.filter(i => i.slug === slug);
    assert.ok(items.length > 0, `inventory has ${slug}`);
    for (const item of items) {
      assert.equal(pickDefaultImage(item.stains), url(folder, file), `${slug} hero`);
    }
    // These add-ons are outside the feed's categories today; if one is ever
    // listed it must carry the caption-free file, and the old file never may.
    const inFeed = items.some(i => xml.includes(`<g:id>${i.sku}</g:id>`));
    if (inFeed) {
      assert.ok(xml.includes(`https://heirloomcribsandmore.com${url(folder, file)}<`), `${slug} feed`);
    }
    assert.ok(!xml.includes(url(folder, file.replace('_v2', ''))), `${slug}: old file not in feed`);
  }
});
