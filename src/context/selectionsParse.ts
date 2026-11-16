import type { Side } from '@/lib/pick-run';
import type { ShopItem } from '@/lib/shop';

export interface RunState {
  picks: Record<string, Side>;
  at: number;
}

export interface Selections {
  items: ShopItem[];
  compare: string[];
  /** Flipped into the comparison without being set aside. */
  compareExtras: ShopItem[];
  run: RunState;
  /** The finish a shopper last chose for each piece. */
  finishes: Record<string, string>;
}

export const EMPTY_SELECTIONS: Selections = { items: [], compare: [], compareExtras: [], run: { picks: {}, at: 0 }, finishes: {} };

const ITEM_DEFAULTS: Omit<ShopItem, 'slug' | 'name' | 'price'> = {
  category: null,
  image: null,
  builderId: null,
  builder: null,
  state: null,
  builderHref: null,
  leadTime: null,
  leadWeeksMax: null,
  top: null,
  front: null,
  style: null,
  facing: null,
  hoverImage: null,
  finishes: 0,
  dimensions: null,
  safetyFeatures: [],
  buildFeatures: [],
  safetyOnFile: false,
  uses: [],
  usesNote: null,
  converts: null,
  buildStatement: null,
  safetyStatement: null,
  finishImages: [],
  priceVaries: false,
  registry: null,
};

/*
 * A saved row is a snapshot from whenever it was set aside, so it can predate
 * fields added since. Repair it here so components can trust the shape: a
 * returning shopper's old data must never be able to take the page down.
 */
function normalizeItem(value: unknown): ShopItem | null {
  if (!value || typeof value !== 'object') return null;
  const row = value as Partial<ShopItem>;
  if (typeof row.slug !== 'string' || typeof row.name !== 'string' || typeof row.price !== 'number') return null;
  const item: ShopItem = { ...ITEM_DEFAULTS, ...row, slug: row.slug, name: row.name, price: row.price };
  return {
    ...item,
    safetyFeatures: Array.isArray(item.safetyFeatures) ? item.safetyFeatures : [],
    buildFeatures: Array.isArray(item.buildFeatures) ? item.buildFeatures : [],
    uses: Array.isArray(item.uses) ? item.uses : [],
    finishImages: Array.isArray(item.finishImages) ? item.finishImages : [],
  };
}

const normalizeItems = (value: unknown[]): ShopItem[] =>
  value.flatMap(row => {
    const item = normalizeItem(row);
    return item ? [item] : [];
  });

function parseRun(value: unknown): RunState {
  if (!value || typeof value !== 'object') return EMPTY_SELECTIONS.run;
  const run = value as Partial<RunState>;
  const picks: Record<string, Side> = {};
  // Runs saved by an earlier design used left and right, and cannot be replayed.
  for (const [id, side] of Object.entries(run.picks ?? {})) {
    if (side === 'a' || side === 'b' || side === 'skip') picks[id] = side;
  }
  return { picks, at: Object.keys(picks).length > 0 && typeof run.at === 'number' ? run.at : 0 };
}

function parseFinishes(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object') return {};
  return Object.fromEntries(Object.entries(value).filter((e): e is [string, string] => typeof e[1] === 'string'));
}

/** Turns whatever is in storage into a state that is safe to render. */
export function parseSelections(raw: string | null): Selections {
  try {
    const parsed = raw ? (JSON.parse(raw) as Partial<Selections>) : null;
    if (!parsed || !Array.isArray(parsed.items) || !Array.isArray(parsed.compare)) return EMPTY_SELECTIONS;
    const items = normalizeItems(parsed.items);
    const compareExtras = Array.isArray(parsed.compareExtras) ? normalizeItems(parsed.compareExtras) : [];
    const known = new Set([...items, ...compareExtras].map(i => i.slug));
    return {
      items,
      compare: parsed.compare.filter((slug): slug is string => typeof slug === 'string' && known.has(slug)),
      compareExtras,
      run: parseRun(parsed.run),
      finishes: parseFinishes(parsed.finishes),
    };
  } catch {
    return EMPTY_SELECTIONS;
  }
}
