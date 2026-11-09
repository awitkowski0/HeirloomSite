import { toneOf, type Tone } from '@/lib/finish-tones';

/*
 * The catalogue facts the profile reasons over. Plain data, built on the server
 * by getInterestCatalog() and handed to the browser as a prop.
 *
 * Prices here are for working out a browsing range only. What an order costs
 * is src/lib/pricing.ts and nothing else.
 */

/* One measured table of tones, so the profile and the shop filters always agree. */
export type FinishFamily = Tone;

export interface InterestCatalogItem {
  slug: string;
  name: string;
  category: string | null;
  pieceType: string;
  /** Dollars. */
  price: number;
  builderId: string | null;
  builderName: string | null;
  style: string | null;
  styleLabel: string | null;
  finishes: readonly string[];
  /** False for conversion kits and the like, which are never suggested. */
  listed: boolean;
}

/** A name that is a variant placeholder, not a colour anyone chose. */
export const NON_FINISH_NAMES: readonly string[] = ['default'];

export function finishFamily(name: string | null | undefined): FinishFamily | null {
  return name ? toneOf(name) : null;
}

export const FINISH_FAMILY_LABELS: Record<FinishFamily, string> = {
  light: 'light finishes',
  mid: 'mid-tone finishes',
  dark: 'dark finishes',
};

const PIECE_TYPES: Record<string, { id: string; label: string }> = {
  Cribs: { id: 'crib', label: 'cribs' },
  'Mini Cribs': { id: 'crib', label: 'cribs' },
  Dressers: { id: 'dresser', label: 'dressers' },
  Chests: { id: 'chest', label: 'chests' },
  Nightstands: { id: 'nightstand', label: 'nightstands' },
  'Changing Tables': { id: 'changing-table', label: 'changing tables' },
  'Guard Rails & Conversions': { id: 'conversion', label: 'conversion kits' },
  Accessories: { id: 'accessory', label: 'accessories' },
};

export function pieceTypeOf(category: string | null | undefined): { id: string; label: string } {
  if (category && PIECE_TYPES[category]) return PIECE_TYPES[category];
  const label = (category ?? 'other pieces').toLowerCase();
  return { id: label.replace(/[^a-z0-9]+/g, '-'), label };
}

/** Pieces that furnish a room, as opposed to parts and add-ons for them. */
export const FURNITURE_TYPES = new Set(['crib', 'dresser', 'chest', 'nightstand', 'changing-table']);

export function pieceTypeLabel(id: string, catalog: readonly InterestCatalogItem[]): string {
  const known = Object.values(PIECE_TYPES).find(t => t.id === id);
  if (known) return known.label;
  const item = catalog.find(c => c.pieceType === id);
  return item ? pieceTypeOf(item.category).label : id;
}

export interface NurserySlotDef {
  id: string;
  label: string;
  /** Core slots are what "how complete" is measured against. */
  core: boolean;
  pieceTypes: readonly string[];
}

export const NURSERY_SLOTS: readonly NurserySlotDef[] = [
  { id: 'crib', label: 'crib', core: true, pieceTypes: ['crib'] },
  { id: 'storage', label: 'dresser or chest', core: true, pieceTypes: ['dresser', 'chest'] },
  { id: 'nightstand', label: 'nightstand', core: true, pieceTypes: ['nightstand'] },
  { id: 'changing', label: 'changing table', core: false, pieceTypes: ['changing-table'] },
];

export type NurserySlotState = 'held' | 'considering' | 'empty';

export interface NurserySlot {
  id: string;
  label: string;
  core: boolean;
  state: NurserySlotState;
  pieces: { slug: string; name: string }[];
}

export interface NurseryProgress {
  filled: number;
  total: number;
  percent: number;
  /** Labels of the core slots nothing is in yet. */
  missing: string[];
  slots: NurserySlot[];
}

/**
 * How much of the room has something in it.
 *
 * Takes plain slug lists and stores nothing, so the cart can call it with its
 * own contents for any visitor, consent or not: nothing here is a record of
 * browsing, only arithmetic on what they already chose to keep.
 */
export function nurseryProgress(
  heldSlugs: Iterable<string>,
  catalog: readonly InterestCatalogItem[],
  consideringSlugs: Iterable<string> = [],
): NurseryProgress {
  const bySlug = new Map(catalog.map(item => [item.slug, item]));
  const held = [...new Set(heldSlugs)].flatMap(s => bySlug.get(s) ?? []);
  const considering = [...new Set(consideringSlugs)].flatMap(s => bySlug.get(s) ?? []);

  const slots = NURSERY_SLOTS.map((def): NurserySlot => {
    const inSlot = (item: InterestCatalogItem) => def.pieceTypes.includes(item.pieceType);
    const heldHere = held.filter(inSlot);
    const consideringHere = considering.filter(inSlot);
    const pieces = heldHere.length ? heldHere : consideringHere;
    return {
      id: def.id,
      label: def.label,
      core: def.core,
      state: heldHere.length ? 'held' : consideringHere.length ? 'considering' : 'empty',
      pieces: pieces.map(p => ({ slug: p.slug, name: p.name })),
    };
  });

  const core = slots.filter(s => s.core);
  const filled = core.filter(s => s.state === 'held').length;
  return {
    filled,
    total: core.length,
    percent: Math.round((filled / core.length) * 100),
    missing: core.filter(s => s.state !== 'held').map(s => s.label),
    slots,
  };
}
