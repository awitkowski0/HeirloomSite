import type { RelatedProduct } from '@/types';

/**
 * Whether a product page should show the conversion assurances
 * ("Built to convert as they grow").
 *
 * Decided only from the catalogue's own conversion data: a product is
 * convertible when its `bundle` or `includes` lists at least one conversion
 * piece (a rail kit, toddler bed, or guard rail). Description text and
 * product handles are not consulted.
 *
 * The Mini Newport has no bundle and no includes. The catalogue records a
 * Twin Bed Conversion (OTO-1380B) with no price in the builder book, on 8808,
 * or on the site, so that SKU is not in inventory and does not make this
 * mini crib convertible.
 */

const ACCESSORY_CONVERSION_SLUGS = new Set([
  // Shared kits the catalogue files under Accessories, not
  // "Guard Rails & Conversions" (Fisher cribs, and the generic OTO kits).
  'toddler-conversion-rail',
  'full-bed-rail-kit',
  'guard-rail',
]);

export type ConversionRef = Pick<RelatedProduct, 'slug' | 'productName' | 'category'>;

export function isConversionPiece(item: ConversionRef): boolean {
  if (item.category === 'Guard Rails & Conversions') return true;
  return ACCESSORY_CONVERSION_SLUGS.has(item.slug);
}

export interface ConversionCatalogFields {
  bundle?: readonly ConversionRef[] | null;
  includes?: readonly ConversionRef[] | null;
}

export function isConvertibleProduct(
  product: ConversionCatalogFields | null | undefined
): boolean {
  if (!product) return false;
  const pieces = [...(product.includes ?? []), ...(product.bundle ?? [])];
  return pieces.some(isConversionPiece);
}
