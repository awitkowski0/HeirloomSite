/*
 * Round 15 guards:
 *  - Mackenzie and French Country 3/4 and full guard-rail photos were
 *    byte-identical to the Addison OTO-1275 / OTO-1290 images. No
 *    collection-specific source exists, so those photos were removed.
 *  - OTO crib "4-in-1" wording is kept. Phil (via CoS and Director,
 *    12:20 PM ET) held the 3-in-1 change: OTO's toddler rail also
 *    serves as a day bed, so 4-in-1 is correct.
 *  - The site-wide footer link "How 4-in-1 Conversion Works" is unchanged.
 *  - Kit prices are out of scope and are not touched here.
 *
 * Run with `npm test`.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const PRODUCTS = join(ROOT, 'public/data/products');

const GAP_GUARD_FOLDERS = [
  'Mackenzie 3-4 Guard Rail',
  'Mackenzie Full Guard Rail',
  'French Country 3-4 Guard Rail',
  'Guard Rail',
] as const;

const ADDISON_34 = join(PRODUCTS, '3-4 Guard Rail', '3_4_guard_rail_0.jpg');
const ADDISON_FULL = join(PRODUCTS, 'Full Guard Rail', 'full_guard_rail_0.jpg');

function sha256(path: string): string {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function productJson(folder: string): { description: string; metaDescription?: string; category?: string } {
  return JSON.parse(readFileSync(join(PRODUCTS, folder, 'product.json'), 'utf8'));
}

test('Mackenzie and French Country guard-rail photos were removed; no Addison stand-in remains', () => {
  assert.ok(existsSync(ADDISON_34), 'Addison 3/4 reference photo still on disk');
  assert.ok(existsSync(ADDISON_FULL), 'Addison full-guard reference photo still on disk');
  const addison34 = sha256(ADDISON_34);
  const addisonFull = sha256(ADDISON_FULL);

  for (const folder of GAP_GUARD_FOLDERS) {
    const dir = join(PRODUCTS, folder);
    const media = JSON.parse(readFileSync(join(dir, 'media.json'), 'utf8'));
    assert.deepEqual(media, {}, `${folder} media.json is empty`);
    const jpgs = readdirSync(dir).filter(f => f.toLowerCase().endsWith('.jpg') || f.toLowerCase().endsWith('.png'));
    assert.deepEqual(jpgs, [], `${folder} has no product photos`);
  }

  // Remaining on-disk rail images must not be silent copies of the Addison rails
  // under a Mackenzie or French Country folder (the gap products have none).
  for (const folder of readdirSync(PRODUCTS)) {
    if (!/mackenzie|french country/i.test(folder)) continue;
    const dir = join(PRODUCTS, folder);
    for (const file of readdirSync(dir)) {
      if (!/\.(jpe?g|png)$/i.test(file)) continue;
      const digest = sha256(join(dir, file));
      assert.notEqual(digest, addison34, `${folder}/${file} is not the Addison 3/4 rail photo`);
      assert.notEqual(digest, addisonFull, `${folder}/${file} is not the Addison full-guard photo`);
    }
  }
});

test('Mackenzie toddler and full-bed kit photos, and the shared French Country 401A/401B photos, stay collection-correct', () => {
  const keep: Array<[string, string]> = [
    ['Mackenzie Toddler Bed', 'mackenzie_toddler_bed_0_v2.jpg'],
    ['Mackenzie Full Bed Rail Kit', 'mackenzie_full_bed_rail_kit_0_v2.jpg'],
    ['Toddler Conversion Rail', 'toddler_conversion_rail_0_v2.jpg'],
    ['Full Bed Rail Kit', 'full_bed_rail_kit_0_v2.jpg'],
  ];
  const addisonToddler = sha256(join(PRODUCTS, 'Addison Toddler Bed', 'addison_toddler_bed_0_v2.jpg'));
  const addisonFull = sha256(join(PRODUCTS, 'Addison Full Bed Rail Kit', 'addison_full_bed_rail_kit_0_v2.jpg'));
  for (const [folder, file] of keep) {
    const path = join(PRODUCTS, folder, file);
    assert.ok(existsSync(path), `${folder}/${file} exists`);
    const digest = sha256(path);
    assert.notEqual(digest, addisonToddler, `${folder} is not the Addison toddler photo`);
    assert.notEqual(digest, addisonFull, `${folder} is not the Addison full-bed photo`);
    const media = JSON.parse(readFileSync(join(PRODUCTS, folder, 'media.json'), 'utf8')) as Record<string, string[]>;
    assert.equal(Object.values(media)[0][0], file, `${folder} media still points at ${file}`);
  }
});

const OTO_THREE_STAGE_CRIBS = [
  'Addison Crib',
  'Addison Crib with Raised Panel Headboard',
  'French Country Crib (Panel Style Front)',
  'French Country Crib (Slat Style Front)',
  'Mackenzie Crib (Panel Back)',
  'Mackenzie Crib (Slat Back)',
  'Newport Crib',
  'West Lake Crib',
] as const;

const FQP_FOUR_STAGE_WITH_4IN1 = [
  'Arched Top',
  'Darlington',
  'Hudson',
  'Princeton',
] as const;

function listedStages(description: string): string[] {
  const stages: string[] = [];
  if (/\bcrib\b/i.test(description)) stages.push('crib');
  if (/toddler bed/i.test(description)) stages.push('toddler');
  if (/day ?bed/i.test(description)) stages.push('daybed');
  if (/full-size(?: \(double\))? bed/i.test(description)) stages.push('full');
  return stages;
}

test('OTO crib product copy keeps 4-in-1, not 3-in-1 (Phil HOLD 12:20 PM ET)', () => {
  for (const folder of OTO_THREE_STAGE_CRIBS) {
    const p = productJson(folder);
    const text = `${p.description}\n${p.metaDescription ?? ''}`;
    assert.match(text, /4-in-1/);
    assert.doesNotMatch(text, /3-in-1/);
  }
});

test("Fisher's crib pages that list four stages and already said 4-in-1 are unchanged", () => {
  for (const folder of FQP_FOUR_STAGE_WITH_4IN1) {
    const p = productJson(folder);
    const stages = listedStages(p.description);
    assert.deepEqual(stages, ['crib', 'toddler', 'daybed', 'full'], `${folder} still lists four stages`);
    assert.match(p.description, /4-in-1/);
    assert.doesNotMatch(p.description, /3-in-1/);
  }
});

test('site-wide footer link "How 4-in-1 Conversion Works" is unchanged', () => {
  const footer = readFileSync(join(ROOT, 'src/components/layout/Footer.tsx'), 'utf8');
  assert.match(footer, /How 4-in-1 Conversion Works/);
  assert.doesNotMatch(footer, /How 3-in-1 Conversion Works/);
});
