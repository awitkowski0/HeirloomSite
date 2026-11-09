'use client';

import { useSyncExternalStore } from 'react';
import type { ShopItem } from '@/lib/shop';
import { EMPTY_SELECTIONS, parseSelections, type Selections } from './selectionsParse';

export type { RunState, Selections } from './selectionsParse';

/*
 * What a shopper has set aside, and which of those they are comparing.
 *
 * localStorage through useSyncExternalStore, the same pattern as the cart, so it
 * survives Back, reloads and other tabs without any page reading the URL or
 * cookies. Each row keeps what the tray needs to draw it. Those prices are for
 * display only: an order is always priced by src/lib/pricing.ts.
 */
export const MAX_COMPARE = 3;

const STORAGE_KEY = 'heirloom_selections';
const EVENT = 'heirloom_selections_change';
const EMPTY = EMPTY_SELECTIONS;

let cached: Selections = EMPTY;
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

const serverSnapshot = () => EMPTY;

export function useSelections(): Selections {
  return useSyncExternalStore(subscribe, read, serverSnapshot);
}

/** For code that must check once rather than subscribe. */
export function currentSelections(): Selections {
  return read();
}

export function isSetAside(selections: Selections, slug: string): boolean {
  return selections.items.some(i => i.slug === slug);
}

/** Setting a piece aside also lines it up to compare, while there is room. */
export function setAside(item: ShopItem) {
  const state = read();
  if (state.items.some(i => i.slug === item.slug)) return;
  write({
    ...state,
    items: [...state.items, item],
    compare: state.compare.length < MAX_COMPARE ? [...state.compare, item.slug] : state.compare,
  });
}

export function removeSelection(slug: string) {
  const state = read();
  write({ ...state, items: state.items.filter(i => i.slug !== slug), compare: state.compare.filter(s => s !== slug) });
}

export function toggleSetAside(item: ShopItem) {
  if (read().items.some(i => i.slug === item.slug)) removeSelection(item.slug);
  else setAside(item);
}

export function toggleCompare(slug: string) {
  const state = read();
  if (state.compare.includes(slug)) {
    write({ ...state, compare: state.compare.filter(s => s !== slug) });
  } else if (state.compare.length < MAX_COMPARE) {
    write({ ...state, compare: [...state.compare, slug] });
  }
}

/** Make these pieces the comparison, setting aside any that are new. */
export function compareOnly(items: ShopItem[]) {
  const state = read();
  const known = new Set(state.items.map(i => i.slug));
  write({
    ...state,
    items: [...state.items, ...items.filter(i => !known.has(i.slug))],
    compare: items.slice(0, MAX_COMPARE).map(i => i.slug),
  });
}

/** Flip one side of the comparison to another piece, in place. */
export function swapCompare(fromSlug: string, to: ShopItem) {
  const state = read();
  const compare = state.compare.map(s => (s === fromSlug ? to.slug : s));
  write({
    ...state,
    compare,
    compareExtras: [...state.compareExtras.filter(i => i.slug !== to.slug && compare.includes(i.slug)), to],
  });
}

export function pickRun(plateId: string, side: 'left' | 'right') {
  const state = read();
  write({ ...state, run: { ...state.run, picks: { ...state.run.picks, [plateId]: side } } });
}

export function setRunAt(at: number) {
  const state = read();
  if (state.run.at !== at) write({ ...state, run: { ...state.run, at } });
}

export function resetRun() {
  write({ ...read(), run: { picks: {}, at: 0 } });
}

export type TrayTab = 'saved' | 'compare' | 'cart' | 'registry';
const TRAY_EVENT = 'heirloom_tray_open';

/** Returns false off the catalog routes, where the tray is not mounted. */
export function requestTrayOpen(tab: TrayTab): boolean {
  if (!document.querySelector('.tray')) return false;
  window.dispatchEvent(new CustomEvent<TrayTab>(TRAY_EVENT, { detail: tab }));
  return true;
}

export function onTrayOpen(listener: (tab: TrayTab) => void) {
  const handler = (e: Event) => listener((e as CustomEvent<TrayTab>).detail);
  window.addEventListener(TRAY_EVENT, handler);
  return () => window.removeEventListener(TRAY_EVENT, handler);
}

/* The compare view opens from pages that do not own it. */
const OPEN_EVENT = 'heirloom_compare_open';

export function requestCompareOpen() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

export function onCompareOpen(listener: () => void) {
  window.addEventListener(OPEN_EVENT, listener);
  return () => window.removeEventListener(OPEN_EVENT, listener);
}
