import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { finishFamily, NON_FINISH_NAMES, nurseryProgress, type InterestCatalogItem } from '../src/lib/interest/catalog';
import { BURST_PASSIVE_CAP, SIGNALS, type InterestEvent, type InterestEventDraft } from '../src/lib/interest/events';
import { summaryFacts, synthesizeProfile, type SummaryFacts } from '../src/lib/interest/profile';
import { CATALOG, NOW, event } from './helpers/interest-fixture';

function run(events: InterestEvent[], now = NOW, catalog: InterestCatalogItem[] = CATALOG) {
  return synthesizeProfile(events, catalog, { now });
}

function net(events: InterestEvent[], slug: string, now = NOW): number {
  return run(events, now).pieces[slug]?.net ?? 0;
}

test('every finish in the catalogue has a family', () => {
  const inventory = JSON.parse(readFileSync('public/data/inventory.json', 'utf8')) as Array<{
    wood: string;
    variantType: string;
    stains?: { name: string }[];
  }>;
  const names = new Set<string>();
  for (const row of inventory) {
    if (row.variantType === 'finish') names.add(row.wood);
    for (const s of row.stains ?? []) names.add(s.name);
  }
  const missing = [...names].filter(n => !NON_FINISH_NAMES.includes(n.toLowerCase()) && finishFamily(n) === null);
  assert.deepEqual(missing, []);
  assert.equal(finishFamily('Natural'), 'light');
  assert.equal(finishFamily('Harvest'), 'mid');
  assert.equal(finishFamily('Ebony'), 'dark');
  assert.equal(finishFamily('Pomona Red'), null);
});

test('decay: a signal is worth half after one half-life', () => {
  const fresh = net([event('view', 'arched-a', 0)], 'arched-a');
  const halfLifeAgo = net([event('view', 'arched-a', SIGNALS.view.halfLifeDays)], 'arched-a');
  assert.ok(Math.abs(halfLifeAgo - fresh / 2) < 0.0001);
  assert.ok(net([event('add_to_cart', 'arched-a', 90)], 'arched-a') < SIGNALS.add_to_cart.weight / 2);
});

test('decay: recent evidence outranks an old burst', () => {
  const events = [
    event('add_to_cart', 'classic-a', 200),
    event('add_to_cart', 'classic-b', 190),
    event('save', 'arched-a', 1),
    event('save', 'arched-b', 2),
  ];
  const profile = run(events);
  assert.equal(profile.styles[0]?.id, 'arched-slats');
});

test('dedupe: reloading a page in a burst counts once', () => {
  const events = Array.from({ length: 20 }, (_, i) => event('view', 'arched-a', 0, { at: NOW - i * 60_000, id: `id-${i}xxx` }));
  assert.ok(Math.abs(net(events, 'arched-a') - 1) < 0.01);
  const profile = run(events);
  assert.equal(profile.activity.events, 1);
  assert.equal(profile.activity.byKind.view, 20);
});

test('caps: repeat visits to one piece stop adding evidence', () => {
  const events = Array.from({ length: 12 }, (_, i) => event('view', 'arched-a', i * 2));
  assert.ok(net(events, 'arched-a') <= SIGNALS.view.perPieceCap + 1e-9);
});

test('caps: a burst of passive clicks across many pieces is bounded', () => {
  const slugs = ['arched-a', 'arched-b', 'classic-a', 'classic-b', 'panel-a', 'dresser-a', 'dresser-b', 'nightstand-a', 'crib-mini'];
  const events = slugs.flatMap((slug, n) => [
    event('view', slug, 0, { at: NOW - n * 1000 }),
    event('compare', slug, 0, { at: NOW - n * 1000 - 100 }),
  ]);
  const mass = Object.values(run(events).pieces).reduce((sum, p) => sum + Math.max(0, p.net), 0);
  assert.ok(mass <= BURST_PASSIVE_CAP + 1e-9, `mass was ${mass}`);
});

