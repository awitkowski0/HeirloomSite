import type { InventoryItem, ShowroomFeatured } from '@/types';

export interface ResolvedFeature {
  productName: string;
  slug: string;
  image: string | null;
  price: number;
  stainName: string;
  /** The configuration this resolved to, so callers can build a variant URL. */
  wood: string;
}

/**
 * Turn a curated showroom entry into something renderable.
 *
 * Extracted from FeaturedGrid when the homepage was rebuilt, so the new style
 * cards reuse this rather than reimplementing the stain-picking rule and
 * drifting from it. The rule: the requested stain if it is in stock, else the
 * first in-stock stain, else whatever exists.
 */
export function resolveFeature(
  item: ShowroomFeatured,
  byName: Map<string, InventoryItem>
): ResolvedFeature | null {
  const config = byName.get(item.productName);
  // A featured entry naming a product that no longer exists used to render a
  // red dashed "not found" tile to every visitor. Skip it instead - but SAY SO.
  //
  // Silence here cost the homepage its entire product section: the three style
  // cards named "Mission Style", "Hudson Style" and "Darlington Style" while
  // the catalogue calls them "Mission", "Hudson" and "Darlington", so all three
  // resolved to null, StyleCards saw an empty array and returned null, and the
  // page simply had no cribs on it. Nothing errored and nothing looked broken.
  // This runs at build time, so the warning lands in the build log.
  if (!config || !config.slug) {
    console.warn(
      `Featured product "${item.productName}" is not in the catalogue - the tile ` +
        'will be omitted. Check the name against public/data/inventory.json.'
    );
    return null;
  }

  const stain =
    config.stains.find(s => s.name === (item.stainName || 'Natural') && s.inStock) ||
    config.stains.find(s => s.inStock) ||
    config.stains[0];

  return {
    productName: config.productName,
    slug: config.slug,
    image: stain?.gallery?.[0]?.url || stain?.image || null,
    price: config.basePrice + (stain?.priceAddition || 0),
    stainName: stain?.name ?? '',
    wood: config.wood,
  };
}

/** First inventory row per product name, which is what resolveFeature keys on. */
export function indexByProductName(inventory: InventoryItem[]): Map<string, InventoryItem> {
  const byName = new Map<string, InventoryItem>();
  for (const item of inventory) {
    if (!byName.has(item.productName)) byName.set(item.productName, item);
  }
  return byName;
}
