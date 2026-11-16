import test from 'node:test';
import assert from 'node:assert/strict';
import { createSearchEngine, type SearchDoc } from '@/lib/search-engine';
import { removeTagFromQuery } from '@/lib/search-intent';
import docs from '@/data/search-docs.json';
import builders from '@/data/builders.json';

const engine = createSearchEngine(docs as unknown as SearchDoc[], builders as { id: string; name: string }[]);
const run = (q: string) => engine.search(q);
const has = (q: string, ...keys: string[]) => {
  const out = run(q);
  for (const key of keys) assert.ok(out.tags.some(t => t.key === key), `"${q}" should understand ${key}, got ${out.tags.map(t => t.key)}`);
  return out;
};
const allUse = (products: { uses: string[] }[], use: string) => products.every(p => p.uses.includes(use));

test('use phrases find the pieces carrying that tag', () => {
  assert.ok(allUse(has('crib that turns into a full bed', 'use:CRIB', 'use:FULL BED').products, 'FULL BED'));
  assert.ok(allUse(has('converts to toddler bed', 'use:TODDLER BED').products, 'TODDLER BED'));
  const changing = has('dresser I can change a baby on', 'use:CHANGING TABLE', 'use:DRESSER').products;
  assert.ok(changing.length > 0 && allUse(changing, 'CHANGING TABLE'));
  assert.ok(allUse(has('changing table', 'use:CHANGING TABLE').products, 'CHANGING TABLE'));
});

test('style phrases match the crib style field', () => {
  const arched = has('arched slat crib', 'style:arched-slats').products;
  assert.ok(arched.length > 0 && arched.every(p => p.style === 'arched-slats'));
  const flat = has('flat top', 'top:flat').products;
  assert.ok(flat.length > 0 && flat.every(p => ['classic-slats', 'solid-panel'].includes(p.style ?? '')));
  const solid = has('solid panel', 'style:solid-panel').products;
  assert.ok(solid.length > 0 && solid.every(p => p.style === 'solid-panel'));
});

test('tone, stain, price, builder and collection', () => {
  assert.ok(has('dark crib', 'tone:dark', 'use:CRIB').products.length > 0);
  assert.ok(has('something pale', 'tone:light').products.length > 0);
  assert.ok(has('ebony', 'stain:Ebony').products.length > 0);
  assert.ok(has('Michaels Cherry crib', 'stain:Michaels Cherry', 'use:CRIB').products.length > 0);
  const cheap = has('under $2000', 'priceMax').products;
  assert.ok(cheap.length > 0 && cheap.every(p => p.price <= 2000));
  const fishers = has("Fisher's cribs", 'builder:fishers-quality-products', 'use:CRIB').products;
  assert.ok(fishers.length > 0 && fishers.every(p => p.builder === 'fishers-quality-products'));
  const night = has('Newport nightstand', 'collection:Newport', 'category:Nightstands').products;
  assert.deepEqual(night.map(p => p.slug), ['newport-nightstand']);
});

test('small nursery maps to MINI, which the catalogue supports', () => {
  assert.ok(allUse(has('small nursery', 'use:MINI').products, 'MINI'));
});

test('typos still land', () => {
  const out = has('dreser', 'use:DRESSER');
  assert.ok(out.products.length > 0 && allUse(out.products, 'DRESSER'));
});

test('an unknown word is named and still shows the closest results', () => {
  const out = run('xyzzy crib');
  assert.deepEqual(out.unknown, ['xyzzy']);
  assert.ok(out.products.length > 0);
});

test('never a dead end, even for nonsense or conflicting tags', () => {
  assert.ok(run('zzzzzzz').products.length > 0);
  const out = run('ebony hutch under $5');
  assert.ok(out.products.length > 0);
  assert.ok(out.relaxed.length > 0, 'an impossible combination relaxes the last tag and says so');
});

test('a bassinet is named back, and never becomes a tag', () => {
  const out = run('bassinet');
  assert.deepEqual(out.refused, ['bassinet']);
  assert.equal(out.tags.some(t => /bassinet/i.test(t.label)), false);
  assert.ok(out.products.length > 0, 'still shows something');
});

test('safety and certification words are ignored without a note', () => {
  for (const q of ['non-toxic crib', 'non toxic crib', 'safe crib', 'safety', 'organic dresser', 'certified crib', 'greenguard', 'jpma crib', 'cpsc', 'lead free crib', 'formaldehyde', 'toxic']) {
    const out = run(q);
    assert.deepEqual(out.refused, [], q);
    assert.deepEqual(out.unknown, [], q);
    assert.ok(out.products.length > 0, q);
    assert.equal(out.tags.some(t => /safe|toxic|organic|certif/i.test(t.label)), false, q);
  }
  assert.equal(run('non-toxic crib').tags.map(t => t.key).join(), 'use:CRIB');
});

test('prices come from the catalogue rows', () => {
  const docsByName = new Map((docs as unknown as SearchDoc[]).map(d => [d.productName, d]));
  for (const p of engine.listed) {
    const rows = (docs as unknown as SearchDoc[]).filter(d => d.productName === p.name);
    assert.equal(p.price, Math.min(...rows.map(r => r.basePrice)), p.name);
    assert.ok(docsByName.has(p.name));
  }
});

test('removing a chip removes its words from the query', () => {
  const out = run('dark crib under $2000');
  const tag = out.tags.find(t => t.kind === 'tone');
  assert.ok(tag);
  assert.equal(removeTagFromQuery('dark crib under $2000', tag), 'crib under $2000');
});

test('suggestions carry a photo and a price', () => {
  const out = run('crib');
  assert.ok(out.suggestions.length > 0);
  for (const s of out.suggestions) {
    assert.ok(s.image);
    assert.ok(s.price > 0);
    assert.ok(s.count > 0 && s.count < out.total);
  }
});
