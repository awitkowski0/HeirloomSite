/**
 * What each cart line will actually be CHARGED, computed in the browser.
 *
 * Why this exists: a conversion rail ticked under a Fisher crib is stored with
 * the crib's bundle price ($250) and a `bundledWith` reference. The server
 * (src/lib/pricing.ts priceLines) only honours that price while the parent
 * crib is a plain line in the SAME cart with at least as many units; otherwise
 * it charges the rail's own catalogue price ($109 / $481). The cart and the
 * checkout summary used to show the stored $250 regardless, so removing the
 * crib, or raising the rail quantity past the crib's, made the summary and the
 * invoice disagree - the "charged $109/$481 instead of the add-on price" gap.
 *
 * This mirrors the server's rule exactly (same parent key, same unit counting,
 * same all-or-nothing per line, same line order), so the number on screen is
 * the number on the invoice. tests/fqp-pricing.test.ts runs both over the same
 * carts and asserts they agree.
 *
 * Pure and dependency-free so it can run in the cart context, the checkout and
 * the node test runner alike.
 */

export interface PricedCartLineInput {
  productName: string;
  wood: string;
  quantity: number;
  /** The price stored when the line was added (the bundle price, if bundled). */
  price: number;
  /** The item's own price, stored alongside a bundle price. */
  listPrice?: number;
  bundledWith?: { productName: string; wood: string };
}

/** Whether `parent` has a bundle price for `kit` (from src/data/bundle-prices.json). */
export type BundlePriceLookup = (parentProductName: string, kitProductName: string) => boolean;

const SEP = String.fromCharCode(0);
const keyOf = (productName: string, wood: string) => `${productName}${SEP}${wood}`;

/**
 * Whether each line gets its bundle price, by the server's rule. Lines without
 * `bundledWith` are always `false` (they are charged their own price anyway).
 */
export function bundleEligibility(
  lines: readonly PricedCartLineInput[],
  hasBundlePrice?: BundlePriceLookup
): boolean[] {
  const parentUnits = new Map<string, number>();
  for (const l of lines) {
    if (l.bundledWith) continue;
    const k = keyOf(l.productName, l.wood);
    parentUnits.set(k, (parentUnits.get(k) ?? 0) + l.quantity);
  }
  const used = new Map<string, number>();
  return lines.map(l => {
    if (!l.bundledWith) return false;
    // The server only honours the price if the parent's catalogue row lists an
    // override for this kit; without the lookup (tests, no catalogue) assume it does.
    if (hasBundlePrice && !hasBundlePrice(l.bundledWith.productName, l.productName)) return false;
    const parentKey = keyOf(l.bundledWith.productName, l.bundledWith.wood);
    const usedKey = `${parentKey}${SEP}${l.productName}`;
    const u = used.get(usedKey) ?? 0;
    if (u + l.quantity > (parentUnits.get(parentKey) ?? 0)) return false;
    used.set(usedKey, u + l.quantity);
    return true;
  });
}

/** The unit price each line will be charged, in dollars. */
export function chargedUnitPrices(
  lines: readonly PricedCartLineInput[],
  hasBundlePrice?: BundlePriceLookup
): number[] {
  const eligible = bundleEligibility(lines, hasBundlePrice);
  return lines.map((l, i) =>
    l.bundledWith && !eligible[i] && typeof l.listPrice === 'number' ? l.listPrice : l.price
  );
}

/** The cart subtotal as it will be charged, in integer cents. */
export function chargedSubtotalCents(
  lines: readonly PricedCartLineInput[],
  hasBundlePrice?: BundlePriceLookup
): number {
  const unit = chargedUnitPrices(lines, hasBundlePrice);
  return lines.reduce((sum, l, i) => sum + Math.round(unit[i] * 100) * l.quantity, 0);
}
