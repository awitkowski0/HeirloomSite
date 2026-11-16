import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/*
 * Pricing App #52: CoS QC final strings (comment 6879814430), from Brand
 * 6878897144 and 6879628906. Applied verbatim. 4a is dropped (live line stays).
 */

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel: string) => readFileSync(resolve(root, rel), 'utf8');
const product = (name: string) =>
  JSON.parse(read(`public/data/products/${name}/product.json`)) as { description: string };

const H1 =
  'If you would like help choosing a finish, confirming timing or picturing how this piece fits your nursery plans, use Get Personal Assistance. We reply the same or next business day so you can decide with full information, at your own pace.';
const OLD_H1 =
  'If you would like help choosing a finish, confirming timing, or picturing how this piece fits your nursery plans, use Get Personal Assistance. We reply the same or next business day so you can decide with full information, at your own pace.';

const STRINGS: Record<string, { id: string; file: string; text: string }> = {
  '1a': {
    id: '1a',
    file: 'West Lake 3 Drawer Nightstand',
    text: 'Thoughtful storage meets timeless design with the West Lake 3 Drawer Nightstand. Three dovetailed drawers with smooth glides provide storage for nursery essentials, pacifiers, lotions, books and more.',
  },
  '1b': {
    id: '1b',
    file: 'West Lake 3 Drawer Nightstand',
    text: 'Made of solid Brown Maple, it comes from the same collection as the West Lake furniture. Compact enough to fit beside a glider or crib, this nightstand is as practical as it is beautiful.',
  },
  '2a': {
    id: '2a',
    file: 'Mackenzie Nightstand',
    text: 'Keep nursery essentials close at hand with the Mackenzie Nightstand. This solid hardwood nightstand features three smooth-gliding drawers for storing pacifiers, burp cloths and other small items.',
  },
  '2b': {
    id: '2b',
    file: 'Mackenzie Nightstand',
    text: 'The solid Brown Maple wood and clean design coordinate with the full Mackenzie collection. Compact enough to fit beside a glider or crib, this versatile piece can move into any room as your child grows.',
  },
  '3a': {
    id: '3a',
    file: 'Mackenzie Chest',
    text: "Tall and gracefully proportioned, the Mackenzie Chest offers substantial storage in a vertical footprint that's perfect for nurseries where floor space is precious. Dovetailed drawers with smooth full-extension glides keep clothing and accessories neatly organized and within reach.",
  },
  '5b': {
    id: '5b',
    file: 'Addison 3 Drawer Nightstand',
    text: "Use it beside the glider to hold burp cloths, pacifiers and a book, or place it next to the crib for late-night diaper changes and feedings. The timeless design coordinates perfectly with the full Addison collection, making it a versatile addition to your nursery or, later, your child's bedroom.",
  },
  '6a': {
    id: '6a',
    file: 'Newport Nightstand',
    text: 'Add both style and function to your nursery with the Newport Nightstand. Crafted from solid Brown Maple hardwood, this compact nightstand provides the perfect spot for a lamp, a book or a glass of water beside the glider.',
  },
  '6b': {
    id: '6b',
    file: 'Newport Nightstand',
    text: 'Drawer storage keeps pacifiers, burp cloths and other essentials organized and close at hand. The timeless silhouette complements the full Newport collection, making it a versatile piece that moves from the nursery to any room in the home.',
  },
  '7a': {
    id: '7a',
    file: 'Nightstand - 2 Drawer',
    text: "Keep everything you need within arm's reach with the 2-Drawer Nightstand. Compact enough to fit beside a glider or crib, this solid hardwood nightstand stores late-night essentials.",
  },
  '7b': {
    id: '7b',
    file: 'Nightstand - 2 Drawer',
    text: 'Two smooth-gliding drawers with dovetail construction provide space for pacifiers, burp cloths, lotions, books and a glass of water. The sturdy top is perfect for a lamp, monitor or small decor piece. Crafted from solid Brown Maple hardwood, this nightstand brings lasting durability and timeless style to your nursery.',
  },
  '7c': {
    id: '7c',
    file: 'Nightstand - 2 Drawer',
    text: "The clean lines and classic silhouette coordinate with other Fisher's furniture, so you can create a cohesive nursery look.",
  },
};

