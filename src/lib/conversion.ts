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
 * The Mini Newport lists the Twin Bed Conversion kit (OTO-1380B) as an
 * optional, sold-separately add-on, so it is convertible in this sense. It
 * is a 2-stage path (crib, then single/twin bed), not a 4-in-1, and it has
 * no daybed stage. Rendering of that case lives in mini-newport-conversion.ts.
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