test('negative signals: a removal cancels the add it reverses and counts against the piece', () => {
  const added = [event('add_to_cart', 'arched-a', 1)];
  const reversed = [...added, event('remove', 'arched-a', 0.5, { from: 'cart' })];
  assert.ok(net(reversed, 'arched-a') < 0);
  assert.equal(run(reversed).pieces['arched-a'].inCart, false);
  assert.equal(run(reversed).pieces['arched-a'].removed, true);
  // Add back later: the later add counts.
  const readded = [...reversed, event('add_to_cart', 'arched-a', 0)];
  assert.ok(net(readded, 'arched-a') > 0);
  assert.equal(run(readded).pieces['arched-a'].inCart, true);
});

test('negative signals: removing from the cart leaves a saved piece saved', () => {
  const events = [
    event('save', 'arched-a', 2),
    event('add_to_cart', 'arched-a', 1),
    event('remove', 'arched-a', 0.5, { from: 'cart' }),
  ];
  const piece = run(events).pieces['arched-a'];
  assert.equal(piece.saved, true);
  assert.equal(piece.inCart, false);
});

test('negative signals: the rejected side is weak evidence, not a verdict', () => {
  const events = [event('this_or_that', 'arched-a', 0, { otherSlug: 'classic-a' })];
  assert.ok(net(events, 'arched-a') > 0);
  const loser = net(events, 'classic-a');
  assert.ok(loser < 0 && loser > -1.5, `loser was ${loser}`);
  // One lost pairing does not overturn a saved piece of that style.
  assert.ok(net([...events, event('save', 'classic-a', 3)], 'classic-a') > 3);
});

test('negative signals: one lost pairing does not set a style aside, a removal does', () => {
  const pairing = run([event('this_or_that', 'arched-a', 0, { otherSlug: 'classic-a' })]);
  assert.deepEqual(pairing.setAside, []);
  const removed = run([event('remove', 'classic-a', 0)]);
  assert.deepEqual(removed.setAside, ['Classic Slats']);
});

test('this or that between two finishes of one piece touches finishes only', () => {
  const events = [
    event('this_or_that', 'arched-a', 0, { otherSlug: 'arched-a', finish: 'Harvest', otherFinish: 'Natural' }),
    event('finish_chosen', 'arched-b', 1, { finish: 'Natural' }),
  ];
  const profile = run(events);
  assert.equal(profile.pieces['arched-a'].net, SIGNALS.this_or_that.weight);
  const natural = profile.finishFamilies.find(f => f.id === 'light');
  assert.ok(natural && natural.score < 2.5 * 0.97, 'the rejected finish takes weak evidence off its family');
});

test('confidence: one or two clicks say nothing', () => {
  const profile = run([event('view', 'arched-a', 0), event('view', 'arched-b', 0)]);
  assert.equal(profile.confidence.level, 'none');
  assert.equal(profile.leadingStyle, null);
  assert.match(profile.summary.text, /Not much to go on/);
  assert.equal(profile.priceRange, null);
});

test('confidence: a handful of clicks in one sitting is hedged, never a pattern', () => {
  const events = [event('view', 'arched-a', 0), event('view', 'arched-b', 0.001), event('view', 'panel-a', 0.002)];
  const profile = run(events);
  assert.equal(profile.confidence.level, 'low');
  assert.doesNotMatch(profile.summary.text, /keep coming back/i);
  assert.doesNotMatch(profile.summary.text, /leaning/i);
  assert.equal(profile.builderLean, null);
});

const STRONG: InterestEvent[] = [
  event('view', 'arched-a', 6),
  event('finish_chosen', 'arched-a', 6, { finish: 'Harvest' }),
  event('view', 'arched-b', 5),
  event('compare', 'arched-b', 5),
  event('finish_chosen', 'arched-b', 3, { finish: 'Provincial' }),
  event('this_or_that', 'arched-a', 3, { otherSlug: 'classic-a' }),
  event('view', 'arched-a', 2),
  event('save', 'arched-b', 2, { finish: 'Harvest' }),
  event('add_to_cart', 'arched-a', 1, { finish: 'Harvest' }),
  event('view', 'dresser-a', 1),
  event('save', 'dresser-a', 1),
];

test('confidence: repeat, varied, kept evidence earns a real statement', () => {
  const profile = run(STRONG);
  assert.equal(profile.confidence.level, 'high');
  assert.equal(profile.leadingStyle?.id, 'arched-slats');
  assert.equal(profile.leadingFinishFamily?.id, 'mid');
  assert.equal(profile.leadingPieceType?.id, 'crib');
  assert.match(profile.summary.text, /^You keep coming back to arched slats in mid-tone finishes\./);
});

