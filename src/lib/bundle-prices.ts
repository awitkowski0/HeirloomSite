import bundlePrices from '@/data/bundle-prices.json';
import type { BundlePriceLookup } from './cart-pricing';

const table = bundlePrices as Record<string, string[]>;

/** The catalogue's answer to "does this parent sell this kit at a bundle price?". */
export const hasBundlePrice: BundlePriceLookup = (parent, kit) => table[parent]?.includes(kit) ?? false;
