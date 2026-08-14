/**
 * Category slugs for /products/[category].
 *
 * Slug -> name resolution always goes through a map built from real data
 * (see getCategoryBySlug in ./content), never through an inverse transform:
 * this function is lossy by design ("Guard Rails & Conversions" and
 * "Guard Rails and Conversions" collapse to the same slug), so inverting it
 * would be guesswork.
 */
export function categoryToSlug(category: string): string {
  return category
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export interface CategorySummary {
  name: string;
  slug: string;
  count: number;
}

/**
 * The order categories appear in the header bar.
 *
 * Not alphabetical, and deliberately not by product count either. Counting
 * SKUs puts Guard Rails & Conversions third - ten variations on a rail kit -
 * ahead of Nightstands and Chests, which is an accurate description of the
 * catalogue and a poor description of what anyone is shopping for. Someone
 * furnishing a nursery wants the furniture first and the parts afterwards.
 *
 * A category absent from this list is not dropped; it sorts to the end,
 * alphabetically, so adding one to the catalogue without touching this file
 * still shows it. Count breaks no ties here because the order is explicit.
 */
const CATEGORY_ORDER = [
  // The furniture you actually furnish a room with.
  'Cribs',
  'Dressers',
  'Nightstands',
  'Chests',
  'Changing Tables',
  // Then the parts and the extras.
  'Guard Rails & Conversions',
  'Accessories',
  'Area Rugs',
  'Lamps',
];

const ORDER_INDEX = new Map(CATEGORY_ORDER.map((name, i) => [name, i]));

/** Sorts a copy into merchandising order, leaving the input untouched. */
export function sortCategories<T extends { name: string }>(categories: readonly T[]): T[] {
  return [...categories].sort((a, b) => {
    const ai = ORDER_INDEX.get(a.name) ?? Number.MAX_SAFE_INTEGER;
    const bi = ORDER_INDEX.get(b.name) ?? Number.MAX_SAFE_INTEGER;
    return ai === bi ? a.name.localeCompare(b.name) : ai - bi;
  });
}