const SEVEN = [
  'West Lake 3 Drawer Nightstand',
  'Mackenzie Nightstand',
  'Mackenzie Chest',
  'West Lake Chest',
  'Addison 3 Drawer Nightstand',
  'Newport Nightstand',
  'Nightstand - 2 Drawer',
];

test('#52 final strings appear verbatim on the named product pages', () => {
  for (const row of Object.values(STRINGS)) {
    const desc = product(row.file).description;
    assert.ok(desc.includes(row.text), `${row.id} missing from ${row.file}`);
  }
});

test('#52 H1 is only on the seven assigned pages; 4a live line is unchanged', () => {
  for (const name of SEVEN) {
    const desc = product(name).description;
    assert.ok(desc.includes(H1), `new H1 missing from ${name}`);
    assert.ok(!desc.includes(OLD_H1), `old H1 still on ${name}`);
  }
  const westLakeChest = product('West Lake Chest').description;
  assert.ok(
    westLakeChest.includes(
      'Dovetailed drawers with full-extension glides keep clothing and accessories organized and accessible. Solid Brown Maple construction ensures lasting beauty. Coordinates with the full West Lake collection.',
    ),
    '4a live line must stay on West Lake Chest',
  );
  // H1 must not have been applied site-wide.
  const other = product('West Lake 4 Drawer Dresser').description;
  assert.ok(other.includes(OLD_H1), 'H1 must remain unchanged off the seven pages');
});

test('#52 S1 site-wide assurance line is the Brand sentence', () => {
  const src = read('src/components/product/PurchaseAssurances.tsx');
  assert.ok(
    src.includes(
      "Unsure between two finishes, or trying to coordinate with an existing piece? Ask before you buy.",
    ),
  );
  assert.ok(!src.includes('or matching an existing piece?'));
});

test('#52 replaced ease/mismatch/SC phrases are gone from the seven pages', () => {
  const joined = SEVEN.map(n => product(n).description).join('\n');
  const gone = [
    'convenient storage for nursery essentials',
    'matches the full West Lake collection',
    'a single smooth-gliding drawer',
    'plus an open shelf',
    'coordinate perfectly with the full Mackenzie collection',
    'transitions easily into any room',
    'organized and easy to reach',
    'pacifiers, and a book',
    'a book, or a glass of water',
    'burp cloths, and other essentials',
    'transitions easily from nursery',
    'offers just the right amount of storage',
    'books, and a glass of water',
    'a lamp, monitor, or small decor',
    'coordinate beautifully with the full furniture collection',
    'pulled-together nursery look',
  ];
  for (const phrase of gone) {
    assert.ok(!joined.includes(phrase), `old phrase still present: ${phrase}`);
  }
});

test('OTO-1403 feed description follows 2a (3 drawers, no shelf)', () => {
  const invPath = resolve(root, 'public/data/inventory.json');
  assert.ok(existsSync(invPath), 'inventory.json missing; run data:build first');
  const inventory = JSON.parse(readFileSync(invPath, 'utf8')) as {
    sku?: string;
    productName?: string;
    description?: string;
  }[];
  const item = inventory.find(i => i.sku === 'OTO-1403');
  assert.ok(item, 'OTO-1403 missing from inventory');
  const desc = item.description ?? '';
  assert.ok(
    desc.includes(STRINGS['2a'].text),
    'OTO-1403 description must include 2a',
  );
  assert.ok(!desc.includes('a single smooth-gliding drawer'), 'OTO-1403 still says one drawer');
  assert.ok(!desc.includes('plus an open shelf'), 'OTO-1403 still mentions a shelf');
  assert.ok(desc.includes('three smooth-gliding drawers'), 'OTO-1403 must say three drawers');
});
