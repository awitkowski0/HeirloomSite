import 'server-only';
import { getBrowsableProducts, type ProductIndexItem } from './content';

/**
 * Collections: the second axis across the catalogue.
 *
 * A category answers "what is this piece". A collection answers "what matches
 * my crib" - the Addison crib, dresser, nightstand and chest are one range in
 * one design language, and someone furnishing a nursery shops that way at least
 * as often as they shop by piece type.
 *
 * Derived from the catalogue rather than declared, unlike src/lib/taxonomy.ts.
 * The reasoning is opposite in the two cases and deliberately so: a category
 * has to exist before it has stock, because the shop wants to announce a range
 * it is building toward. A collection only means anything once there are
 * pieces in it, so there is nothing to declare in advance.
 *
 * Ordered by size. The biggest range is the one most likely to have the piece
 * someone is looking for, and unlike categories there is no merchandising
 * argument for any other order.
 */

export interface CollectionSummary {
  name: string;
  slug: string;
  count: number;
}

export function collectionToSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function getCollections(): CollectionSummary[] {
  const counts = new Map<string, number>();
  for (const p of getBrowsableProducts()) {
    if (p.collection) counts.set(p.collection, (counts.get(p.collection) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, slug: collectionToSlug(name), count }))
    .sort((a, b) => (b.count - a.count) || a.name.localeCompare(b.name));
}

export function getCollectionBySlug(slug: string): CollectionSummary | null {
  return getCollections().find(c => c.slug === slug) ?? null;
}

/**
 * The pieces in a range.
 *
 * Browsable products only, so a collection page lists the crib, the dresser and
 * the nightstand without also listing that range's three conversion rail kits -
 * which are bundle items on the crib's own page, not things to shop for.
 */
export function getProductsInCollection(name: string): ProductIndexItem[] {
  return getBrowsableProducts().filter(p => p.collection === name);
}
