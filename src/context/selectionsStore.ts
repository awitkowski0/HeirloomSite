'use client';

import { useSyncExternalStore } from 'react';

/*
 * What a shopper is comparing, the finish they last looked at for each piece,
 * and how far they are through Help me pick. localStorage through
 * useSyncExternalStore, like the cart (src/context/cartStore.ts), so it
 * survives Back, reloads and other tabs without any page reading the URL or
 * cookies - every route stays statically prerendered.
 *
 * Only slugs and finish names are stored. Pages resolve them against the
 * catalogue they were built with, so nothing here can carry a stale price.
 */
import {
  EMPTY_SELECTIONS,
  MAX_COMPARE,
  parseSelections,
  MAX_SAVED,
  type RunState,
  type SavedPiece,
  type Selections,
  type Side,
} from './selectionsParse';

export { EMPTY_SELECTIONS, MAX_COMPARE, parseSelections };
export type { RunState, SavedPiece, Selections, Side };

const STORAGE_KEY = 'heirloom_selections';
const EVENT = 'heirloom_selections_change';

let cached: Selections = EMPTY_SELECTIONS;
let cachedRaw: string | null = null;

function read(): Selections {
  let raw: string | null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return cached;
  }
  if (raw === cachedRaw) return cached;
  cachedRaw = raw;
  cached = parseSelections(raw);
  return cached;
}

function write(next: Selections) {
  cached = next;
  try {
    cachedRaw = JSON.stringify(next);
    window.localStorage.setItem(STORAGE_KEY, cachedRaw);
  } catch {
    // Private mode or quota: keep working in memory for this page.
    cachedRaw = null;
  }
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(listener: () => void) {
  window.addEventListener(EVENT, listener);
  window.addEventListener('storage', listener);
  return () => {
    window.removeEventListener(EVENT, listener);
    window.removeEventListener('storage', listener);
  };
}

const serverSnapshot = () => EMPTY_SELECTIONS;

export function useSelections(): Selections {
  return useSyncExternalStore(subscribe, read, serverSnapshot);
}

/** Saving keeps a piece. It does not fill the cart. Returns true if now saved. */
export function toggleSaved(piece: SavedPiece): boolean {
  const state = read();
  if (state.saved.some(p => p.slug === piece.slug)) {
    write({ ...state, saved: state.saved.filter(p => p.slug !== piece.slug) });
    return false;
  }
  write({ ...state, saved: [piece, ...state.saved].slice(0, MAX_SAVED) });
  return true;
}

export function removeSaved(slug: string) {
  const state = read();
  write({ ...state, saved: state.saved.filter(p => p.slug !== slug) });
}

export type CompareResult = 'added' | 'removed' | 'full';

const withFinish = (state: Selections, slug: string, finish?: string | null) =>
  finish ? { ...state.finishes, [slug]: finish } : state.finishes;

/** Returns 'full' instead of quietly dropping a piece: the shopper picks which goes. */
export function toggleCompare(slug: string, finish?: string | null): CompareResult {
  const state = read();
  if (state.compare.includes(slug)) {
    write({ ...state, compare: state.compare.filter(s => s !== slug) });
    return 'removed';
  }
  if (state.compare.length >= MAX_COMPARE) return 'full';
  write({ ...state, compare: [...state.compare, slug], finishes: withFinish(state, slug, finish) });
  return 'added';
}

export function removeCompare(slug: string) {
  const state = read();
  write({ ...state, compare: state.compare.filter(s => s !== slug) });
}

/** Swap one compared piece for another, in place. */
export function replaceCompare(fromSlug: string, toSlug: string, finish?: string | null) {
  const state = read();
  write({
    ...state,
    compare: state.compare.map(s => (s === fromSlug ? toSlug : s)),
    finishes: withFinish(state, toSlug, finish),
  });
}

export function setCompare(entries: readonly { slug: string; finish: string | null }[]) {
  const state = read();
  const finishes = { ...state.finishes };
  for (const { slug, finish } of entries) if (finish) finishes[slug] = finish;
  write({ ...state, compare: entries.slice(0, MAX_COMPARE).map(e => e.slug), finishes });
}

export function setSharedFinish(slugs: readonly string[], finish: string) {
  const state = read();
  const finishes = { ...state.finishes };
  for (const slug of slugs) finishes[slug] = finish;
  write({ ...state, finishes });
}

export function pickRun(pairId: string, side: Side, at: number) {
  const state = read();
  write({ ...state, run: { picks: { ...state.run.picks, [pairId]: side }, at } });
}

export function undoPick(pairId: string, at: number) {
  const state = read();
  const picks = { ...state.run.picks };
  delete picks[pairId];
  write({ ...state, run: { picks, at } });
}

export function resetRun() {
  write({ ...read(), run: { picks: {}, at: 0 } });
}
