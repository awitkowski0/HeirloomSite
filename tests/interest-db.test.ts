import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import { aggregateInterestCounts, cleanPostedEvents, countAccountEvents, deleteAccountEvents, mergeAccountEvents, readAccountEvents } from '../src/lib/interest/db';
import type { InterestEvent } from '../src/lib/interest/events';
import { RETENTION_MS } from '../src/lib/interest/events';
import { CATALOG } from './helpers/interest-fixture';

/*
 * Needs a real Postgres with the schema applied, so it runs only when pointed
 * at one: INTEREST_TEST_DATABASE_URL=postgres://... npm test
 * Every row it makes belongs to a throwaway user and is removed afterwards.
 */
const url = process.env.INTEREST_TEST_DATABASE_URL;
const pool = url ? new Pool({ connectionString: url }) : null;
const skip = url ? false : 'set INTEREST_TEST_DATABASE_URL to run against Postgres';

async function testUser(): Promise<string> {
  const id = `test-${randomUUID()}`;
  await pool!.query(
    `INSERT INTO "user" (id, name, email, "emailVerified", "createdAt", "updatedAt") VALUES ($1, 'x', $2, false, now(), now())`,
    [id, `${id}@test.invalid`],
  );
  created.push(id);
  return id;
}

const created: string[] = [];

after(async () => {
  if (!pool) return;
  await pool.query('DELETE FROM "user" WHERE id = ANY($1)', [created]);
  await pool.end();
});

const now = Date.now();

const events = (user: string, n = 2): InterestEvent[] =>
  Array.from({ length: n }, (_, i) => ({
    id: `dbtest-${user.slice(5, 13)}-${i}`,
    kind: 'view' as const,
    slug: 'arched-a',
    at: now - 1000 * (i + 1),
  }));

test('merge is idempotent and returns the union', { skip }, async () => {
  const user = await testUser();
  const batch = events(user);
  const first = await mergeAccountEvents(pool!, user, batch);
  assert.equal(first.length, 2);
  const second = await mergeAccountEvents(pool!, user, batch);
  assert.equal(second.length, 2, 'retrying adds nothing');
  assert.equal(await countAccountEvents(pool!, user), 2);

  const third = await mergeAccountEvents(pool!, user, [{ id: 'dbtest-extra-001', kind: 'save', slug: 'dresser-a', at: now, finish: 'Harvest' }]);
  assert.equal(third.length, 3);
  assert.deepEqual(third.at(-1), { id: 'dbtest-extra-001', kind: 'save', slug: 'dresser-a', at: now, finish: 'Harvest' });
});

test('merge drops events beyond retention from the account', { skip }, async () => {
  const user = await testUser();
  await pool!.query(
    `INSERT INTO interest_event (user_id, event_id, kind, slug, at) VALUES ($1, 'stale-event-1', 'view', 'arched-a', now() - interval '400 days')`,
    [user],
  );
  const merged = await mergeAccountEvents(pool!, user, events(user, 1));
  assert.equal(merged.length, 1);
  assert.notEqual(merged[0].id, 'stale-event-1');
});

test('one visitor cannot read or delete another', { skip }, async () => {
  const a = await testUser();
  const b = await testUser();
  await mergeAccountEvents(pool!, a, events(a, 2));
  await mergeAccountEvents(pool!, b, events(b, 1));
  assert.equal((await readAccountEvents(pool!, a)).length, 2);
  await deleteAccountEvents(pool!, b);
  assert.equal((await readAccountEvents(pool!, a)).length, 2);
  assert.equal((await readAccountEvents(pool!, b)).length, 0);
});

test('deleting the account cascades to its events', { skip }, async () => {
  const user = await testUser();
  await mergeAccountEvents(pool!, user, events(user, 3));
  await pool!.query('DELETE FROM "user" WHERE id = $1', [user]);
  const { rows } = await pool!.query('SELECT count(*)::int AS n FROM interest_event WHERE user_id = $1', [user]);
  assert.equal(rows[0].n, 0);
});

test('aggregate suppresses small groups and exposes no user', { skip }, async () => {
  const slug = `aggregate-${randomUUID().slice(0, 8)}`;
  const users = await Promise.all(Array.from({ length: 5 }, testUser));
  for (const u of users.slice(0, 4)) {
    await mergeAccountEvents(pool!, u, [{ id: `agg-${u.slice(5, 13)}-a`, kind: 'view', slug, at: now }]);
  }
  const below = (await aggregateInterestCounts(pool!, 5)).filter(r => r.slug === slug);
  assert.deepEqual(below, [], 'four accounts is below the threshold');

  await mergeAccountEvents(pool!, users[4], [{ id: `agg-${users[4].slice(5, 13)}-a`, kind: 'view', slug, at: now }]);
  const rows = (await aggregateInterestCounts(pool!, 5)).filter(r => r.slug === slug);
  assert.equal(rows.length, 1);
  assert.deepEqual(Object.keys(rows[0]).sort(), ['accounts', 'events', 'kind', 'slug']);
  assert.equal(rows[0].accounts, 5);
});

test('a posted batch is reduced to real catalogue references', () => {
  const clean = cleanPostedEvents(
    [
      { id: 'posted-event-01', kind: 'view', slug: 'arched-a', at: now, finish: 'Harvest', email: 'x@y.z', dueDate: '2027' },
      { id: 'posted-event-02', kind: 'view', slug: 'not-a-product', at: now },
      { id: 'posted-event-03', kind: 'view', slug: 'arched-a', at: now, finish: 'Bogus Stain' },
      { id: 'posted-event-04', kind: 'view', slug: 'arched-a', at: now - RETENTION_MS - 1000 },
      'not even an object',
    ],
    CATALOG,
    now,
  );
  assert.equal(clean.length, 2);
  assert.deepEqual(Object.keys(clean.find(e => e.id === 'posted-event-01')!).sort(), ['at', 'finish', 'id', 'kind', 'slug']);
  assert.equal(clean.find(e => e.id === 'posted-event-03')!.finish, undefined);
});
