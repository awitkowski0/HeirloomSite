import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nurseryProgress } from '../src/lib/interest/catalog';
import { MAX_LOG_EVENTS, MAX_QUEUED_EVENTS, parseInterestEvent, RETENTION_MS } from '../src/lib/interest/events';
import { createInterestAccount } from '../src/lib/interest/account';
import { createInterestStore, parseStoredInterest, type InterestStoreDeps } from '../src/lib/interest/store';
import type { ConsentStatus } from '../src/lib/consent';
import { CATALOG, NOW } from './helpers/interest-fixture';

function harness(initial: ConsentStatus = 'unknown', stored: string | null = null) {
  let raw = stored;
  let consent = initial;
  let time = NOW;
  let id = 0;
  let writes = 0;
  const consentListeners = new Set<() => void>();
  const deps: InterestStoreDeps = {
    read: () => raw,
    write: value => {
      writes += 1;
      raw = value;
    },
    remove: () => {
      raw = null;
    },
    consent: () => consent,
    subscribeConsent: onChange => {
      consentListeners.add(onChange);
      return () => consentListeners.delete(onChange);
    },
    subscribeExternal: () => () => {},
    notify: () => {},
    now: () => time,
    newId: () => `test-id-${String(++id).padStart(4, '0')}`,
  };
  const store = createInterestStore(deps);
  return {
    store,
    get raw() {
      return raw;
    },
    get writes() {
      return writes;
    },
    setConsent(next: ConsentStatus) {
      consent = next;
      for (const listener of consentListeners) listener();
    },
    advance(ms: number) {
      time += ms;
    },
  };
}

test('consent unknown: holds events in memory and writes nothing to the device', () => {
  const h = harness('unknown');
  h.store.record({ kind: 'view', slug: 'arched-a' });
  h.store.record({ kind: 'save', slug: 'arched-a' });
  assert.equal(h.raw, null);
  assert.equal(h.writes, 0);
  assert.equal(h.store.getState().status, 'waiting');
  assert.equal(h.store.getState().events.length, 0);
});

test('consent granted: flushes the queue with its original timestamps', () => {
  const h = harness('pending');
  h.store.record({ kind: 'view', slug: 'arched-a' });
  h.advance(60_000);
  h.setConsent('granted');
  const events = h.store.getState().events;
  assert.equal(events.length, 1);
  assert.equal(events[0].at, NOW);
  assert.equal(h.store.getState().status, 'learning');
});

test('consent denied: drops the queue and erases anything already stored', () => {
  const h = harness('granted');
  h.store.record({ kind: 'view', slug: 'arched-a' });
  assert.ok(h.raw);
  h.store.record({ kind: 'save', slug: 'arched-b' });
  h.setConsent('denied');
  assert.equal(h.raw, null, 'the stored log is erased on withdrawal');
  h.store.record({ kind: 'add_to_cart', slug: 'arched-a' });
  h.store.record({ kind: 'view', slug: 'arched-b' });
  assert.equal(h.raw, null, 'nothing is recorded after refusal, not even explicit acts');
  assert.equal(h.store.getState().status, 'declined');
  h.setConsent('granted');
  assert.equal(h.store.getState().events.length, 0, 'what happened during refusal is not replayed on a later yes');
});

test('consent denied: explicit acts still power the cart with no log', () => {
  // The cart is its own store. nurseryProgress works from its contents alone.
  const h = harness('denied');
  h.store.record({ kind: 'add_to_cart', slug: 'arched-a' });
  assert.equal(h.raw, null);
  assert.equal(nurseryProgress(['arched-a'], CATALOG).filled, 1);
});

test('a stale log is reconciled the first time the store is used after a refusal', () => {
  const stale = JSON.stringify({ v: 1, events: [{ id: 'evt-00000001', kind: 'view', slug: 'arched-a', at: NOW }] });
  const h = harness('denied', stale);
  h.store.subscribe(() => {});
  assert.equal(h.raw, null);
});

test('reopening the banner holds the log without erasing or adding to it', () => {
  const h = harness('granted');
  h.store.record({ kind: 'view', slug: 'arched-a' });
  const before = h.raw;
  h.setConsent('pending');
  h.store.record({ kind: 'view', slug: 'arched-b' });
  assert.equal(h.raw, before);
  assert.equal(h.store.getState().events.length, 0, 'not personalized while unanswered');
  h.setConsent('granted');
  assert.equal(h.store.getState().events.length, 2);
});

test('the memory queue is bounded', () => {
  const h = harness('pending');
  for (let i = 0; i < MAX_QUEUED_EVENTS + 20; i += 1) h.store.record({ kind: 'view', slug: 'arched-a' });
  h.setConsent('granted');
  assert.equal(h.store.getState().events.length, MAX_QUEUED_EVENTS);
});

test('clear: one call removes everything and leaves nothing on the device', () => {
  const h = harness('granted');
  h.store.record({ kind: 'view', slug: 'arched-a' });
  h.store.clear();
  assert.equal(h.raw, null);
  assert.equal(h.store.getState().events.length, 0);
});

