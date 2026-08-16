'use client';

import { isUsState } from '@/lib/order-terms';
import { EMPTY_SHIPPING, type ShippingValues } from './ShippingForm';

/**
 * The shipping form, remembered between visits.
 *
 * Retyping a name, an email and a street address is the most tedious thing this
 * site asks anyone to do, and it was thrown away by every reload - including
 * the reload the checkout itself tells you to do when the browser check fails.
 *
 * Exposed through useSyncExternalStore, like the cart, because localStorage
 * genuinely is an external store and reading it with setState-in-an-effect is
 * both a hydration hazard and a lint error here.
 *
 * Unlike the cart it does NOT subscribe to the native `storage` event. Two tabs
 * staying in step is right for a cart and wrong for a form: two open checkouts
 * would overwrite each other's half-typed address on every keystroke. The
 * subscription exists only so this component re-renders on its own writes.
 */

const STORAGE_KEY = 'heirloom_shipping';

/*
 * A week.
 *
 * An address is only worth restoring while it is still where the customer
 * lives. Silently re-filling a form with somewhere they moved out of months
 * ago is worse than an empty form, because a wrong address that looks
 * deliberate is one nobody re-reads before submitting.
 */
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

/** Mirrors MAX_FIELD in src/lib/pricing.ts; the server rejects anything longer. */
const MAX_FIELD = 100;

interface StoredShipping {
  savedAt: number;
  values: ShippingValues;
}

/**
 * JSON.parse succeeding does not mean the value is a ShippingValues.
 *
 * Same reasoning as the cart's validator: this is user-writable storage that
 * survives deploys, so a stale shape from an older version of the form, or
 * anything a person typed into devtools, has to be rejected rather than spread
 * into component state.
 */
function isShippingValues(value: unknown): value is ShippingValues {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  for (const key of Object.keys(EMPTY_SHIPPING) as Array<keyof ShippingValues>) {
    const field = v[key];
    if (typeof field !== 'string' || field.length > MAX_FIELD) return false;
  }
  // The state decides whether 6% sales tax is charged, so a restored value that
  // is not a real code must not reach the summary and quietly untax an order.
  const state = v.state as string;
  return state === '' || isUsState(state.toUpperCase());
}

function isEmpty(values: ShippingValues): boolean {
  return Object.values(values).every(v => v === '');
}

export function loadShipping(): ShippingValues | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<StoredShipping>;
    if (typeof parsed?.savedAt !== 'number' || !isShippingValues(parsed.values)) {
      window.localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    if (Date.now() - parsed.savedAt > MAX_AGE_MS) {
      window.localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed.values;
  } catch {
    // Private browsing, a full quota, or corrupt JSON. A form that cannot be
    // restored is a minor inconvenience; one that throws on mount is a blank
    // checkout page.
    return null;
  }
}

export function saveShipping(values: ShippingValues): void {
  if (typeof window === 'undefined') return;
  // Clearing the last field clears the record, rather than leaving an empty
  // one to be restored and re-saved forever.
  if (isEmpty(values)) return clearShipping();
  try {
    const payload: StoredShipping = { savedAt: Date.now(), values };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Quota or a blocked store. Not worth telling the customer about: the form
    // in front of them still works, it just will not survive a reload.
  }
}

export function clearShipping(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* nothing to do */
  }
}

// ---------------------------------------------------------------------------
// useSyncExternalStore adapter
// ---------------------------------------------------------------------------

const listeners = new Set<() => void>();

/*
 * The snapshot has to be referentially stable, or useSyncExternalStore loops:
 * it compares snapshots by identity, and a fresh object from every getSnapshot
 * call looks like a change on every render. Read from localStorage once, then
 * serve this until something writes.
 */
let cache: ShippingValues | null = null;

export function subscribeShipping(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

export function getShippingSnapshot(): ShippingValues {
  if (cache === null) cache = loadShipping() ?? EMPTY_SHIPPING;
  return cache;
}

/**
 * Empty on the server, deliberately.
 *
 * The prerendered HTML cannot know what is in someone's browser, so it renders
 * the form blank and React swaps in the stored values after hydration - the
 * same contract the cart has.
 */
export function getShippingServerSnapshot(): ShippingValues {
  return EMPTY_SHIPPING;
}

function emit(): void {
  for (const listener of listeners) listener();
}

export function setShippingValues(next: ShippingValues): void {
  cache = next;
  saveShipping(next);
  emit();
}

export function clearShippingValues(): void {
  cache = EMPTY_SHIPPING;
  clearShipping();
  emit();
}
