import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { registryPayload } from '../src/lib/babylist';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel: string) => readFileSync(resolve(root, rel), 'utf8');

test('Babylist add.js is not loaded on every page', () => {
  assert.doesNotMatch(read('src/app/layout.tsx'), /babylist\.com\/add\.js/);
  assert.match(read('src/lib/babylist.ts'), /https:\/\/babylist\.com\/add\.js/);
});

test('registry payloads use absolute image and page URLs', () => {
  const p = registryPayload(
    { key: 'k', title: 'Mission, Natural', image: '/data/products/x.jpg', href: '/product/mission/brown-maple/natural', price: 2000 },
    'https://heirloomcribsandmore.com',
  );
  assert.equal(p.images, 'https://heirloomcribsandmore.com/data/products/x.jpg');
  assert.equal(p.url, 'https://heirloomcribsandmore.com/product/mission/brown-maple/natural');
  assert.equal(p.price, '2000');
});