test('off switch: stops learning, erases, survives reloads, and can be undone', () => {
  const h = harness('granted');
  h.store.record({ kind: 'view', slug: 'arched-a' });
  h.store.setLearning(false);
  assert.deepEqual(JSON.parse(h.raw as string), { v: 1, off: true, events: [] });
  h.store.record({ kind: 'save', slug: 'arched-b' });
  assert.equal(h.store.getState().status, 'off');
  assert.equal(h.store.getState().events.length, 0);
  h.setConsent('pending');
  h.store.record({ kind: 'view', slug: 'arched-b' });
  h.setConsent('granted');
  assert.equal(h.store.getState().status, 'off', 'off beats a fresh grant');

  h.store.setLearning(true);
  assert.equal(h.raw, null);
  h.store.record({ kind: 'view', slug: 'arched-a' });
  assert.equal(h.store.getState().events.length, 1);
});

test('the snapshot is referentially stable between changes', () => {
  const h = harness('granted');
  h.store.record({ kind: 'view', slug: 'arched-a' });
  const a = h.store.getState();
  assert.equal(h.store.getState(), a);
  h.store.record({ kind: 'view', slug: 'arched-b' });
  assert.notEqual(h.store.getState(), a);
});

test('server snapshot: nothing personal in prerendered HTML', () => {
  const h = harness('granted');
  h.store.record({ kind: 'view', slug: 'arched-a' });
  assert.deepEqual(h.store.getServerState(), { status: 'waiting', events: [], readAt: 0 });
});

test('stored logs are untrusted: tampered records and unknown fields are dropped', () => {
  assert.deepEqual(parseStoredInterest('{not json', NOW), { off: false, events: [] });
  assert.deepEqual(parseStoredInterest('"5"', NOW), { off: false, events: [] });
  assert.deepEqual(parseStoredInterest(JSON.stringify({ v: 2, events: [] }), NOW), { off: false, events: [] });
  const parsed = parseStoredInterest(
    JSON.stringify({
      v: 1,
      events: [
        { id: 'evt-00000001', kind: 'view', slug: 'arched-a', at: NOW, dueDate: '2027-01-01', pregnant: true, gender: 'x', email: 'a@b.c', note: 'free text' },
        { id: 'evt-00000002', kind: 'nope', slug: 'arched-a', at: NOW },
        { id: 'evt-00000003', kind: 'view', slug: 'Bad Slug!', at: NOW },
        { id: 'evt-00000004', kind: 'view', slug: 'arched-a', at: NOW - RETENTION_MS - 1000 },
      ],
    }),
    NOW,
  );
  assert.equal(parsed.events.length, 1);
  assert.deepEqual(Object.keys(parsed.events[0]).sort(), ['at', 'id', 'kind', 'slug']);
});

test('the log is capped at the retention limits', () => {
  const h = harness('granted');
  for (let i = 0; i < MAX_LOG_EVENTS + 25; i += 1) {
    h.advance(1000);
    h.store.record({ kind: 'view', slug: 'arched-a' });
  }
  assert.equal(h.store.getState().events.length, MAX_LOG_EVENTS);
});

test('a free-text finish is rejected at the door', () => {
  assert.equal(parseInterestEvent({ id: 'evt-00000001', kind: 'view', slug: 'a', at: 1, finish: '<script>' })?.finish, undefined);
});

test('account merge: only to our own endpoint, only while learning', async () => {
  const h = harness('granted');
  h.store.record({ kind: 'view', slug: 'arched-a' });
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const account = createInterestAccount(h.store, (async (url: string, init?: RequestInit) => {
    calls.push({ url, init });
    return new Response(JSON.stringify({ events: [{ id: 'server-evt-1', kind: 'save', slug: 'dresser-a', at: NOW }] }), { status: 200 });
  }) as unknown as typeof fetch);

  assert.equal(await account.merge(), true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, '/api/interest');
  assert.equal(calls[0].init?.method, 'POST');
  assert.equal(h.store.getState().events.length, 2, 'the account log comes back and is kept');

  h.store.setLearning(false);
  assert.equal(await account.merge(), false);
  assert.equal(calls.length, 1, 'no request when learning is off');
});

test('forget everywhere: clears locally and deletes the account copy only if signed in', async () => {
  const h = harness('granted');
  h.store.record({ kind: 'view', slug: 'arched-a' });
  const calls: string[] = [];
  const account = createInterestAccount(h.store, (async (_url: string, init?: RequestInit) => {
    calls.push(init?.method ?? 'GET');
    return new Response('{}', { status: 200 });
  }) as unknown as typeof fetch);

  await account.forgetEverywhere(false);
  assert.equal(h.raw, null);
  assert.deepEqual(calls, []);
  h.store.record({ kind: 'view', slug: 'arched-a' });
  await account.forgetEverywhere(true);
  assert.equal(h.raw, null);
  assert.deepEqual(calls, ['DELETE']);
});
