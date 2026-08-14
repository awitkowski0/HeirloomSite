import 'server-only';
import type { InventoryItem } from '@/types';
import type { GalleryFinish, GalleryProduct } from '@/components/gallery/types';

/**
 * Flatten inventory rows into one finish list per product.
 *
 * Handles both encodings the catalogue uses without the caller caring which is
 * which: a `wood` product contributes its stains under a single variant, a
 * `finish` product contributes one entry per variant. See the note on
 * GalleryFinish for why those are the same thing to a customer.
 *
 * Deduped on the visible finish name, because a product can reach the same
 * finish twice - "Natural" appears both as a Brown Maple stain and as a
 * painted finish - and two identical pills would filter identically.
 */
export function buildGalleryProducts(items: InventoryItem[]): GalleryProduct[] {
  const byName = new Map<string, GalleryProduct>();

  for (const item of items) {
    if (!item.slug) continue;

    const product =
      byName.get(item.productName) ??
      ({ slug: item.slug, name: item.productName, minPrice: item.basePrice, finishes: [] } as GalleryProduct);

    if (item.basePrice < product.minPrice) product.minPrice = item.basePrice;

    for (const stain of item.stains) {
      const finish: GalleryFinish = {
        name: stain.name,
        variant: item.wood,
        stainName: stain.name,
        image: stain.image ?? undefined,
        price: item.basePrice + (stain.priceAddition || 0),
        inStock: stain.inStock,
      };
      if (!product.finishes.some(f => f.name === finish.name)) product.finishes.push(finish);
    }

    byName.set(item.productName, product);
  }

  for (const product of byName.values()) {
    product.finishes.sort((a, b) => a.name.localeCompare(b.name));
  }

  return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
}
