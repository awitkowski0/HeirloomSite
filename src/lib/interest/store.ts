/*
 * The on-device log, read through useSyncExternalStore like the cart.
 *
 * WHAT FOLLOWS CONSENT. This module uses the same gate as posthog-client:
 *
 *   unknown / pending   held in memory only; nothing is written to the device
 *   granted             the queue is flushed with its original timestamps
 *   denied              the queue is dropped and anything stored is erased
 *
 * Saving and adding to the cart go through this gate too, because the cart and
 * saved list do not depend on it: they are separate stores that keep working for
 * everyone. nurseryProgress() in catalog.ts reads them with no consent needed.
 * What needs consent is keeping a behavioural log on top of them.
 *
 * WHAT DOES NOT LEAVE THE DEVICE. Nothing in this directory may import
 * analytics, posthog-client, meta-pixel, HeyCatch or Babylist code, and the only
 * network call is the account merge the visitor taps themselves, to our own
 * origin. tests/interest-privacy.test.ts enforces both.
 *
 * The off switch is the visitor's own setting and overrides consent: when off,
 * nothing is learned and what was stored is erased.
 */
import {
  consentStatus,
  subscribeConsent,
  type ConsentStatus,
} from '@/lib/consent';
import {
  MAX_QUEUED_EVENTS,
  mergeEventLogs,
  newEventId,
  parseInterestEvent,
  type InterestEvent,
  type InterestEventDraft,
} from './events';

const STORAGE_KEY = 'heirloom_interest_v1';
const CHANGE_EVENT = 'heirloom_interest_change';

export type InterestStatus = 'waiting' | 'learning' | 'off' | 'declined';

export interface InterestState {
  status: InterestStatus;
  events: readonly InterestEvent[];
  /** When this snapshot was read. Passed as `now` so rendering stays pure. */
  readAt: number;
}

const EMPTY: readonly InterestEvent[] = [];
const SERVER_STATE: InterestState = { status: 'waiting', events: EMPTY, readAt: 0 };

export interface InterestStoreDeps {
  read: () => string | null;
  write: (raw: string) => void;
  remove: () => void;
  consent: () => ConsentStatus;
  subscribeConsent: (onChange: () => void) => () => void;
  /** Tells every subscriber, in this tab and others, that the log changed. */
  subscribeExternal: (onChange: () => void) => () => void;
  notify: () => void;
  now: () => number;
  newId: () => string;
}

interface Stored {
  off: boolean;
  events: InterestEvent[];
}

/** Rejects anything it does not recognise. localStorage survives deploys and is user-writable. */
export function parseStoredInterest(raw: string | null, now: number): Stored {
  if (!raw) return { off: false, events: [] };
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { off: false, events: [] };
  }
  if (typeof parsed !== 'object' || parsed === null) return { off: false, events: [] };
  const value = parsed as { v?: unknown; off?: unknown; events?: unknown };
  if (value.v !== 1) return { off: false, events: [] };
  const events = Array.isArray(value.events)
    ? value.events.flatMap(e => parseInterestEvent(e) ?? [])
    : [];
  return { off: value.off === true, events: mergeEventLogs(events, [], now) };
}

export interface InterestStore {
  /** Records one action. Safe to call from anywhere, including before consent resolves. */
  record: (draft: InterestEventDraft) => void;
  /** Records opening a comparison for each piece in it. */
  recordCompare: (slugs: readonly string[]) => void;
  /** One-tap clear of everything on this device. */
  clear: () => void;
  setLearning: (enabled: boolean) => void;
  /** Adds events that came back from the account after a merge. */
  adopt: (events: readonly InterestEvent[]) => void;
  getState: () => InterestState;
  getServerState: () => InterestState;
  subscribe: (onChange: () => void) => () => void;
}

