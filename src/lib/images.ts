import type { InventoryItem, Stain } from '@/types';

/**
 * The representative image for a product configuration: prefer a stain with no
 * price addition (the "base" look) so listing grids do not advertise an upcharge
 * finish, then fall back to whatever exists.
 *
 * Previously duplicated as a local getDefaultImage in both Products.tsx and
 * Gallery.tsx.
 */
export function pickDefaultImage(stains: Stain[] | undefined): string {
  if (!stains || stains.length === 0) return '';
  const base = stains.find(s => Number(s.priceAddition) === 0 && s.image);
  if (base?.image) return base.image;
  return stains.find(s => s.image)?.image || '';
}

/** Every distinct image for a product, base image first, deduplicated. */
export function galleryImagesFor(configurations: InventoryItem[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const config of configurations) {
    for (const stain of config.stains) {
      if (stain.image && !seen.has(stain.image)) {
        seen.add(stain.image);
        out.push(stain.image);
      }
      for (const g of stain.gallery ?? []) {
        if (g.url && !seen.has(g.url)) {
          seen.add(g.url);
          out.push(g.url);
        }
      }
    }
  }
  return out;
}

/**
 * Product image paths are stored pre-encoded (spaces as %20) because
 * build-data.mjs encodes the directory name. next/image re-encodes when
 * building its /_next/image?url=... query, which round-trips correctly
 * (verified against both %20 and raw-space forms in dev and production).
 */
export const PRODUCT_IMAGE_SIZES =
  '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw';
