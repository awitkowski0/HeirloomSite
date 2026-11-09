import 'server-only';

import { builderForProduct } from '@/lib/builders';
import { getInventory, getProductIndex } from '@/lib/content';
import { CRIB_STYLES } from '@/lib/crib-styles';
import { isUnlistedCategory } from '@/lib/taxonomy';
import type { InventoryItem } from '@/types';
import { NON_FINISH_NAMES, pieceTypeOf, type InterestCatalogItem } from './catalog';

function finishNames(rows: InventoryItem[]): string[] {
  const names = new Set<string>();
  for (const row of rows) {
    if (row.variantType === 'finish') names.add(row.wood);
    for (const stain of row.stains ?? []) names.add(stain.name);
  }
  return [...names].filter(n => n && !NON_FINISH_NAMES.includes(n.toLowerCase())).sort();
}

/**
 * One row per product for the profile, at prerender. Read once by a Server
 * Component and passed down, so no page reads it in the browser.
 */
export function getInterestCatalog(): InterestCatalogItem[] {
  const inventory = getInventory();
  const styleLabels = new Map<string, string>(CRIB_STYLES.map(s => [s.id, s.label]));
  return getProductIndex().map(product => {
    const builder = builderForProduct(product);
    return {
      slug: product.slug,
      name: product.productName,
      category: product.category,
      pieceType: pieceTypeOf(product.category).id,
      price: product.minPrice,
      builderId: builder?.id ?? null,
      builderName: builder?.name ?? null,
      style: product.style ?? null,
      styleLabel: product.style ? (styleLabels.get(product.style) ?? null) : null,
      finishes: finishNames(inventory.filter(row => row.slug === product.slug)),
      listed: !isUnlistedCategory(product.category),
    };
  });
}
