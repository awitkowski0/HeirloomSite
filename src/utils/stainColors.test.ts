import { test } from 'node:test';
import assert from 'node:assert';
import { getStainColor } from './stainColors.ts';

test('getStainColor returns correct color for exact matches', () => {
  assert.strictEqual(getStainColor('natural'), '#DEB887');
  assert.strictEqual(getStainColor('slate'), '#5A6064');
});

test('getStainColor is case-insensitive', () => {
  assert.strictEqual(getStainColor('Natural'), '#DEB887');
  assert.strictEqual(getStainColor('SLATE'), '#5A6064');
});

test('getStainColor handles partial matches', () => {
  assert.strictEqual(getStainColor('The Natural Finish'), '#DEB887');
});

test('getStainColor returns fallback for unknown colors', () => {
  assert.strictEqual(getStainColor('unknown-color'), '#8B4513');
  assert.strictEqual(getStainColor('random string'), '#8B4513');
  assert.strictEqual(getStainColor(''), '#8B4513');
});
