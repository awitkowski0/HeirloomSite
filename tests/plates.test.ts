import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { sep } from 'node:path';
import { PLATE_SPECS } from '../src/lib/plates';
import { registryPayload } from '../src/lib/babylist';
import { toneOf } from '../src/lib/finish-tones';

/* Frames that show soft items in the crib, or a wood the site does not sell. */
const NOT_FOR_PLATES = /^(Mission|Arched Top|Moyerton|Hudson|Darlington|Princeton|Newport Crib|Addison|French Country|West Lake)/;

test('every plate photo exists and comes from the cleared set', () => {
  for (const plate of PLATE_SPECS) {
    for (const side of [plate.left, plate.right]) {
      assert.doesNotMatch(side.dir, NOT_FOR_PLATES, `${plate.id} uses ${side.dir}`);
      assert.ok(existsSync(`public/data/products/${side.dir}${sep}${side.file}`), side.file);
      assert.notEqual(side.file, 'mackenzie_crib_slat_back_0.jpg', 'the audit excludes _0 frames');
    }
    for (const finish of plate.finishes ?? []) {
      assert.ok(existsSync(`public/data/products/${plate.left.dir}/${finish.left}`), finish.left);
      assert.ok(existsSync(`public/data/products/${plate.right.dir}/${finish.right}`), finish.right);
    }
  }
});

test('plate opinions make no claim in our voice', () => {
  for (const plate of PLATE_SPECS) {
    assert.doesNotMatch(
      plate.opinion,
      /\b(safe|safer|safest|certified|tested|non-?toxic|american|made in|amish|ceo|grandfather)\b/i,
      plate.id,
    );
  }
});

test('a registry item describes one exact piece', () => {
  const payload = registryPayload(
    { key: 'x', title: 'Mission, Natural', image: '/data/products/Mission/mission_6.jpg', href: '/product/mission/brownmaple/natural', price: 2000 },
    'https://example.test',
  );
  assert.deepEqual(payload, {
    images: 'https://example.test/data/products/Mission/mission_6.jpg',
    price: '2000',
    title: 'Mission, Natural',
    url: 'https://example.test/product/mission/brownmaple/natural',
  });
});

test('every stain sold on a crib has a tone', () => {
  const inventory = JSON.parse(readFileSync('public/data/inventory.json', 'utf8'));
  for (const row of inventory) {
    if (row.category !== 'Cribs') continue;
    const names = row.variantType === 'finish' ? [row.wood] : row.stains.map((s: { name: string }) => s.name);
    for (const name of names) assert.ok(toneOf(name), `${name} has no tone`);
  }
});
