import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/*
 * Pricing App #25, CoS option A (tag visibility) and option A (Q15 opening).
 * Tags stay in source for check-copy; the visible FAQ copy shows the builder
 * name, quotation marks, and a short source, not the raw tag.
 */

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const FAQ_SRC = readFileSync(resolve(root, 'src/app/faq/page.tsx'), 'utf8');

const SIGNED_TAGS = [
  '[builder-quote: OTO, 2026 Catalog p. 3]',
  '[builder-quote: KC, catalog p. 7, January 2023]',
  '[builder-quote: FQP, 2024/25 catalog crib spreads]',
] as const;

test('FAQ source keeps the signed [builder-quote: …] tags for check-copy', () => {
  for (const tag of SIGNED_TAGS) {
    assert.ok(FAQ_SRC.includes(tag), `missing tag in source: ${tag}`);
  }
});

test('raw [builder-quote: …] tags are not written as visible JSX text', () => {
  // Option A: tags live in the BUILDER_QUOTE constants (and as a prop value).
  // They must not appear as a text node a visitor or FAQ JSON-LD would read.
  assert.doesNotMatch(FAQ_SRC, />\s*\[builder-quote:/);
  assert.doesNotMatch(FAQ_SRC, /\[builder-quote:[^\]]+\]\s*</);
});

test('Q1 uses the exact catalog wording, both tags, and short visible sources', () => {
  assert.match(
    FAQ_SRC,
    /Old Town Oak states: “solid, American\s+handcrafted baby furniture\.”/,
  );
  assert.match(FAQ_SRC, /\(2026 catalog, p\. 3\) Kids Comfort states:/);
  assert.match(
    FAQ_SRC,
    /Kids Comfort states: “All cribs are completely solid wood\s+including the mattress support\.”/,
  );
  assert.match(FAQ_SRC, /\(catalog, p\. 7, January 2023\) Where a product page states/);
  assert.ok(FAQ_SRC.includes(SIGNED_TAGS[0]));
  assert.ok(FAQ_SRC.includes(SIGNED_TAGS[1]));
});

test('Q3 uses the exact catalog wording and keeps the ALLOW-1 opening', () => {
  assert.match(
    FAQ_SRC,
    /Every piece is made to order by an independent builder\. Old Town Oak states: “solid,\s+American handcrafted baby furniture\.”/,
  );
  assert.match(FAQ_SRC, /\(2026 catalog, p\. 3\) Fisher/);
  assert.match(FAQ_SRC, /Fisher&rsquo;s pieces are made in Pennsylvania/);
  assert.doesNotMatch(FAQ_SRC, /describes its furniture as/);
  assert.doesNotMatch(FAQ_SRC, /“American handcrafted,”/);
});

test('Q6 keeps the existing quotes and adds the short visible sources', () => {
  assert.match(
    FAQ_SRC,
    /to preschoolers\.&rdquo;[\s\S]{0,120}\(2026 catalog, p\. 3\) Fisher/,
  );
  assert.match(
    FAQ_SRC,
    /frame, toddler bed rail, and hardware\.&rdquo;[\s\S]{0,160}\(2024\/25 catalog crib spreads\) Check the product page/,
  );
});

test('Q15 opening is unchanged (CoS option A)', () => {
  assert.match(
    FAQ_SRC,
    /Cribs sold in the United States are covered by CPSC and ASTM standards\. We resell cribs\s+made by independent builders, and each builder speaks for its own cribs\./,
  );
});

test('handcrafted appears on the FAQ only inside the tagged Old Town Oak quote', () => {
  const matches = FAQ_SRC.match(/handcrafted/gi) ?? [];
  assert.ok(matches.length >= 1, 'expected the OTO handcrafted quote on the FAQ');
  const stripped = FAQ_SRC.replace(/“solid,\s*American\s+handcrafted baby furniture\.”/g, '');
  assert.doesNotMatch(stripped, /handcrafted/i);
});
