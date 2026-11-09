'use client';

import { useSyncExternalStore } from 'react';
import type { Side } from '@/lib/pick-run';
import type { ShopItem } from '@/lib/shop';
import { EMPTY_SELECTIONS, parseSelections, type Selections } from './selectionsParse';

export type { RunState, Selections } from './selectionsParse';

/*
 * What a shopper has saved, is comparing, and how far they are through the pick
 * run. localStorage through useSyncExternalStore, like the cart, so it survives
 * Back, reloads and other tabs without any page reading the URL or cookies.
 *
 * Rows keep what the dock needs to draw them. Their prices are for display only:
 * an order is always priced by src/lib/pricing.ts.
 */
export const MAX_COMPARE = 3;

const STORAGE_KEY = 'heirloom_selections';
const EVENT = 'heirloom_selections_change';

let cached: Selections = EMPTY_SELECTIONS;
let cachedRaw: string | null = null;

function read(): Selections {
  let raw: string | null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
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
    localStorage.setItem(STORAGE_KEY, cachedRaw);
  } catch {
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

export function isSaved(selections: Selections, slug: string): boolean {
  return selections.items.some(i => i.slug === slug);
}

export function setFinish(slug: string, finish: string) {
  const state = read();
  if (state.finishes[slug] !== finish) write({ ...state, finishes: { ...state.finishes, [slug]: finish } });
}

/** Saving keeps a piece. It does not fill the cart, or the nursery progress. */
export function toggleSaved(item: ShopItem, finish?: string | null) {
  const state = read();
  if (state.items.some(i => i.slug === item.slug)) {
    write({ ...state, items: state.items.filter(i => i.slug !== item.slug) });
    return false;
  }
  write({
    ...state,
    items: [...state.items, item],
    finishes: finish ? { ...state.finishes, [item.slug]: finish } : state.finishes,
  });
  return true;
}

export function removeSaved(slug: string) {
  const state = read();
  write({ ...state, items: state.items.filter(i => i.slug !== slug) });
}

export type CompareResult = 'added' | 'removed' | 'full';

function compareExtras(state: Selections, item: ShopItem, compare: string[]) {
  return [...state.compareExtras.filter(i => i.slug !== item.slug && compare.includes(i.slug)), item];
}

/** Returns 'full' instead of quietly dropping a piece: the shopper picks which goes. */
export function toggleCompare(item: ShopItem, finish?: string | null): CompareResult {
  const state = read();
  if (state.compare.includes(item.slug)) {
    write({ ...state, compare: state.compare.filter(s => s !== item.slug) });
    return 'removed';
  }
  if (state.compare.length >= MAX_COMPARE) return 'full';
  const compare = [...state.compare, item.slug];
  write({
    ...state,
    compare,
    compareExtras: compareExtras(state, item, compare),
    finishes: finish ? { ...state.finishes, [item.slug]: finish } : state.finishes,
  });
  return 'added';
}

export function removeCompare(slug: string) {
  const state = read();
  write({ ...state, compare: state.compare.filter(s => s !== slug) });
}

export function setCompare(items: readonly { item: ShopItem; finish: string | null }[]) {
  const state = read();
  const compare = items.slice(0, MAX_COMPARE).map(i => i.item.slug);
  const finishes = { ...state.finishes };
  for (const { item, finish } of items) if (finish) finishes[item.slug] = finish;
  write({
    ...state,
    compare,
    compareExtras: [...items.map(i => i.item)],
    finishes,
  });
}

/** Swap one column for another piece, in place. */
export function replaceCompare(fromSlug: string, to: ShopItem, finish?: string | null) {
  const state = read();
  const compare = state.compare.map(s => (s === fromSlug ? to.slug : s));
  write({
    ...state,
    compare,
    compareExtras: compareExtras(state, to, compare),
    finishes: finish ? { ...state.finishes, [to.slug]: finish } : state.finishes,
  });
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

export type PanelRequest = { kind: 'tray' } | { kind: 'chat'; piece?: string };
const PANEL_EVENT = 'heirloom_panel_open';

export function requestPanel(request: PanelRequest) {
  window.dispatchEvent(new CustomEvent<PanelRequest>(PANEL_EVENT, { detail: request }));
}

export function onPanelRequest(listener: (request: PanelRequest) => void) {
  const handler = (e: Event) => listener((e as CustomEvent<PanelRequest>).detail);
  window.addEventListener(PANEL_EVENT, handler);
  return () => window.removeEventListener(PANEL_EVENT, handler);
}

/** For code that must check once rather than subscribe. */
export function currentSelections(): Selections {
  return read();
}
