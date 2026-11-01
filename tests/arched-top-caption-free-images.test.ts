/*
 * Arched Top Mx gallery image must be the caption-free crop of
 * arched_top_5.jpg (which had a burned-in "sample" caption). Run with `npm test`.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const DIR = join(process.cwd(), 'public/data/products/Arched Top');

function jpegSize(buf: Buffer): { w: number; h: number } {
  let i = 2;
  while (i < buf.length) {
    if (buf[i] !== 0xff) { i++; continue; }
    const m = buf[i + 1];
    const len = buf.readUInt16BE(i + 2);
    if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) {
      return { h: buf.readUInt16BE(i + 5), w: buf.readUInt16BE(i + 7) };
    }
    i += 2 + len;
  }
  throw new Error('no SOF marker');
}

test('Arched Top Mx uses caption-free arched_top_5_v2.jpg', () => {
  const media = JSON.parse(readFileSync(join(DIR, 'media.json'), 'utf8'));
  assert.deepEqual(media['Mx||Mx'], ['arched_top_5_v2.jpg']);
  const file = join(DIR, 'arched_top_5_v2.jpg');
  assert.ok(existsSync(file));
  const bytes = readFileSync(file);
  const { w } = jpegSize(bytes);
  assert.equal(w, 1104);
  assert.ok(!bytes.equals(readFileSync(join(DIR, 'arched_top_5.jpg'))), 'v2 must differ from arched_top_5.jpg');
});
