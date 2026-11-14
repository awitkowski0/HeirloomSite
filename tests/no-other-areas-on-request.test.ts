import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/*
 * Pricing App #59 / HeirloomSite #143 QC: the delivery-area sentence
 * "Other areas may be available on request" must be gone from site source.
 * Asserts the phrase "available on request" is absent from the shipping page
 * and from every other file that carried that delivery sentence (FAQ, timeline).
 * Kids Comfort "available on request" (unlisted pieces, not delivery area)
 * lives on other pages and is out of scope.
 */

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const DELIVERY_AREA_FILES = [
  'src/app/shipping/page.tsx',
  'src/app/faq/page.tsx',
  'src/app/timeline/page.tsx',
];

test('"available on request" is absent from delivery-area page source', () => {
  for (const rel of DELIVERY_AREA_FILES) {
    const src = readFileSync(resolve(root, rel), 'utf8');
    assert.doesNotMatch(
      src,
      /available on request/i,
      `${rel} still contains "available on request"`,
    );
    assert.doesNotMatch(
      src,
      /Other areas may be available on request/,
      `${rel} still contains "Other areas may be available on request"`,
    );
  }
});

function listTsx(dir: string, acc: string[] = []): string[] {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = resolve(dir, e.name);
    if (e.isDirectory()) listTsx(p, acc);
    else if (e.name.endsWith('.tsx') || e.name.endsWith('.ts')) acc.push(p);
  }
  return acc;
}

test('"Other areas may be available on request" is absent from src/', () => {
  const files = listTsx(resolve(root, 'src'));
  assert.ok(files.length > 10);
  for (const f of files) {
    const src = readFileSync(f, 'utf8');
    assert.doesNotMatch(
      src,
      /Other areas may be available on request/,
      `${f.slice(root.length + 1)} still contains the removed sentence`,
    );
  }
});
