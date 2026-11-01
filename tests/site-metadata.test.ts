/*
 * Site-wide metadata (src/app/layout.tsx): no held "forest to family" wording,
 * and the delivery meaning (charged; Curbside or White Glove) in the meta and
 * og descriptions. Text from Brand's ruling on #115, 2026-11-01.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const src = readFileSync(new URL('../src/app/layout.tsx', import.meta.url), 'utf8').replace(/'\s*\+\s*'/g, '');

test('layout metadata has no "forest to family" wording', () => {
  assert.doesNotMatch(src, /forest[- ]to[- ]family/i);
});

test('meta and og descriptions use Brand\'s text; twitter uses the short form', () => {
  const full = 'Solid hardwood nursery furniture, made to order and designed to grow with your child. Delivery costs extra, with Curbside and White Glove options.';
  assert.equal(src.split(full).length - 1, 2, 'meta description and og:description');
  assert.ok(src.includes("description: 'Solid hardwood nursery furniture, made to order and designed to grow with your child.',"), 'twitter:description');
});
