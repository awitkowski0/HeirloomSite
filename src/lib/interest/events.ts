/*
 * The shopper interest profile: what a visitor did, as data.
 *
 * Runs on both sides of the wire. The browser appends to a log of these on the
 * device; the account route re-validates the same shapes before they reach the
 * database, so this file is the one definition of "a valid event".
 *
 * THE SCHEMA IS CLOSED, and that is the privacy design rather than an accident.
 * An event names a catalogue piece and a finish, and nothing else. There is no
 * field for free text, a device id, a visitor id, a date the shopper gave us or
 * anything about them, so no call site can quietly start collecting one:
 * parseInterestEvent() rebuilds each event from the known fields and drops the
 * rest. Never add a due date, pregnancy, health, family status or gender field
 * here. Baby-product browsing already implies enough.
 */

export const INTEREST_KINDS = [
  'view',
  'compare',
  'this_or_that',
  'finish_chosen',
  'save',
  'add_to_cart',
  'babylist',
  'remove',
] as const;

export type InterestKind = (typeof INTEREST_KINDS)[number];

/**
 * passive: a browsing signal, which is personalization and follows consent.
 * explicit: a deliberate act on a piece.
 *
 * Both are recorded only when consent is granted (see store.ts). The cart and
 * the saved list are separate stores that work regardless, and
 * nurseryProgress() can read them directly with no consent and no storage.
 */
export type SignalTier = 'passive' | 'explicit';

export interface SignalConfig {
  /** Evidence added per occurrence. Negative is evidence against. */
  weight: number;
  halfLifeDays: number;
  tier: SignalTier;
  /** Ceiling on this kind's positive evidence for one piece, after decay. */
  perPieceCap: number;
}

export const SIGNALS: Record<InterestKind, SignalConfig> = {
  view: { weight: 1, halfLifeDays: 14, tier: 'passive', perPieceCap: 3 },
  compare: { weight: 2, halfLifeDays: 14, tier: 'passive', perPieceCap: 4 },
  this_or_that: { weight: 3, halfLifeDays: 21, tier: 'passive', perPieceCap: 6 },
  finish_chosen: { weight: 2.5, halfLifeDays: 21, tier: 'passive', perPieceCap: 5 },
  save: { weight: 6, halfLifeDays: 45, tier: 'explicit', perPieceCap: 6 },
  add_to_cart: { weight: 9, halfLifeDays: 45, tier: 'explicit', perPieceCap: 9 },
  babylist: { weight: 8, halfLifeDays: 45, tier: 'explicit', perPieceCap: 8 },
  remove: { weight: -4, halfLifeDays: 30, tier: 'explicit', perPieceCap: 0 },
};

/** The side a shopper did not pick. Weak on purpose: losing one pairing says little. */
export const REJECTED_SIDE_WEIGHT = -0.75;
/** The floor on one piece's negative evidence. A few removals should not bury it. */
export const NEGATIVE_PIECE_FLOOR = -6;
/** The ceiling on one piece's positive evidence across every kind. */
export const PIECE_TOTAL_CAP = 14;
/** The same act on the same piece within this window counts once. */
export const DEDUPE_MS = 30 * 60 * 1000;
/** Passive evidence allowed from one hour, however many pieces it touched. */
export const BURST_WINDOW_MS = 60 * 60 * 1000;
export const BURST_PASSIVE_CAP = 8;

export const RETENTION_DAYS = 180;
export const RETENTION_MS = RETENTION_DAYS * 24 * 60 * 60 * 1000;
export const MAX_LOG_EVENTS = 400;
/** Events we hold in memory while consent is unanswered. */
export const MAX_QUEUED_EVENTS = 50;

export type RemoveFrom = 'cart' | 'saved';

/** What a storefront call site passes. id and at are added by the store. */
export interface InterestEventDraft {
  kind: InterestKind;
  slug: string;
  /** The finish shown or chosen, by its catalogue name. */
  finish?: string;
  /** this_or_that only: the side that was not picked. */
  otherSlug?: string;
  /** this_or_that only: the finish on the side that was not picked. */
  otherFinish?: string;
  /** remove only: which list it came off. Omitted means both. */
  from?: RemoveFrom;
}

export interface InterestEvent extends InterestEventDraft {
  id: string;
  at: number;
}

const SLUG = /^[a-z0-9][a-z0-9-]{0,127}$/;
const FINISH = /^[\p{L}\p{N}][\p{L}\p{N} '&./-]{0,47}$/u;
const EVENT_ID = /^[A-Za-z0-9_-]{8,64}$/;

export function isValidSlug(value: unknown): value is string {
  return typeof value === 'string' && SLUG.test(value);
}

function optionalFinish(value: unknown): string | undefined {
  return typeof value === 'string' && FINISH.test(value) ? value : undefined;
}

/**
 * Accepts only what the schema names and rebuilds the event field by field.
 *
 * Returns null for anything malformed. A stored log is user-writable and a
 * posted one is hostile, so nothing about the input is trusted, including that
 * it is an object.
 */
export function parseInterestEvent(value: unknown): InterestEvent | null {
  if (typeof value !== 'object' || value === null) return null;
  const e = value as Record<string, unknown>;
  if (typeof e.id !== 'string' || !EVENT_ID.test(e.id)) return null;
  if (typeof e.kind !== 'string' || !(INTEREST_KINDS as readonly string[]).includes(e.kind)) return null;
  if (!isValidSlug(e.slug)) return null;
  if (typeof e.at !== 'number' || !Number.isFinite(e.at) || e.at <= 0) return null;

  const kind = e.kind as InterestKind;
  const event: InterestEvent = { id: e.id, kind, slug: e.slug, at: Math.floor(e.at) };

  const finish = optionalFinish(e.finish);
  if (finish) event.finish = finish;
  if (kind === 'this_or_that') {
    if (isValidSlug(e.otherSlug)) event.otherSlug = e.otherSlug;
    const otherFinish = optionalFinish(e.otherFinish);
    if (otherFinish) event.otherFinish = otherFinish;
  }
  if (kind === 'remove' && (e.from === 'cart' || e.from === 'saved')) event.from = e.from;
  return event;
}

/** Union of two logs by event id, oldest first, within retention and the size cap. */
export function mergeEventLogs(
  a: readonly InterestEvent[],
  b: readonly InterestEvent[],
  now: number,
): InterestEvent[] {
  const byId = new Map<string, InterestEvent>();
  for (const event of [...a, ...b]) byId.set(event.id, event);
  return [...byId.values()]
    .filter(e => e.at <= now + DEDUPE_MS && now - e.at <= RETENTION_MS)
    .sort((x, y) => x.at - y.at || x.id.localeCompare(y.id))
    .slice(-MAX_LOG_EVENTS);
}

/**
 * A random id for one event.
 *
 * Exists only so a retried merge does not double-count. It is generated fresh
 * for every event and derived from nothing about the device, so two events from
 * the same browser share no identifier. Do not replace this with anything
 * stable: a stable id here would be a fingerprint.
 */
export function newEventId(): string {
  const bytes = new Uint8Array(12);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, b => b.toString(36).padStart(2, '0')).join('');
}
