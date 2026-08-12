'use client';

import type { CartItem, CartAddon } from '@/types';
import { MAX_QUANTITY_PER_LINE } from '@/lib/cart-limits';

const STORAGE_KEY = 'heirloom_cart';
const EVENT = 'heirloom_cart_change';

/**
 * localStorage-backed cart store, exposed for useSyncExternalStore.
 *
 * localStorage genuinely is an external store, so this is the primitive React
 * provides for it. Reading it through useSyncExternalStore instead of
 * useState + a mount effect gives us three things:
 *
 *  - a getServerSnapshot, so the server renders an empty cart deliberately
 *    rather than relying on a try/catch swallowing a ReferenceError,
 *  - no setState-in-effect cascade on every page load,
 *  - cross-tab synchronisation for free, via the native `storage` event.
 */

export function itemKey(
  item: Pick<CartItem, 'productName' | 'wood' | 'stainName' | 'addons'>
): string {
  const addonKey = (item.addons || [])
    .map(a => `${a.name}:${a.price}:${a.stainName || ''}`)
    .sort()
    .join('|');
  return [item.productName, item.wood, item.stainName, addonKey].join(' ');
}

/**
 * Stable id for a cart line, derived from itemKey.
 *
 * The id was previously built as `${productName}-${wood}-${stain}`, omitting
 * add-ons even though itemKey includes them - so two lines that itemKey
 * correctly kept apart shared an id, removeFromCart(id) deleted both, and React
 * saw duplicate keys. The hyphen join was also ambiguous for names containing
 * "-" (e.g. "3/4 Guard Rail"). Deriving from itemKey keeps them in sync.
 */
export function cartItemId(
  item: Pick<CartItem, 'productName' | 'wood' | 'stainName' | 'addons'>
): string {
  const key = itemKey(item);
  let hash = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return `ci_${(hash >>> 0).toString(36)}`;
}

function isCartAddon(value: unknown): value is CartAddon {
  if (typeof value !== 'object' || value === null) return false;
  const a = value as Record<string, unknown>;
  return typeof a.name === 'string' && typeof a.price === 'number' && Number.isFinite(a.price);
}

/**
 * JSON.parse succeeding does not mean the value is a CartItem[]. A stale or
 * tampered `"5"` or `{}` parsed fine, then cart.reduce threw
 * "cart.reduce is not a function" - and with no error boundary in the app that
 * white-screened every page until the user cleared site data.
 */
export function parseStoredCart(raw: string | null): CartItem[] {
  if (!raw) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];

  const out: CartItem[] = [];
  for (const entry of parsed) {
    if (typeof entry !== 'object' || entry === null) continue;
    const e = entry as Record<string, unknown>;
    if (
      typeof e.productName !== 'string' ||
      typeof e.wood !== 'string' ||
      typeof e.stainName !== 'string' ||
      typeof e.price !== 'number' ||
      !Number.isFinite(e.price) ||
      e.price < 0 ||
      typeof e.quantity !== 'number' ||
      !Number.isInteger(e.quantity) ||
      e.quantity <= 0
    ) {
      continue;
    }
    const addons = Array.isArray(e.addons) ? e.addons.filter(isCartAddon) : undefined;
    const base = { productName: e.productName, wood: e.wood, stainName: e.stainName, addons };
    out.push({
      ...base,
      id: typeof e.id === 'string' && e.id ? e.id : cartItemId(base),
      cribName: typeof e.cribName === 'string' ? e.cribName : undefined,
      price: e.price,
      image: typeof e.image === 'string' ? e.image : '',
      // Clamped to the same ceiling the server enforces, so a cart restored
      // from localStorage can never carry a line checkout will reject.
      quantity: Math.min(e.quantity, MAX_QUANTITY_PER_LINE),
    });
  }
  return out;
}

const EMPTY: CartItem[] = [];

// getSnapshot must return a referentially stable value or React re-renders
// forever, so the parsed array is cached against the raw string it came from.
let cachedRaw: string | null = null;
let cachedValue: CartItem[] = EMPTY;

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    // Safari private mode and blocked third-party storage both throw on access.
    return null;
  }
}

export function getSnapshot(): CartItem[] {
  const raw = readRaw();
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedValue = parseStoredCart(raw);
  }
  return cachedValue;
}

/** The server has no localStorage, so it always renders an empty cart. */
export function getServerSnapshot(): CartItem[] {
  return EMPTY;
}

export function subscribe(onChange: () => void): () => void {
  // `storage` fires in OTHER tabs; the custom event covers this one.
  const handleStorage = (e: StorageEvent) => {
    if (e.key === null || e.key === STORAGE_KEY) onChange();
  };
  window.addEventListener('storage', handleStorage);
  window.addEventListener(EVENT, onChange);
  return () => {
    window.removeEventListener('storage', handleStorage);
    window.removeEventListener(EVENT, onChange);
  };
}

export function writeCart(next: CartItem[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Quota exceeded or private-mode write failure. Previously unguarded, so
    // the throw propagated out of the effect and unmounted the whole tree.
  }
  // Notify this tab even if the write failed, so the UI stays responsive.
  window.dispatchEvent(new Event(EVENT));
}

export function updateCart(updater: (current: CartItem[]) => CartItem[]): void {
  writeCart(updater(getSnapshot()));
}
