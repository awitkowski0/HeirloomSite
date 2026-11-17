/*
 * The selections store's types and parser, kept free of React so they can be
 * tested (the test runner uses React's server build, which has no hooks) and
 * read anywhere. The store itself is src/context/selectionsStore.ts.
 */
export const MAX_COMPARE = 3;

export type Side = 'a' | 'b' | 'skip';

export interface RunState {
  picks: Record<string, Side>;
  /** Index of the question showing; past the last one means "your look". */
  at: number;
}

/**
 * A saved piece, kept with what the side rail needs to draw it and what
 * Babylist needs to list it, so neither has to load the catalogue. The price
 * is display only: an order is always priced by src/lib/pricing.ts.
 */
export interface SavedPiece {
  slug: string;
  name: string;
  /** Site-relative photo of the saved finish. */
  image: string;
  /** Site-relative link to the exact wood-and-finish page. */
  href: string;
  price: number;
  finish: string | null;
}

export const MAX_SAVED = 40;

export interface Selections {
  saved: SavedPiece[];
  compare: string[];
  finishes: Record<string, string>;
  run: RunState;
}

const isString = (v: unknown): v is string => typeof v === 'string' && v.length > 0 && v.length < 200;

export const EMPTY_SELECTIONS: Selections = { saved: [], compare: [], finishes: {}, run: { picks: {}, at: 0 } };

const isPath = (v: unknown): v is string => isString(v) && v.startsWith('/') && !v.startsWith('//');

function parseSaved(v: unknown): SavedPiece[] {
  if (!Array.isArray(v)) return [];
  const seen = new Set<string>();
  const out: SavedPiece[] = [];
  for (const e of v) {
    if (typeof e !== 'object' || e === null) continue;
    const r = e as Record<string, unknown>;
    if (!isString(r.slug) || seen.has(r.slug) || !isString(r.name) || !isPath(r.href)) continue;
    if (typeof r.price !== 'number' || !Number.isFinite(r.price) || r.price < 0) continue;
    seen.add(r.slug);
    out.push({
      slug: r.slug,
      name: r.name,
      image: isPath(r.image) ? r.image : '',
      href: r.href,
      price: r.price,
      finish: isString(r.finish) ? r.finish : null,
    });
  }
  return out.slice(0, MAX_SAVED);
}


/**
 * Anything stored is untrusted: an old version, another tab mid-write, or a
 * hand edit. Keep what is well-formed and drop the rest, rather than throw
 * and white-screen every page that reads it (the cart learned this the hard
 * way; see parseStoredCart).
 */
export function parseSelections(raw: string | null): Selections {
  if (!raw) return EMPTY_SELECTIONS;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return EMPTY_SELECTIONS;
  }
  if (typeof data !== 'object' || data === null) return EMPTY_SELECTIONS;
  const d = data as Record<string, unknown>;
  const compare = Array.isArray(d.compare) ? [...new Set(d.compare.filter(isString))].slice(0, MAX_COMPARE) : [];
  const finishes: Record<string, string> = {};
  if (typeof d.finishes === 'object' && d.finishes !== null) {
    for (const [k, v] of Object.entries(d.finishes as Record<string, unknown>)) if (isString(k) && isString(v)) finishes[k] = v;
  }
  const run: RunState = { picks: {}, at: 0 };
  if (typeof d.run === 'object' && d.run !== null) {
    const r = d.run as Record<string, unknown>;
    if (typeof r.picks === 'object' && r.picks !== null) {
      for (const [k, v] of Object.entries(r.picks as Record<string, unknown>)) {
        if (isString(k) && (v === 'a' || v === 'b' || v === 'skip')) run.picks[k] = v;
      }
    }
    if (typeof r.at === 'number' && Number.isInteger(r.at) && r.at >= 0 && r.at < 50) run.at = r.at;
  }
  return { saved: parseSaved(d.saved), compare, finishes, run };
}

