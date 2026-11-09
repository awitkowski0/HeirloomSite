import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { registryPayload } from '../src/lib/babylist';
import { toneOf } from '../src/lib/finish-tones';

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
