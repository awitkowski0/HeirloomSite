import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getBuilder } from '../src/lib/builders';
import { CatalogToolError, comparePieces, runCatalogTool } from '../src/lib/catalog-tools';
import { guardReply, parseTurns } from '../src/lib/shop-chat';

test('compare returns the builder statement verbatim and never invents one', () => {
  const [westLake, mission] = comparePieces(['west-lake-crib', 'mission']);
  assert.equal(westLake.safety_statement?.statement, getBuilder('old-town-oak').safety.crib?.text);
  assert.equal(westLake.safety_statement?.said_by, 'Old Town Oak');
  assert.equal(mission.safety_statement, null);
});

test('compare rejects bad input', () => {
  assert.throws(() => comparePieces(['mission']), CatalogToolError);
  assert.throws(() => comparePieces(['mission', 'not-a-product']), CatalogToolError);
});

test('search applies its filters', () => {
  const { pieces } = runCatalogTool('search_catalog', {
    type: 'Cribs',
    style: 'arched-panel',
    max_price_usd: null,
    max_lead_weeks: 8,
  });
  assert.ok(pieces.length > 0);
  for (const p of pieces) {
    assert.equal(p.type, 'Cribs');
    assert.equal(p.style, 'Arched Panel');
    assert.ok((p.lead_weeks_max ?? 99) <= 8);
  }
});

test('a chat reply making a claim in our voice is replaced', () => {
  for (const claim of ['This crib is CPSC certified.', 'It is the safest option.', 'Proudly American-made.']) {
    assert.notEqual(guardReply(claim), claim);
  }
  const fine = 'The West Lake Crib starts at $2,250 and takes about 6 to 8 weeks.';
  assert.equal(guardReply(fine), fine);
});

test('chat input is bounded', () => {
  assert.ok(parseTurns([{ role: 'user', content: 'Which crib is soonest?' }]));
  assert.equal(parseTurns([{ role: 'assistant', content: 'hi' }]), null);
  assert.equal(parseTurns([{ role: 'user', content: 'x'.repeat(601) }]), null);
  assert.equal(parseTurns(Array(13).fill({ role: 'user', content: 'x' })), null);
});
