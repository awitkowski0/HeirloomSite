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
