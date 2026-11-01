/*
 * The company name is exactly "Heirloom Cribs & More" (Phil, Oct 23). The old
 * form "Heirloom Cribs and More" must not appear in customer-visible text:
 * page copy, metadata, titles, aria labels, emails. Code comments are skipped,
 * and so are domains/emails (heirloomcribsandmore.com has no spaces, so the
 * pattern below cannot match it). Run with `npm test`.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { SITE_NAME, stripSiteSuffix } from '../src/lib/seo';

const root = process.cwd();
const OLD_NAME = /Heirloom\s+Cribs\s+and\s+More/i;

function walk(dir: string, out: string[] = []): string[] {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(n)) out.push(p);
  }
  return out;
}

function withoutComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, ' ')
    .replace(/(^|[^:'"`])\/\/[^\n]*/g, '$1');
}

test('SITE_NAME is exactly "Heirloom Cribs & More"', () => {
  assert.equal(SITE_NAME, 'Heirloom Cribs & More');
});

test('no "Heirloom Cribs and More" in customer-visible src text', () => {
  const hits: string[] = [];
  for (const f of walk(join(root, 'src'))) {
    const text = withoutComments(readFileSync(f, 'utf8')).replace(/\s+/g, ' ');
    const m = text.match(OLD_NAME);
    if (m) hits.push(relative(root, f));
  }
  assert.deepEqual(hits, []);
});

test('stored titles with either suffix form are stripped (no doubled site name)', () => {
  assert.equal(stripSiteSuffix('Tala Rugged Muse Portable Lamp — Heirloom Cribs and More'), 'Tala Rugged Muse Portable Lamp');
  assert.equal(stripSiteSuffix('Tala Rugged Muse Portable Lamp — Heirloom Cribs & More'), 'Tala Rugged Muse Portable Lamp');
  assert.equal(stripSiteSuffix('Mission — Heirloom Cribs'), 'Mission');
});
