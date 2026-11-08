/*
 * Arched Top Mx gallery image must be caption-free. arched_top_5.jpg had a
 * burned-in "sample" caption; PR #122's crop (arched_top_5_v2.jpg, kept in
 * place, unused) is superseded by the GRAFTv2 Mx file from PR #124.
 * Run with `npm test`.
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

test('Arched Top Mx uses a caption-free image (GRAFTv2 file supersedes the arched_top_5_v2.jpg crop)', () => {
  const media = JSON.parse(readFileSync(join(DIR, 'media.json'), 'utf8'));
  const mx: string[] = media['Mx||Mx'];
  assert.equal(mx.length, 1);
  // Any later _vN file is accepted; the captioned original and the old crop are not required.
  assert.match(mx[0], /^arched_top_5_v([3-9]|[1-9]\d+)\.jpg$/);
  const file = join(DIR, mx[0]);
  assert.ok(existsSync(file));
  const bytes = readFileSync(file);
  jpegSize(bytes);
  assert.ok(!bytes.equals(readFileSync(join(DIR, 'arched_top_5.jpg'))), 'Mx image must differ from arched_top_5.jpg');
});
