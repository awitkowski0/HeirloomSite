import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

/*
 * Guards the brand rules applied to the four public-facing pages:
 *   /home (page.tsx + HomeHero + ProvenanceBand), /safety, /why-hardwood, /finishes
 * 1. These pages advertise Brown Maple only (the Cherry / Red Oak variant links
 *    404 live), with maple described as a WOOD.
 * 2. Heirloom does not make its own "meets/exceeds ... CPSC/ASTM standards"
 *    safety claims; that wording belongs to the builders' own sourced words.
 *
 * Assertions run against the RENDERED copy, so block comments (historical notes
 * and rationale) are stripped before matching.
 */
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const stripComments = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '');
const rendered = (f: string) => stripComments(readFileSync(resolve(root, f), 'utf8'));

const FOUR_PAGES = [
  'src/app/page.tsx',
  'src/components/home/HomeHero.tsx',
  'src/components/home/ProvenanceBand.tsx',
  'src/app/safety/page.tsx',
  'src/app/why-hardwood/page.tsx',
  'src/app/finishes/page.tsx',
];

test('no Cherry or Red Oak wood lists remain in rendered copy on the four pages', () => {
  for (const f of FOUR_PAGES) {
    const src = rendered(f);
    assert.ok(!/cherry/i.test(src), `${f} still mentions cherry in rendered copy`);
    assert.ok(!/red oak/i.test(src), `${f} still mentions red oak in rendered copy`);
  }
});

test('no Heirloom-owned "meets/exceeds ... standards" safety claim in rendered copy on the four pages', () => {
  for (const f of FOUR_PAGES) {
    const src = rendered(f);
    assert.ok(!/meets?\s+or\s+exceeds?/i.test(src), `${f} still has a meets/exceeds claim`);
    assert.ok(!/meet\s+or\s+exceed/i.test(src), `${f} still has a meet-or-exceed claim`);
    assert.ok(!/exceeds?\s+all\s+safety\s+standards/i.test(src), `${f} has "exceeds all safety standards"`);
  }
});

test('Brown Maple is still described as a wood on the home/safety/why-hardwood/finishes copy', () => {
  for (const f of [
    'src/app/page.tsx',
    'src/components/home/HomeHero.tsx',
    'src/components/home/ProvenanceBand.tsx',
    'src/app/safety/page.tsx',
    'src/app/why-hardwood/page.tsx',
    'src/app/finishes/page.tsx',
  ]) {
    assert.match(rendered(f), /brown maple/i, `${f} should still name brown maple`);
  }
});
