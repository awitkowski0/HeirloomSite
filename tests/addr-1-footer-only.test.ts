import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { WAREHOUSE_FOOTER_LINE } from '../src/lib/published-contact';

/*
 * ADDR-1: the former mail-office street must not appear anywhere in the
 * tree, and the warehouse street is confined to the footer constant plus
 * the footer that renders it.
 */

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SKIP = new Set(['node_modules', '.git', '.next', 'dist', 'coverage', 'out']);
const banned = ['M', 'a', 'n', 'o', 'r'].join('');

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

test('no former mail-office street name remains in the repo (src, tests, docs)', () => {
  const hits: string[] = [];
  const needle = banned.toLowerCase();
  for (const file of walk(root)) {
    if (!/\.(ts|tsx|js|mjs|md|json|txt|css)$/i.test(file)) continue;
    const text = readFileSync(file, 'utf8');
    if (text.toLowerCase().includes(needle)) {
      hits.push(relative(root, file));
    }
  }
  assert.deepEqual(hits, [], `banned street name found in: ${hits.join(', ')}`);
});

test('warehouse street appears only in the footer constant and the footer component', () => {
  const allow = new Set([
    'src/lib/published-contact.ts',
    'src/components/layout/Footer.tsx',
    'tests/identity-contact.test.ts',
    'tests/addr-1-footer-only.test.ts',
  ]);
  const hits: string[] = [];
  for (const file of walk(join(root, 'src'))) {
    if (!/\.(ts|tsx)$/i.test(file)) continue;
    const rel = relative(root, file);
    if (allow.has(rel)) continue;
    const text = readFileSync(file, 'utf8');
    if (text.includes('4651') || /Hanoverville/i.test(text)) hits.push(rel);
  }
  assert.deepEqual(hits, [], `warehouse street leaked outside the footer: ${hits.join(', ')}`);
  const footer = readFileSync(join(root, 'src/components/layout/Footer.tsx'), 'utf8');
  assert.ok(footer.includes('WAREHOUSE_FOOTER_LINE'));
  assert.equal(
    WAREHOUSE_FOOTER_LINE.includes('4651 A Hanoverville Rd, Bethlehem, PA 18020'),
    true,
  );
});
