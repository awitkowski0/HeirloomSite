/*
 * Arched Top: every colour's gallery image is the final GRAFTv2 render
 * (1200x1000 standard JPEG), saved under a new _vN name so cached old
 * files are never overwritten. Run with `npm test`.
 *
 * NOTE (draft): the 11 files are currently labelled PLACEHOLDER images while
 * the final JPEGs are re-exported; they are swapped for the finals before
 * this PR leaves draft. The size and exists checks apply to both.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const DIR = join(process.cwd(), 'public/data/products/Arched Top');

// colour -> [old file, new file]
const SWAPS: Record<string, [string, string]> = {
  'Antique Slate': ['arched_top_0.jpg', 'arched_top_0_v2.jpg'],
  Driftwood: ['arched_top_1.jpg', 'arched_top_1_v2.jpg'],
  Frost: ['arched_top_2.jpg', 'arched_top_2_v2.jpg'],
  Fruitwood: ['arched_top_3.jpg', 'arched_top_3_v2.jpg'],
  Harvest: ['arched_top_4.jpg', 'arched_top_4_v2.jpg'],
  Mx: ['arched_top_5.jpg', 'arched_top_5_v3.jpg'],
  Natural: ['arched_top_6.jpg', 'arched_top_6_v2.jpg'],
  Provincial: ['arched_top_7.jpg', 'arched_top_7_v2.jpg'],
  Seely: ['arched_top_8.jpg', 'arched_top_8_v2.jpg'],
  Smoke: ['arched_top_9.jpg', 'arched_top_9_v2.jpg'],
  Washington: ['arched_top_10.jpg', 'arched_top_10_v2.jpg'],
};

function jpegSof(buf: Buffer): { marker: number; w: number; h: number } {
  assert.equal(buf.readUInt16BE(0), 0xffd8, 'not a JPEG');
  let i = 2;
  while (i < buf.length) {
    if (buf[i] !== 0xff) { i++; continue; }
    const m = buf[i + 1];
    const len = buf.readUInt16BE(i + 2);
    if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) {
      return { marker: m, h: buf.readUInt16BE(i + 5), w: buf.readUInt16BE(i + 7) };
    }
    i += 2 + len;
  }
  throw new Error('no SOF marker');
}

test('Arched Top media.json maps all 11 colours to the new GRAFTv2 files', () => {
  const media = JSON.parse(readFileSync(join(DIR, 'media.json'), 'utf8'));
  for (const [colour, [, file]] of Object.entries(SWAPS)) {
    assert.deepEqual(media[`${colour}||${colour}`], [file], colour);
  }
});

for (const [colour, [oldFile, file]] of Object.entries(SWAPS)) {
  test(`Arched Top ${colour}: ${file} exists, is 1200x1000 standard JPEG, differs from ${oldFile}`, () => {
    const path = join(DIR, file);
    assert.ok(existsSync(path), `${file} missing`);
    const bytes = readFileSync(path);
    const { marker, w, h } = jpegSof(bytes);
    assert.equal(w, 1200);
    assert.equal(h, 1000);
    assert.ok(marker === 0xc0 || marker === 0xc1, 'expected a baseline (non-progressive) JPEG');
    assert.ok(existsSync(join(DIR, oldFile)), `old ${oldFile} must stay in place (cached)`);
    assert.ok(!bytes.equals(readFileSync(join(DIR, oldFile))), `${file} must differ from ${oldFile}`);
  });
}
