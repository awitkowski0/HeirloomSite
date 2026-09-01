'use client';

/**
 * Whether this browser has already dealt with the email popup.
 *
 * Plain functions rather than a useSyncExternalStore adapter like the cart's:
 * nothing re-renders when this changes. The popup reads it once when a trigger
 * fires and writes it when the visitor is finished with it, so a subscribable
 * store would be machinery for no subscriber.
 */

const STORAGE_KEY = 'hc_subscribe';
const VERSION = 1;

/*
 * A month for a dismissal, forever for a signup.
 *
 * Someone who closed the popup has answered "not now", not "never" - a shop
 * whose product is bought once every few years is entitled to ask again next
 * season. Someone who actually subscribed has answered permanently, and asking
 * them again is the single most irritating thing this component could do.
 */
const DISMISSED_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

type SubscribeStatus = 'dismissed' | 'subscribed';

interface StoredSubscribe {
  v: number;
  status: SubscribeStatus;
  ts: number;
}

export function subscribePromptSettled(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as Partial<StoredSubscribe>;
    if (parsed?.v !== VERSION || typeof parsed.ts !== 'number') return false;
    if (parsed.status === 'subscribed') return true;
    if (parsed.status !== 'dismissed') return false;
    return Date.now() - parsed.ts < DISMISSED_MAX_AGE_MS;
  } catch {
    /*
     * Unreadable storage means "do not show it". The opposite default would
     * pop a modal on every page load for anyone browsing privately, which is
     * far worse than one missed signup.
     */
    return true;
  }
}

export function markSubscribePrompt(status: SubscribeStatus): void {
  if (typeof window === 'undefined') return;
  try {
    const payload: StoredSubscribe = { v: VERSION, status, ts: Date.now() };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Quota or a blocked store. The popup is already closed for this page view;
    // it will simply ask again next time.
  }
}