test('price range: within the leading kind of piece, rounded outward', () => {
  const profile = run(STRONG);
  assert.deepEqual(profile.priceRange, { low: 1800, high: 2000, basis: 'cribs', pieces: 2 });
});

test('builder lean is judged against the catalogue, not just the other makers', () => {
  // Fixture: 8 of 11 pieces are Old Town Oak, so looking at those is no lean.
  const proportional = run([
    event('view', 'arched-a', 6),
    event('save', 'arched-b', 5),
    event('add_to_cart', 'dresser-a', 2),
    event('save', 'nightstand-a', 1),
    event('view', 'classic-b', 3),
  ]);
  assert.ok(proportional.confidence.level !== 'none');
  assert.equal(proportional.builderLean, null);

  const lean = run([
    event('save', 'classic-a', 6),
    event('add_to_cart', 'classic-a', 5),
    event('view', 'classic-b', 4),
    event('save', 'classic-b', 2),
    event('view', 'crib-mini', 2),
    event('add_to_cart', 'crib-mini', 1),
  ]);
  assert.equal(lean.builderLean?.id, 'fishers');
});

test('nursery: counts only what was kept, and core slots', () => {
  const profile = run(STRONG);
  assert.equal(profile.nursery.filled, 2);
  assert.equal(profile.nursery.total, 3);
  assert.deepEqual(profile.nursery.missing, ['nightstand']);
  // A view alone is "considering", not filled.
  const viewed = run([event('view', 'dresser-a', 0), event('view', 'dresser-b', 1), event('view', 'nightstand-a', 2)]);
  assert.equal(viewed.nursery.filled, 0);
  assert.equal(viewed.nursery.slots.find(s => s.id === 'storage')?.state, 'considering');
});

test('nurseryProgress works from a bare cart, with no profile at all', () => {
  const progress = nurseryProgress(['arched-a', 'nightstand-a'], CATALOG);
  assert.equal(progress.filled, 2);
  assert.deepEqual(progress.missing, ['dresser or chest']);
});

test('input is treated as untrusted catalogue references', () => {
  const profile = run([
    event('save', 'gone-from-catalog', 0),
    event('finish_chosen', 'arched-a', 0, { finish: 'Not A Real Finish' }),
    event('view', 'arched-a', 0),
  ]);
  assert.equal(profile.pieces['gone-from-catalog'], undefined);
  assert.equal(profile.finishFamilies.length, 0);
  assert.equal(profile.confidence.level, 'none');
});

test('synthesis is pure: order of events does not matter', () => {
  const a = run(STRONG);
  const b = run([...STRONG].reverse());
  assert.deepEqual(a, b);
});

test('summary seam: a custom writer sees only aggregate labels', () => {
  let seen: SummaryFacts | null = null;
  const profile = synthesizeProfile(STRONG, CATALOG, {
    now: NOW,
    writer: facts => {
      seen = facts;
      return 'custom';
    },
  });
  assert.equal(profile.summary.text, 'custom');
  assert.equal(profile.summary.source, 'custom');
  assert.deepEqual(seen, summaryFacts(run(STRONG)));
  const serialized = JSON.stringify(seen);
  assert.doesNotMatch(serialized, /arched-a|dresser-a|"at"|"id"/);
});

test('generated copy never touches pregnancy, family, gender or health', () => {
  const sets: InterestEventDraft[][] = [
    [],
    [{ kind: 'view', slug: 'arched-a' }],
    [{ kind: 'save', slug: 'crib-mini' }, { kind: 'add_to_cart', slug: 'nightstand-a' }, { kind: 'view', slug: 'dresser-a' }],
  ];
  const profiles = [
    run(STRONG),
    ...sets.map(drafts => run(drafts.map((d, i) => event(d.kind, d.slug, i)))),
  ];
  const banned = /pregnan|expect|due date|baby|newborn|gender|\bboy|\bgirl|\bmom\b|\bmother|\bdad\b|family|health|trimester/i;
  for (const profile of profiles) {
    assert.doesNotMatch(profile.summary.text, banned);
    assert.doesNotMatch(profile.confidence.reason, banned);
  }
});
