import type { ShopItem } from '@/lib/shop';

export const PRICE_BANDS = [
  { id: 'under-1500', label: 'Under $1,500', min: 0, max: 1500 },
  { id: '1500-2500', label: '$1,500 to $2,500', min: 1500, max: 2500 },
  { id: 'over-2500', label: '$2,500 and up', min: 2500, max: Infinity },
] as const;

export type BandId = (typeof PRICE_BANDS)[number]['id'];

export interface Filters {
  type: string | null;
  builder: string | null;
  top: 'Arched' | 'Flat' | null;
  front: 'Slatted' | 'Panel' | null;
  band: BandId | null;
  maxWeeks: number | null;
  safetyOnFile: boolean;
}

export const EMPTY_FILTERS: Filters = {
  type: null,
  builder: null,
  top: null,
  front: null,
  band: null,
  maxWeeks: null,
  safetyOnFile: false,
};

export function applyFilters(items: ShopItem[], f: Filters): ShopItem[] {
  const band = PRICE_BANDS.find(b => b.id === f.band);
  return items.filter(
    i =>
      (!f.type || i.category === f.type) &&
      (!f.builder || i.builder === f.builder) &&
      (!f.top || i.top === f.top) &&
      (!f.front || i.front === f.front) &&
      (!band || (i.price >= band.min && i.price < band.max)) &&
      (f.maxWeeks === null || (i.leadWeeksMax !== null && i.leadWeeksMax <= f.maxWeeks)) &&
      (!f.safetyOnFile || i.safetyOnFile),
  );
}