export function createInterestStore(deps: InterestStoreDeps): InterestStore {
  const queue: InterestEvent[] = [];
  const listeners = new Set<() => void>();
  let bound = false;
  let cacheKey: string | null = null;
  let cached: InterestState = SERVER_STATE;

  const load = (): Stored => parseStoredInterest(deps.read(), deps.now());

  function save(stored: Stored): void {
    if (!stored.off && stored.events.length === 0) deps.remove();
    else deps.write(JSON.stringify({ v: 1, ...(stored.off ? { off: true } : {}), events: stored.events }));
    deps.notify();
  }

  function append(events: InterestEvent[]): void {
    const stored = load();
    save({ off: stored.off, events: mergeEventLogs(stored.events, events, deps.now()) });
  }

  function statusFor(off: boolean, consent: ConsentStatus): InterestStatus {
    if (off) return 'off';
    if (consent === 'granted') return 'learning';
    if (consent === 'denied') return 'declined';
    return 'waiting';
  }

  /** Brings the log into line with consent. Run on every consent change and on first use. */
  function reconcile(): void {
    const consent = deps.consent();
    if (consent === 'denied') {
      queue.length = 0;
      const stored = load();
      if (stored.events.length > 0) save({ off: stored.off, events: [] });
      return;
    }
    if (consent === 'granted' && queue.length > 0) {
      const pending = queue.splice(0, queue.length);
      if (!load().off) append(pending);
    }
    deps.notify();
  }

  function bind(): void {
    if (bound) return;
    bound = true;
    deps.subscribeConsent(reconcile);
    reconcile();
  }

  function record(draft: InterestEventDraft): void {
    bind();
    const event = parseInterestEvent({ ...draft, id: deps.newId(), at: deps.now() });
    if (!event) return;
    if (load().off) return;
    const consent = deps.consent();
    if (consent === 'denied') return;
    if (consent === 'granted') {
      append([event]);
      return;
    }
    if (queue.length < MAX_QUEUED_EVENTS) queue.push(event);
  }

  function recordCompare(slugs: readonly string[]): void {
    for (const slug of new Set(slugs)) record({ kind: 'compare', slug });
  }

  function clear(): void {
    bind();
    queue.length = 0;
    save({ off: load().off, events: [] });
  }

  function setLearning(enabled: boolean): void {
    bind();
    queue.length = 0;
    save({ off: !enabled, events: enabled ? load().events : [] });
  }

  function adopt(events: readonly InterestEvent[]): void {
    bind();
    if (getState().status !== 'learning') return;
    append([...events]);
  }

  function getState(): InterestState {
    const raw = deps.read();
    const consent = deps.consent();
    const key = `${consent}\u0000${raw ?? ''}`;
    if (key !== cacheKey) {
      const readAt = deps.now();
      const stored = parseStoredInterest(raw, readAt);
      const status = statusFor(stored.off, consent);
      cached = { status, events: status === 'learning' && stored.events.length ? stored.events : EMPTY, readAt };
      cacheKey = key;
    }
    return cached;
  }

  function subscribe(onChange: () => void): () => void {
    bind();
    listeners.add(onChange);
    const unsubscribeExternal = deps.subscribeExternal(onChange);
    const unsubscribeConsent = deps.subscribeConsent(onChange);
    return () => {
      listeners.delete(onChange);
      unsubscribeExternal();
      unsubscribeConsent();
    };
  }

  return {
    record,
    recordCompare,
    clear,
    setLearning,
    adopt,
    getState,
    getServerState: () => SERVER_STATE,
    subscribe,
  };
}

// ---------------------------------------------------------------------------
// The site's store
// ---------------------------------------------------------------------------

function storage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

const browserDeps: InterestStoreDeps = {
  read: () => {
    try {
      return storage()?.getItem(STORAGE_KEY) ?? null;
    } catch {
      return null;
    }
  },
  write: raw => {
    try {
      storage()?.setItem(STORAGE_KEY, raw);
    } catch {
      // Quota or private-browsing failure: personalization just does not stick.
    }
  },
  remove: () => {
    try {
      storage()?.removeItem(STORAGE_KEY);
    } catch {
      // As above.
    }
  },
  consent: consentStatus,
  subscribeConsent,
  subscribeExternal: onChange => {
    if (typeof window === 'undefined') return () => {};
    const onStorage = (e: StorageEvent) => {
      if (e.key === null || e.key === STORAGE_KEY) onChange();
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener(CHANGE_EVENT, onChange);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(CHANGE_EVENT, onChange);
    };
  },
  notify: () => {
    if (typeof window !== 'undefined') window.dispatchEvent(new Event(CHANGE_EVENT));
  },
  now: () => Date.now(),
  newId: newEventId,
};

export const interestStore = createInterestStore(browserDeps);
const store = interestStore;

export const recordInterest = store.record;
export const recordCompare = store.recordCompare;
export const clearInterests = store.clear;
export const setInterestLearning = store.setLearning;
export const getInterestState = store.getState;
export const getInterestServerState = store.getServerState;
export const subscribeInterest = store.subscribe;
