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

test('no "Sustainably sourced" claim remains on the four pages or home components', () => {
  for (const f of FOUR_PAGES) {
    assert.ok(!/sustainably sourced/i.test(rendered(f)), `${f} still says "Sustainably sourced"`);
  }
});

/*
 * Heirloom-voice "non-toxic / baby-safe" claims were removed from /safety,
 * /why-hardwood and the home band (ProvenanceBand) in this revision. Three
 * instances are intentionally OUT of scope and left in place (reported for
 * Brand): page.tsx:~125 (home JourneyPoints, not the band), and finishes.tsx
 * ~95 / ~109 (protected by "do not otherwise rewrite /finishes"). So this guard
 * is scoped to the surfaces that were cleaned.
 */
const NONTOXIC_CLEANED = [
  'src/app/safety/page.tsx',
  'src/app/why-hardwood/page.tsx',
  'src/components/home/ProvenanceBand.tsx',
];

test('no Heirloom-voice non-toxic/baby-safe claim on the cleaned surfaces (safety, why-hardwood, home band)', () => {
  for (const f of NONTOXIC_CLEANED) {
    const src = rendered(f);
    assert.ok(!/non-toxic/i.test(src), `${f} still has a non-toxic claim`);
    assert.ok(!/baby-safe/i.test(src), `${f} still has a baby-safe claim`);
  }
});
