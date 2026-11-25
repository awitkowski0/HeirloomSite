/*
 * Muse MU4 / Brand C (Pricing App #65 comment 6949790350) product fact-block
 * lines. Static sentences are verbatim. Field rules fill Builder, lead time,
 * wood, finishes and conversion kits from product data — never by hand.
 */
import type { InventoryItem, VariantType } from '@/types';
import { itemMaterial } from '@/lib/merchant-feed';
import { stainLabel } from '@/lib/labels';
import { builderBrand, skuBuilderCode } from '@/lib/seo';

export type FactLine = { label: string; text: string };

/** Brand C section 5 static lines (6949790350). */
export const FACT_MADE_TO_ORDER =
  'built after you order, in the wood and finish you picked.';
export const FACT_LEAD_TIME_OTO = 'about 6 to 8 weeks, confirmed when you order.';
export const FACT_LEAD_TIME_FQP = '10 to 14 weeks, confirmed when you order.';
export const FACT_CONVERSION_KITS = 'listed on this page. You can add them to your order.';
export const FACT_DELIVERY =
  'Pennsylvania, New Jersey and Maryland. Delivery to some Newark, NJ ZIP codes is quoted individually.';
export const FACT_SHIPPING =
  'charged on every order, based on your cart subtotal. Curbside from $175 or White Glove from $299. White Glove is the only service that includes assembly.';
export const FACT_ORDERING =
  'nothing is charged when you place your order. We call to confirm the details, then send a Stripe invoice for a 50% deposit. The build starts when the deposit is in.';
export const FACT_RETURNS =
  'made-to-order case goods cannot be returned, exchanged or refunded. You can cancel at no cost before your deposit is paid. After the deposit is received, the order cannot be cancelled and the deposit is non-refundable.';

const CRIB_CATEGORIES = new Set(['Cribs', 'Mini Cribs']);

/** House-style list join used in the signed Brand C finishes example (no comma before "and"). */
export function listWithAnd(items: string[]): string {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

export function hasFinishPicker(variantType: VariantType | null | undefined): boolean {
  return variantType === 'wood' || variantType === 'finish';
}

export function isCribCategory(category: string | null | undefined): boolean {
  return category != null && CRIB_CATEGORIES.has(category);
}

/** Stain names shown on this product's page, in catalogue order. Null when there is no finish picker. */
export function finishesForFactBlock(
  variantType: VariantType,
  configurations: InventoryItem[],
): string[] | null {
  if (!hasFinishPicker(variantType)) return null;
  const names: string[] = [];
  const seen = new Set<string>();
  for (const config of configurations) {
    for (const stain of config.stains ?? []) {
      const label = stainLabel(stain.name) || stain.name;
      if (!label || seen.has(label)) continue;
      seen.add(label);
      names.push(label);
    }
  }
  return names.length > 0 ? names : null;
}

export function productFactLines(
  product: { configurations: InventoryItem[] },
  config: InventoryItem,
): FactLine[] {
  const variantType = config.variantType ?? product.configurations[0]?.variantType ?? 'none';
  const lines: FactLine[] = [{ label: 'Made to order', text: FACT_MADE_TO_ORDER }];

  const brand = builderBrand(config.sku);
  if (brand) lines.push({ label: 'Builder', text: brand });

  const code = skuBuilderCode(config.sku);
  if (code === 'OTO') lines.push({ label: 'Lead time', text: FACT_LEAD_TIME_OTO });
  else if (code === 'FQP') lines.push({ label: 'Lead time', text: FACT_LEAD_TIME_FQP });

  const material = itemMaterial(config);
  if (material) lines.push({ label: 'Wood', text: material });

  const finishes = finishesForFactBlock(variantType, product.configurations);
  if (finishes) {
    lines.push({ label: 'Finishes on our site', text: `${listWithAnd(finishes)}.` });
  }

  if (isCribCategory(config.category)) {
    lines.push({ label: 'Conversion kits', text: FACT_CONVERSION_KITS });
  }

  lines.push(
    { label: 'Delivery', text: FACT_DELIVERY },
    { label: 'Shipping', text: FACT_SHIPPING },
    { label: 'Ordering', text: FACT_ORDERING },
    { label: 'Returns', text: FACT_RETURNS },
  );
  return lines;
}

export function formatFactLine(line: FactLine): string {
  return `${line.label}: ${line.text}`;
}
