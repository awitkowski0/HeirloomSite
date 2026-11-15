import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/*
 * Pricing App #52 row 1, round 2 (CoS QC PASS 6886761413; Brand 6886582289).
 * 12 kit/rail after-strings applied verbatim. The other 32 strings are
 * citation-only and must not be edited in this PR.
 */

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const product = (name: string) =>
  JSON.parse(readFileSync(resolve(root, `public/data/products/${name}/product.json`), 'utf8')) as {
    description: string;
    metaDescription?: string;
  };

const BODY = [
  {
    id: '8b',
    file: 'Full Bed Rail Kit',
    field: 'description' as const,
    text: 'It is crafted from solid wood for the French Country crib.',
  },
  {
    id: '8d',
    file: 'Addison Toddler Bed',
    field: 'description' as const,
    text: 'It is made from solid hardwood for the Addison crib.',
  },
  {
    id: '8f',
    file: 'West Lake Toddler Bed',
    field: 'description' as const,
    text: 'It is made from solid hardwood for the West Lake crib.',
  },
  {
    id: '8h',
    file: 'Newport Toddler Bed',
    field: 'description' as const,
    text: 'It is made of solid Brown Maple for the Newport crib.',
  },
  {
    id: '8j',
    file: 'Toddler Conversion Rail',
    field: 'description' as const,
    text: 'Toddler Bed Rail Kit is a conversion kit for the French Country crib, not a standalone bed.',
  },
  {
    id: '8k',
    file: 'Toddler Conversion Rail',
    field: 'description' as const,
    text: 'Designed specifically for French Country cribs, this rail replaces the front of the crib to create a toddler bed. It is crafted from solid wood for the French Country crib.',
  },
  {
    id: '8r',
    file: 'West Lake Full Bed Rail Kit',
    field: 'description' as const,
    text: 'It is made from solid hardwood for the West Lake crib.',
  },
  {
    id: '9a',
    file: '3-4 Guard Rail',
    field: 'description' as const,
    text: '3/4 Guard Rail Kit is a conversion kit for the Addison crib, not a standalone bed. Add it after you convert the crib to a bed.',
  },
  {
    id: '9d',
    file: 'Full Guard Rail',
    field: 'description' as const,
    text: 'Full Guard Rail Kit is a conversion kit for the Addison crib, not a standalone bed. Add it after you convert the crib to a bed.',
  },
];

const META = [
  {
    id: '8l',
    file: 'Toddler Conversion Rail',
    text: 'Toddler Bed Rail Kit is a conversion kit for the French Country crib, not a standalone bed.',
  },
  {
    id: '9b',
    file: '3-4 Guard Rail',
    text: '3/4 Guard Rail Kit is a conversion kit for the Addison crib, not a standalone bed.',
  },
  {
    id: '9e',
    file: 'Full Guard Rail',
    text: 'Full Guard Rail Kit is a conversion kit for the Addison crib, not a standalone bed.',
  },
];

test('#52 row 1: 12 kit/rail after-strings appear verbatim', () => {
  for (const row of BODY) {
    const desc = product(row.file).description;
    assert.ok(desc.includes(row.text), `${row.id} missing from ${row.file} description`);
  }
  for (const row of META) {
    const meta = product(row.file).metaDescription ?? '';
    assert.equal(meta, row.text, `${row.id} metaDescription mismatch`);
  }
});

test('#52 row 1: replaced matching/same-collection phrases are gone from the eight pages', () => {
  const files = [...new Set([...BODY, ...META].map(r => r.file))];
  const gone = [
    'from the same collection',
    'to match your French Country furniture',
    'to match your West Lake collection',
    'to match the West Lake crib',
    'to match your crib',
    'and matches the Addison collection',
    'works with your matching crib',
    'Add it once the crib is converted to a bed',
  ];
  for (const name of files) {
    const p = product(name);
    const blob = `${p.description}\n${p.metaDescription ?? ''}`;
    for (const phrase of gone) {
      assert.ok(!blob.includes(phrase), `old phrase still on ${name}: ${phrase}`);
    }
  }
});
