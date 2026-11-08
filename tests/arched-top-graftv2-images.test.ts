/*
 * Arched Top: every colour's gallery image is the final GRAFTv2 render
 * (1200x1000 standard JPEG), saved under a new _vN name so cached old
 * files are never overwritten. Run with `npm test`.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

const DIR = join(process.cwd(), 'public/data/products/Arched Top');

// colour -> [old file, new file]
const SWAPS: Record<string, [string, string]> = {
  'Antique Slate': ['arched_top_0.jpg', 'arched_top_0_v3.jpg'],
  Driftwood: ['arched_top_1.jpg', 'arched_top_1_v3.jpg'],
  Frost: ['arched_top_2.jpg', 'arched_top_2_v3.jpg'],
  Fruitwood: ['arched_top_3.jpg', 'arched_top_3_v3.jpg'],
  Harvest: ['arched_top_4.jpg', 'arched_top_4_v3.jpg'],
  Mx: ['arched_top_5.jpg', 'arched_top_5_v4.jpg'],
  Natural: ['arched_top_6.jpg', 'arched_top_6_v3.jpg'],
  Provincial: ['arched_top_7.jpg', 'arched_top_7_v3.jpg'],
  Seely: ['arched_top_8.jpg', 'arched_top_8_v3.jpg'],
  Smoke: ['arched_top_9.jpg', 'arched_top_9_v3.jpg'],
  Washington: ['arched_top_10.jpg', 'arched_top_10_v3.jpg'],
};

// sha256 of each final file (equals the released source JPEG)
const SHA256: Record<string, string> = {
  'arched_top_0_v3.jpg': 'b3a378b9a7c9304709c0fa73aacd2f2c0a9c2e02edfb1ce5850cbab2ff62ddaf',
  'arched_top_1_v3.jpg': 'dd4e7746d9eef3c264b0537db563ddb73f5076265bcf3dc6f201a208f152e896',
  'arched_top_2_v3.jpg': '659332be300dd54f8715e7d2e30aacfc80616cd76cffc9d015d6abe6764aeec4',
  'arched_top_3_v3.jpg': 'bb02bab976498835061282a0b8e2932e2ebad727add45737aa97957bb5f2c709',
  'arched_top_4_v3.jpg': '245caca33902663721e640cb3e80d59ccff30a3c4f3e41b8ee456a23a0f7e708',
  'arched_top_5_v4.jpg': '7e4c6c9031d63ae24bec35860ec674476f97e9532232f2e1cc504cc38d68ee84',
  'arched_top_6_v3.jpg': 'c8aa69824f183ecb5cda6d822ea4158f220f45de4c2e4a7d6e4bccfcaba763ec',
  'arched_top_7_v3.jpg': '32fc0fbe55408a07995889116ec86add05528f1675458dca82ab2855d9e52225',
  'arched_top_8_v3.jpg': 'cbe1881d0b4a499e086d1a5a7e8baef216579805972886cb3b0bfed2764ef113',
  'arched_top_9_v3.jpg': 'fba94b66ecd060d61d5b93dbc394a5b8ea2463c09ea32347511f8f4269446e3c',
  'arched_top_10_v3.jpg': 'ffb700955a21eec11a45549585aa7f502bbe779f2df023116a211031dfa07c97',
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
    assert.ok(bytes.length > 200_000, 'final render expected, not a placeholder');
    assert.equal(createHash('sha256').update(bytes).digest('hex'), SHA256[file], `${file} sha256`);
    assert.ok(!bytes.equals(readFileSync(join(DIR, oldFile))), `${file} must differ from ${oldFile}`);
  });
}
