import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EMPTY_SELECTIONS, MAX_COMPARE, parseSelections } from '../src/context/selectionsParse';
import { buildLook, finishFor, PICK_CRIBS } from '../src/lib/pick-run';
import type { ShopItem } from '../src/lib/shop';

test('parseSelections survives junk without throwing', () => {
  for (const raw of [null, '', 'not json', '5', '[]', '{"compare":"x"}', '{"run":{"at":-3,"picks":{"top":"z"}}}']) {
    const s = parseSelections(raw);
    assert.ok(Array.isArray(s.compare));
    assert.equal(typeof s.finishes, 'object');
    assert.ok(s.run.at >= 0);
  }
  assert.deepEqual(parseSelections(null), EMPTY_SELECTIONS);
});

test('parseSelections keeps well-formed state, dedupes and caps compare', () => {
  const s = parseSelections(
    JSON.stringify({ compare: ['a', 'a', 'b', 'c', 'd'], finishes: { a: 'Natural', b: 5 }, run: { picks: { top: 'a', x: 'nope' }, at: 2 } }),
  );
  assert.deepEqual(s.compare, ['a', 'b', 'c'].slice(0, MAX_COMPARE));
  assert.deepEqual(s.finishes, { a: 'Natural' });
  assert.deepEqual(s.run, { picks: { top: 'a' }, at: 2 });
});

const crib = (slug: string, finishes: string[], category = 'Cribs', minPrice = 2000): ShopItem => ({
  slug,
  productName: slug,
  category,
  minPrice,
  defaultImage: `/${slug}.jpg`,
  priceVaries: false,
  builder: null,
  leadTime: null,
  converts: null,
  dimensions: null,
  finishes: finishes.map(name => ({
    name,
    image: `/${slug}-${name}.jpg`,
    tone: /slate|ebony|carbon/i.test(name) ? 'dark' : 'light',
    wood: 'Brown Maple',
    stainName: name,
  })),
});

test('finishFor prefers the exact stain, then the same tone', () => {
  const item = crib('mission', ['Natural', 'Antique Slate']);
  assert.deepEqual(finishFor(item, 'Antique Slate'), { finish: 'Antique Slate', exact: true });
  assert.deepEqual(finishFor(item, 'Ebony'), { finish: 'Antique Slate', exact: false });
  assert.deepEqual(finishFor(item, undefined), { finish: 'Natural', exact: true });
});

test('buildLook narrows to tagged cribs matching the picks', () => {
  const items = Object.keys(PICK_CRIBS).map(slug =>
    crib(slug, ['Natural'], slug.startsWith('mini') ? 'Mini Cribs' : 'Cribs'),
  );
  const look = buildLook({ top: 'a', front: 'b' }, items);
  assert.ok(look.cribs.length > 0);
  for (const c of look.cribs) {
    assert.equal(PICK_CRIBS[c.item.slug].top, 'arched');
    assert.equal(PICK_CRIBS[c.item.slug].front, 'panel');
  }
});
