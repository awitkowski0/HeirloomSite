import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/*
 * Pricing App #52 row 1, round 2 (CoS QC PASS 6886761413; Brand 6886582289).
 * 12 kit/rail after-strings plus 32 round-1 after-strings (30 serial-comma
 * cuts and the 2a/10a "in one piece" cuts) applied verbatim.
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

const ROW1_32: { id: string; file: string; field: "description" | "metaDescription"; after: string; before: string }[] = [
  {
    id: '1a',
    file: 'French Country 3 Drawer Nightstand',
    field: 'description',
    after: 'Keep nighttime necessities close at hand with the French Country 3 Drawer Nightstand. It gives you three drawers for pacifiers, lotions, burp cloths and books, and a top for a lamp or baby monitor.',
    before: 'Keep nighttime necessities close at hand with the French Country 3 Drawer Nightstand. It gives you three drawers for pacifiers, lotions, burp cloths, and books, and a top for a lamp or baby monitor.',
  },
  {
    id: '1b',
    file: 'French Country 3 Drawer Nightstand',
    field: 'description',
    after: 'The dovetailed drawers have full-extension glides. The nightstand measures 24 inches wide, 28 inches high and 19 inches deep, and it is crafted from solid wood with the signature French Country detailing.',
    before: 'The dovetailed drawers have full-extension glides. The nightstand measures 24 inches wide, 28 inches high, and 19 inches deep, and it is crafted from solid wood with the signature French Country detailing.',
  },
  {
    id: '2a',
    file: 'French Country 7 Drawer Dresser with Top Mirror',
    field: 'description',
    after: 'The French Country 7 Drawer Dresser with Top Mirror gives you seven drawers and a mirror.',
    before: 'The French Country 7 Drawer Dresser with Top Mirror gives you seven drawers and a mirror in one piece.',
  },
  {
    id: '2b',
    file: 'French Country 7 Drawer Dresser with Top Mirror',
    field: 'description',
    after: 'Seven dovetailed drawers with full-extension glides provide storage for clothing, blankets and nursery supplies. The dresser measures 60 inches wide, 33½ inches high and 21½ inches deep, and it is crafted from solid wood with the signature French Country detailing.',
    before: 'Seven dovetailed drawers with full-extension glides provide storage for clothing, blankets, and nursery supplies. The dresser measures 60 inches wide, 33½ inches high, and 21½ inches deep, and it is crafted from solid wood with the signature French Country detailing.',
  },
  {
    id: '2m',
    file: 'French Country 7 Drawer Dresser with Top Mirror',
    field: 'metaDescription',
    after: 'The French Country 7 Drawer Dresser with Top Mirror has seven dovetailed drawers, a mirror and solid wood construction.',
    before: 'The French Country 7 Drawer Dresser with Top Mirror has seven dovetailed drawers, a mirror, and solid wood construction.',
  },
  {
    id: '3a',
    file: 'French Country Chest',
    field: 'description',
    after: 'The French Country Chest measures 40 inches wide, 50 inches high and 21½ inches deep.',
    before: 'The French Country Chest measures 40 inches wide, 50 inches high, and 21½ inches deep.',
  },
  {
    id: '4a',
    file: 'French Country 4 Drawer Dresser',
    field: 'description',
    after: 'The French Country 4 Drawer Dresser has four dovetailed drawers with full-extension glides for clothing, bedding and nursery essentials.',
    before: 'The French Country 4 Drawer Dresser has four dovetailed drawers with full-extension glides for clothing, bedding, and nursery essentials.',
  },
  {
    id: '4b',
    file: 'French Country 4 Drawer Dresser',
    field: 'description',
    after: 'It measures 41 inches wide, 37 inches high and 22 inches deep, and it is crafted from solid wood with the signature French Country detailing.',
    before: 'It measures 41 inches wide, 37 inches high, and 22 inches deep, and it is crafted from solid wood with the signature French Country detailing.',
  },
  {
    id: '5a',
    file: 'Mackenzie 6 Drawer Dresser',
    field: 'description',
    after: 'The Mackenzie 6 Drawer Dresser has six dovetailed drawers with full-extension glides for clothing, bedding and nursery essentials, in a solid Brown Maple frame.',
    before: 'The Mackenzie 6 Drawer Dresser has six dovetailed drawers with full-extension glides for clothing, bedding, and nursery essentials, in a solid Brown Maple frame.',
  },
  {
    id: '5b',
    file: 'Mackenzie 6 Drawer Dresser',
    field: 'description',
    after: 'It measures 56 inches wide, 34 inches high and 21½ inches deep, and it coordinates with the complete Mackenzie collection.',
    before: 'It measures 56 inches wide, 34 inches high, and 21½ inches deep, and it coordinates with the complete Mackenzie collection.',
  },
  {
    id: '5c',
    file: 'West Lake 6 Drawer Dresser',
    field: 'description',
    after: 'The West Lake 6 Drawer Dresser has six dovetailed drawers with full-extension glides for onesies, sleepers, blankets and more, in a solid hardwood frame.',
    before: 'The West Lake 6 Drawer Dresser has six dovetailed drawers with full-extension glides for onesies, sleepers, blankets, and more, in a solid hardwood frame.',
  },
  {
    id: '5d',
    file: 'West Lake 6 Drawer Dresser',
    field: 'description',
    after: 'It measures 56 inches wide, 34 inches high and 21½ inches deep, and it coordinates with the complete West Lake collection.',
    before: 'It measures 56 inches wide, 34 inches high, and 21½ inches deep, and it coordinates with the complete West Lake collection.',
  },
  {
    id: '5e',
    file: 'Addison 6 Drawer Dresser',
    field: 'description',
    after: 'The Addison 6 Drawer Dresser has six dovetailed drawers with full-extension glides for onesies, sleepers, blankets and more, in a solid hardwood frame.',
    before: 'The Addison 6 Drawer Dresser has six dovetailed drawers with full-extension glides for onesies, sleepers, blankets, and more, in a solid hardwood frame.',
  },
  {
    id: '5f',
    file: 'Addison 6 Drawer Dresser',
    field: 'description',
    after: 'It measures 56 inches wide, 35 inches high and 21 inches deep, and it coordinates with the complete Addison collection.',
    before: 'It measures 56 inches wide, 35 inches high, and 21 inches deep, and it coordinates with the complete Addison collection.',
  },
  {
    id: '10a',
    file: 'French Country 4 Drawer Dresser with Changing Table',
    field: 'description',
    after: 'The French Country 4 Drawer Dresser with Changing Table gives you four drawers and a changing table top for daily diaper changes.',
    before: 'The French Country 4 Drawer Dresser with Changing Table gives you four drawers and a changing table for daily diaper changes, all in one piece.',
  },
  {
    id: '10b',
    file: 'French Country 4 Drawer Dresser with Changing Table',
    field: 'description',
    after: 'The dovetailed drawers have full-extension glides and hold clothing, blankets and nursery supplies. It is crafted from solid wood with the signature French Country detailing.',
    before: 'The dovetailed drawers have full-extension glides and hold clothing, blankets, and nursery supplies. It is crafted from solid wood with the signature French Country detailing.',
  },
  {
    id: '11a',
    file: 'Changing Table - 6 Drawer',
    field: 'description',
    after: 'The Changing Table - 6 Drawer has six drawers for onesies, sleepers, blankets, diapers and wipes.',
    before: 'The Changing Table - 6 Drawer has six drawers for onesies, sleepers, blankets, diapers, and wipes.',
  },
  {
    id: '11b',
    file: 'Changing Table - 6 Drawer',
    field: 'description',
    after: 'It measures 50¼ inches wide, 21¼ inches deep and 33½ inches high.',
    before: 'It measures 50¼ inches wide, 21¼ inches deep, and 33½ inches high.',
  },
  {
    id: '11m',
    file: 'Changing Table - 6 Drawer',
    field: 'metaDescription',
    after: 'The Changing Table - 6 Drawer from Fisher\'s has six drawers and measures 50¼ inches wide, 21¼ inches deep and 33½ inches high.',
    before: 'The Changing Table - 6 Drawer from Fisher\'s has six drawers and measures 50¼ inches wide, 21¼ inches deep, and 33½ inches high.',
  },
  {
    id: '12a',
    file: 'Addison 7 Drawer Dresser',
    field: 'description',
    after: 'The Addison 7 Drawer Dresser has seven dovetailed drawers with full-extension glides for clothing, bedding and nursery essentials, in a solid hardwood frame.',
    before: 'The Addison 7 Drawer Dresser has seven dovetailed drawers with full-extension glides for clothing, bedding, and nursery essentials, in a solid hardwood frame.',
  },
  {
    id: '12b',
    file: 'Addison 7 Drawer Dresser',
    field: 'description',
    after: 'It measures 60 inches wide, 35 inches high and 21 inches deep, and it coordinates with the complete Addison collection.',
    before: 'It measures 60 inches wide, 35 inches high, and 21 inches deep, and it coordinates with the complete Addison collection.',
  },
  {
    id: '13a',
    file: 'French Country 6 Drawer Dresser',
    field: 'description',
    after: 'The French Country 6 Drawer Dresser has six dovetailed drawers with full-extension glides for clothing, bedding and nursery essentials.',
    before: 'The French Country 6 Drawer Dresser has six dovetailed drawers with full-extension glides for clothing, bedding, and nursery essentials.',
  },
  {
    id: '13b',
    file: 'French Country 6 Drawer Dresser',
    field: 'description',
    after: 'It measures 55 inches wide, 33 inches high and 22 inches deep, and it is crafted from solid wood with the signature French Country detailing.',
    before: 'It measures 55 inches wide, 33 inches high, and 22 inches deep, and it is crafted from solid wood with the signature French Country detailing.',
  },
  {
    id: '14a',
    file: 'Mackenzie 7 Drawer Dresser',
    field: 'description',
    after: 'The Mackenzie 7 Drawer Dresser has seven dovetailed drawers with full-extension glides for clothing, bedding and nursery essentials, in a solid Brown Maple frame.',
    before: 'The Mackenzie 7 Drawer Dresser has seven dovetailed drawers with full-extension glides for clothing, bedding, and nursery essentials, in a solid Brown Maple frame.',
  },
  {
    id: '14b',
    file: 'Mackenzie 7 Drawer Dresser',
    field: 'description',
    after: 'It measures 60 inches wide, 34 inches high and 21½ inches deep, and it coordinates with the complete Mackenzie collection.',
    before: 'It measures 60 inches wide, 34 inches high, and 21½ inches deep, and it coordinates with the complete Mackenzie collection.',
  },
  {
    id: '16a',
    file: 'West Lake 7 Drawer Dresser',
    field: 'description',
    after: 'The West Lake 7 Drawer Dresser has seven dovetailed drawers with full-extension glides for onesies, sleepers, blankets and more, in a solid hardwood frame.',
    before: 'The West Lake 7 Drawer Dresser has seven dovetailed drawers with full-extension glides for onesies, sleepers, blankets, and more, in a solid hardwood frame.',
  },
  {
    id: '16b',
    file: 'West Lake 7 Drawer Dresser',
    field: 'description',
    after: 'It measures 60 inches wide, 34 inches high and 21½ inches deep, and it coordinates with the complete West Lake collection.',
    before: 'It measures 60 inches wide, 34 inches high, and 21½ inches deep, and it coordinates with the complete West Lake collection.',
  },
  {
    id: '17a',
    file: 'Newport 7 Drawer Dresser',
    field: 'description',
    after: 'The Newport 7 Drawer Dresser has seven drawers for onesies, sleepers, blankets and more, in a solid Brown Maple frame.',
    before: 'The Newport 7 Drawer Dresser has seven drawers for onesies, sleepers, blankets, and more, in a solid Brown Maple frame.',
  },
  {
    id: '17b',
    file: 'Newport 7 Drawer Dresser',
    field: 'description',
    after: 'It measures 56 inches wide, 33 inches high and 18¾ inches deep, and it coordinates with the complete Newport collection.',
    before: 'It measures 56 inches wide, 33 inches high, and 18¾ inches deep, and it coordinates with the complete Newport collection.',
  },
  {
    id: '18a',
    file: 'Newport 4 Drawer Chest',
    field: 'description',
    after: 'The Newport 4 Drawer Chest has four drawers for sleepers, clothing and nursery essentials, in a solid Brown Maple frame.',
    before: 'The Newport 4 Drawer Chest has four drawers for sleepers, clothing, and nursery essentials, in a solid Brown Maple frame.',
  },
  {
    id: '18b',
    file: 'Newport 4 Drawer Chest',
    field: 'description',
    after: 'It measures 38 inches wide, 42 inches high and 18¾ inches deep, and it coordinates with the complete Newport collection.',
    before: 'It measures 38 inches wide, 42 inches high, and 18¾ inches deep, and it coordinates with the complete Newport collection.',
  },
  {
    id: '19b',
    file: 'Addison Chest Dresser',
    field: 'description',
    after: 'It measures 41 inches wide, 50 inches high and 21 inches deep, and it coordinates with the complete Addison collection.',
    before: 'It measures 41 inches wide, 50 inches high, and 21 inches deep, and it coordinates with the complete Addison collection.',
  },
];

test('#52 row 1: 32 round-1 after-strings appear verbatim (serial-comma and in-one-piece cuts)', () => {
  for (const row of ROW1_32) {
    const p = product(row.file);
    const val = row.field === 'metaDescription' ? (p.metaDescription ?? '') : p.description;
    assert.ok(val.includes(row.after), `${row.id} after-string missing from ${row.file} ${row.field}`);
    assert.ok(!val.includes(row.before), `${row.id} before-string still present on ${row.file} ${row.field}`);
  }
  assert.equal(ROW1_32.length, 32);
});

