import 'server-only';

import { Pool } from 'pg';
import { MAX_LOG_EVENTS, RETENTION_DAYS, isValidSlug, mergeEventLogs, parseInterestEvent, type InterestEvent } from './events';
import type { InterestCatalogItem } from './catalog';

/*
 * Server copy of a signed-in visitor's events. See db/schema.sql: the rows hold
 * a piece, a finish and a timestamp, and they go when the account does.
 */

export interface InterestDb {
  query: Pool['query'];
}

let pool: Pool | null = null;

export function interestDb(): InterestDb {
  pool ??= new Pool({ connectionString: process.env.DATABASE_URL });
  return pool;
}

/**
 * Re-validates a posted batch against the real catalogue.
 *
 * The browser's log is user-writable, so a slug or finish this site does not
 * sell is dropped here rather than stored. Everything else about an event was
 * already reduced to the closed schema by parseInterestEvent.
 */
export function cleanPostedEvents(
  raw: unknown,
  catalog: readonly InterestCatalogItem[],
  now: number,
): InterestEvent[] {
  if (!Array.isArray(raw)) return [];
  const bySlug = new Map(catalog.map(item => [item.slug, item]));
  const clean: InterestEvent[] = [];
  for (const entry of raw.slice(0, MAX_LOG_EVENTS)) {
    const event = parseInterestEvent(entry);
    const item = event && bySlug.get(event.slug);
    if (!event || !item) continue;
    if (event.finish && !item.finishes.includes(event.finish)) delete event.finish;
    if (event.otherSlug && !bySlug.has(event.otherSlug)) delete event.otherSlug;
    if (event.otherFinish) {
      const side = bySlug.get(event.otherSlug ?? event.slug);
      if (!side?.finishes.includes(event.otherFinish)) delete event.otherFinish;
    }
    clean.push(event);
  }
  return mergeEventLogs(clean, [], now);
}

interface EventRow {
  event_id: string;
  kind: string;
  slug: string;
  finish: string;
  other_slug: string;
  other_finish: string;
  remove_from: string;
  at: Date;
}

function toEvent(row: EventRow): InterestEvent | null {
  return parseInterestEvent({
    id: row.event_id,
    kind: row.kind,
    slug: row.slug,
    at: row.at.getTime(),
    ...(row.finish ? { finish: row.finish } : {}),
    ...(row.other_slug ? { otherSlug: row.other_slug } : {}),
    ...(row.other_finish ? { otherFinish: row.other_finish } : {}),
    ...(row.remove_from ? { from: row.remove_from } : {}),
  });
}

export async function readAccountEvents(db: InterestDb, userId: string): Promise<InterestEvent[]> {
  const { rows } = await db.query<EventRow>(
    `SELECT event_id, kind, slug, finish, other_slug, other_finish, remove_from, at
       FROM interest_event WHERE user_id = $1 ORDER BY at`,
    [userId],
  );
  return rows.flatMap(row => toEvent(row) ?? []);
}

export async function countAccountEvents(db: InterestDb, userId: string): Promise<number> {
  const { rows } = await db.query<{ count: number }>(
    'SELECT count(*)::int AS count FROM interest_event WHERE user_id = $1',
    [userId],
  );
  return rows[0].count;
}

/**
 * Merges events into an account and returns the union.
 *
 * Idempotent by event id: a double-tap or a retry adds nothing. Trimmed to the
 * same retention and size the device keeps, so the account never holds more
 * history than the visitor could see on their own screen.
 */
export async function mergeAccountEvents(
  db: InterestDb,
  userId: string,
  events: readonly InterestEvent[],
): Promise<InterestEvent[]> {
  if (events.length > 0) {
    await db.query(
      `INSERT INTO interest_event (user_id, event_id, kind, slug, finish, other_slug, other_finish, remove_from, at)
       SELECT $1::text, * FROM unnest($2::text[], $3::text[], $4::text[], $5::text[], $6::text[], $7::text[], $8::text[], $9::timestamptz[])
       ON CONFLICT (user_id, event_id) DO NOTHING`,
      [
        userId,
        events.map(e => e.id),
        events.map(e => e.kind),
        events.map(e => e.slug),
        events.map(e => e.finish ?? ''),
        events.map(e => e.otherSlug ?? ''),
        events.map(e => e.otherFinish ?? ''),
        events.map(e => e.from ?? ''),
        events.map(e => new Date(e.at).toISOString()),
      ],
    );
  }
  await db.query(
    `DELETE FROM interest_event WHERE user_id = $1 AND (
       at < now() - make_interval(days => $2)
       OR event_id NOT IN (SELECT event_id FROM interest_event WHERE user_id = $1 ORDER BY at DESC LIMIT $3)
     )`,
    [userId, RETENTION_DAYS, MAX_LOG_EVENTS],
  );
  return readAccountEvents(db, userId);
}

export async function deleteAccountEvents(db: InterestDb, userId: string): Promise<number> {
  const { rowCount } = await db.query('DELETE FROM interest_event WHERE user_id = $1', [userId]);
  return rowCount ?? 0;
}

export interface InterestAggregateRow {
  slug: string;
  kind: string;
  accounts: number;
  events: number;
}

/**
 * Owner-side counts: which pieces draw which kind of interest, across accounts.
 *
 * Never returns a user id. Any group smaller than `minAccounts` is dropped, so
 * a single shopper's activity cannot be read out of a small count. Only covers
 * visitors who chose to merge: on-device events never reach this table.
 */
export async function aggregateInterestCounts(db: InterestDb, minAccounts = 5): Promise<InterestAggregateRow[]> {
  const { rows } = await db.query<InterestAggregateRow>(
    `SELECT slug, kind, count(DISTINCT user_id)::int AS accounts, count(*)::int AS events
       FROM interest_event
      WHERE at > now() - make_interval(days => $2)
      GROUP BY slug, kind
     HAVING count(DISTINCT user_id) >= $1
      ORDER BY accounts DESC, slug, kind`,
    [minAccounts, RETENTION_DAYS],
  );
  return rows.filter(r => isValidSlug(r.slug));
}
