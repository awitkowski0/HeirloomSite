import { builderForProduct, featuresFor, safetyAnswerFor } from '@/lib/builders';
import { getInventory, type ProductIndexItem } from '@/lib/content';
import { CRIB_STYLES, type CribStyleId } from '@/lib/crib-styles';

/*
 * One flat, serialisable row per product for the shop browser, built on the
 * server at prerender so the client filters data it already has.
 */
export interface ShopItem {
  slug: string;
  name: string;
  category: string | null;
  price: number;
  image: string | null;
  builderId: string | null;
  builder: string | null;
  state: string | null;
  builderHref: string | null;
  leadTime: string | null;
  leadWeeksMax: number | null;
  top: 'Arched' | 'Flat' | null;
  front: 'Slatted' | 'Panel' | null;
  style: CribStyleId | null;
  finishes: number;
  dimensions: string | null;
  safetyFeatures: string[];
  buildFeatures: string[];
  safetyOnFile: boolean;
}

export function toShopItems(products: ProductIndexItem[]): ShopItem[] {
  const inventory = getInventory();
  return products.map(p => {
    const rows = inventory.filter(i => i.slug === p.slug);
    const builder = builderForProduct(p);
    const features = builder ? featuresFor(builder, p.category) : { safety: [], build: [] };
    const style = CRIB_STYLES.find(s => s.id === p.style);
    return {
      slug: p.slug,
      name: p.productName,
      category: p.category,
      price: p.minPrice,
      image: p.defaultImage,
      builderId: builder?.id ?? null,
      builder: builder?.name ?? null,
      state: builder ? builder.based.split(', ')[1] : null,
      builderHref: builder?.href ?? null,
      leadTime: builder?.leadTime ?? null,
      leadWeeksMax: builder?.leadWeeksMax ?? null,
      top: style?.top ?? null,
      front: style?.front ?? null,
      style: style?.id ?? null,
      // A finish-variant product has one row per finish; a wood-variant one lists stains on the row.
      finishes: Math.max(rows[0]?.variantType === 'finish' ? rows.length : 0, ...rows.map(r => r.stains?.length ?? 0)),
      dimensions: rows.find(r => r.dimensions)?.dimensions ?? null,
      safetyFeatures: features.safety,
      buildFeatures: features.build,
      safetyOnFile: builder ? safetyAnswerFor(builder, p.category).kind === 'statement' : false,
    };
  });
}
