import { builderForProduct, featuresFor, safetyAnswerFor } from '@/lib/builders';
import { getInventory, type ProductIndexItem } from '@/lib/content';

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
  finishes: number;
  dimensions: string | null;
  safetyFeatures: string[];
  buildFeatures: string[];
  safetyOnFile: boolean;
}

type Look = readonly [NonNullable<ShopItem['top']>, NonNullable<ShopItem['front']>];

/* Read off each crib's catalogue photograph. tests/builders.test.ts requires every crib here. */
export const CRIB_LOOKS: Readonly<Record<string, Look>> = {
  'addison-crib': ['Arched', 'Slatted'],
  'addison-crib-with-raised-panel-headboard': ['Arched', 'Panel'],
  'arched-top': ['Arched', 'Slatted'],
  bloomington: ['Flat', 'Panel'],
  darlington: ['Flat', 'Panel'],
  'french-country-crib-panel-style-front': ['Arched', 'Panel'],
  'french-country-crib-slat-style-front': ['Arched', 'Slatted'],
  hudson: ['Flat', 'Slatted'],
  'mackenzie-crib-panel-back': ['Flat', 'Panel'],
  'mackenzie-crib-slat-back': ['Flat', 'Slatted'],
  'mini-newport-with-mattress': ['Flat', 'Slatted'],
  mission: ['Flat', 'Slatted'],
  moyerton: ['Arched', 'Panel'],
  'newport-crib': ['Flat', 'Slatted'],
  princeton: ['Flat', 'Slatted'],
  'west-lake-crib': ['Flat', 'Slatted'],
};

export function toShopItems(products: ProductIndexItem[]): ShopItem[] {
  const inventory = getInventory();
  return products.map(p => {
    const rows = inventory.filter(i => i.slug === p.slug);
    const builder = builderForProduct(p);
    const features = builder ? featuresFor(builder, p.category) : { safety: [], build: [] };
    const look = CRIB_LOOKS[p.slug];
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
      top: look?.[0] ?? null,
      front: look?.[1] ?? null,
      // A finish-variant product has one row per finish; a wood-variant one lists stains on the row.
      finishes: Math.max(rows[0]?.variantType === 'finish' ? rows.length : 0, ...rows.map(r => r.stains?.length ?? 0)),
      dimensions: rows.find(r => r.dimensions)?.dimensions ?? null,
      safetyFeatures: features.safety,
      buildFeatures: features.build,
      safetyOnFile: builder ? safetyAnswerFor(builder, p.category).kind === 'statement' : false,
    };
  });
}
