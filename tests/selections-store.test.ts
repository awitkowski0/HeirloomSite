import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseSelections } from '../src/context/selectionsParse';

const raw = (value: unknown) => JSON.stringify(value);

test('entries saved before newer fields existed are repaired, not fatal', () => {
  const state = parseSelections(raw({ items: [{ slug: 'mission', name: 'Mission', price: 2000 }], compare: ['mission'] }));
  assert.equal(state.items.length, 1);
  assert.deepEqual(state.items[0].uses, []);
  assert.deepEqual(state.items[0].finishImages, []);
  assert.deepEqual(state.items[0].safetyFeatures, []);
  assert.deepEqual(state.items[0].buildFeatures, []);
});

test('unusable entries are dropped along with their compare slots', () => {
  const state = parseSelections(raw({ items: [null, 7, { name: 'no slug' }, { slug: 'ok', name: 'Ok', price: 1 }], compare: ['gone', 'ok', 3] }));
  assert.deepEqual(state.items.map(i => i.slug), ['ok']);
  assert.deepEqual(state.compare, ['ok']);
});

test('malformed storage falls back to empty', () => {
  for (const bad of [null, '', '{', '[]', raw({ items: 'x' })]) {
    assert.deepEqual(parseSelections(bad).items, []);
  }
});
