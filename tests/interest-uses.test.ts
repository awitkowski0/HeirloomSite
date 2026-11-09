import { test } from 'node:test';
import assert from 'node:assert/strict';
import { synthesizeProfile } from '../src/lib/interest/profile';
import { catalogPairs, chooseNextPair, explainSuggestion, rankSuggestions, tasteLine } from '../src/lib/interest/uses';
import type { InterestEvent } from '../src/lib/interest/events';
import { CATALOG, NOW, event } from './helpers/interest-fixture';

const profileOf = (events: InterestEvent[]) => synthesizeProfile(events, CATALOG, { now: NOW });

const STRONG: InterestEvent[] = [
  event('view', 'arched-a', 8),
  event('finish_chosen', 'arched-a', 8, { finish: 'Harvest' }),
  event('view', 'arched-b', 5),
  event('compare', 'arched-b', 5),
  event('this_or_that', 'arched-a', 3, { otherSlug: 'classic-a' }),
  event('save', 'arched-b', 2, { finish: 'Harvest' }),
  event('add_to_cart', 'arched-a', 1, { finish: 'Provincial' }),
  event('save', 'dresser-a', 1),
];

test('rank: no evidence means the catalogue order and no reasons', () => {
  const profile = profileOf([]);
  const ranked = rankSuggestions(profile, CATALOG);
  assert.deepEqual(ranked.map(r => r.item.slug), CATALOG.filter(c => c.listed).map(c => c.slug));
  assert.ok(ranked.every(r => r.reasons.length === 0));
});

test('rank: never suggests kits, removed, kept or de-listed pieces', () => {
  const profile = profileOf([...STRONG, event('remove', 'classic-b', 0.5)]);
  const slugs = rankSuggestions(profile, CATALOG).map(r => r.item.slug);
  assert.ok(!slugs.includes('rail-kit'), 'unlisted');
  assert.ok(!slugs.includes('arched-a'), 'in cart');
  assert.ok(!slugs.includes('arched-b'), 'saved');
  assert.ok(!slugs.includes('classic-b'), 'removed');
  const filtered = rankSuggestions(profile, CATALOG, { isAvailable: s => s !== 'panel-a', exclude: ['dresser-b'] }).map(r => r.item.slug);
  assert.ok(!filtered.includes('panel-a'));
  assert.ok(!filtered.includes('dresser-b'));
});

test('rank: favours the leading style and fills the empty slot in the room', () => {
  const ranked = rankSuggestions(profileOf(STRONG), CATALOG);
  assert.equal(ranked[0].item.slug, 'nightstand-a', 'the empty core slot outranks a second crib');
  const panelIdx = ranked.findIndex(r => r.item.slug === 'panel-a');
  const classicIdx = ranked.findIndex(r => r.item.slug === 'classic-a');
  assert.ok(ranked[panelIdx].score < ranked[0].score);
  assert.ok(classicIdx >= 0);
});

test('rank: once a crib and a dresser are held, the empty slot comes first', () => {
  const ranked = rankSuggestions(profileOf(STRONG), CATALOG);
  const firstHeldSlot = ranked.findIndex(r => r.item.pieceType === 'crib' || r.item.pieceType === 'dresser');
  const nightstand = ranked.findIndex(r => r.item.pieceType === 'nightstand');
  assert.ok(nightstand >= 0 && nightstand < firstHeldSlot, `nightstand at ${nightstand}, first held slot at ${firstHeldSlot}`);
});

test('rank: a piece for a held slot stays below open slots even at a perfect style match', () => {
  const catalog = [
    ...CATALOG.map(c => (c.pieceType === 'nightstand' ? { ...c, finishes: [] } : c)),
    { ...CATALOG[0], slug: 'arched-c' },
  ];
  const events = [
    event('view', 'arched-a', 6),
    event('finish_chosen', 'arched-a', 5, { finish: 'Harvest' }),
    event('save', 'arched-b', 3, { finish: 'Harvest' }),
    event('add_to_cart', 'arched-a', 1, { finish: 'Harvest' }),
  ];
  const ranked = rankSuggestions(synthesizeProfile(events, catalog, { now: NOW }), catalog);
  const slugs = ranked.map(r => r.item.slug);
  assert.ok(slugs.indexOf('nightstand-a') < slugs.indexOf('arched-c'), slugs.join(', '));
});

test('explain: states the real reason and only when confidence allows', () => {
  const profile = profileOf(STRONG);
  const nightstand = CATALOG.find(c => c.slug === 'nightstand-a')!;
  assert.match(explainSuggestion(profile, nightstand)!, /mid-tone finishes|nightstand/);
  const low = profileOf([event('view', 'arched-a', 0), event('view', 'arched-b', 0.001), event('view', 'classic-a', 0.002)]);
  assert.equal(explainSuggestion(low, nightstand), null);
});

test('taste line: null with nothing to say, hedged early, plain once earned', () => {
  assert.equal(tasteLine(profileOf([event('view', 'arched-a', 0)])), null);
  const early = tasteLine(profileOf([
    event('view', 'arched-a', 0),
    event('finish_chosen', 'arched-a', 0.001, { finish: 'Harvest' }),
    event('view', 'arched-b', 0.002),
  ]));
  assert.match(early?.text ?? '', /^Early days/);
  assert.deepEqual(tasteLine(profileOf(STRONG)), { label: 'Your taste so far', text: 'arched slats, mid-tone finishes' });
});

test('next pair: covers untried styles first, then never repeats an answered pair', () => {
  const profile = profileOf([event('view', 'arched-a', 0)]);
  const first = chooseNextPair(profile, CATALOG);
  assert.equal(first?.why, 'new-style');

  const answered = catalogPairs(CATALOG).map((p, i) => event('this_or_that', p.a, i * 0.1, { otherSlug: p.b, id: `pair-${String(i).padStart(4, '0')}` }));
  assert.equal(chooseNextPair(profileOf(answered), CATALOG), null);

  const oneLeft = answered.slice(1);
  const next = chooseNextPair(profileOf(oneLeft), CATALOG);
  assert.deepEqual([next?.pair.a, next?.pair.b], [catalogPairs(CATALOG)[0].a, catalogPairs(CATALOG)[0].b]);
});

test('next pair: is deterministic and accepts curated plates', () => {
  const plates = [
    { id: 'p1', a: 'classic-a', b: 'classic-b' },
    { id: 'p2', a: 'arched-a', b: 'panel-a' },
  ];
  const profile = profileOf(STRONG);
  assert.deepEqual(chooseNextPair(profile, CATALOG, plates), chooseNextPair(profile, CATALOG, plates));
  assert.equal(chooseNextPair(profile, CATALOG, plates)?.pair.id, 'p2');
});
