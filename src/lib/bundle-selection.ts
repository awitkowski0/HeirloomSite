import { formatPrice } from './format';

/**
 * Add-on rows start unchecked (Pricing App #59 cause 4) so the main button
 * shows the listed product price until the shopper selects add-ons.
 */
export function initialBundleSelectedSlugs(): Set<string> {
  return new Set();
}

export function addToCartButtonLabel(opts: {
  stainSelected: boolean;
  listedPrice: number;
  selectedAddOnCount: number;
  cartTotal: number;
}): string {
  if (!opts.stainSelected) return 'OUT OF STOCK';
  if (opts.selectedAddOnCount > 0) {
    return `ADD ${opts.selectedAddOnCount + 1} ITEMS — ${formatPrice(opts.cartTotal)}`;
  }
  return `ADD TO CART — ${formatPrice(opts.listedPrice)}`;
}
