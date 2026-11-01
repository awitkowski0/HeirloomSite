import 'server-only';
import type { InventoryItem } from '@/types';
import { MAX_QUANTITY_PER_LINE } from './cart-limits';
import { pickDefaultImage } from './images';
import {
  browsableInventory,
  feedItems,
  itemPriceDollars,
} from './merchant-feed';

/**
 * The Merchant Center account-level checkout template is
 * `https://heirloomcribsandmore.com/checkout/{id}:1`, where Google replaces
 * `{id}` with the product's feed id (g:id) and appends `:` + quantity. This
 * module turns that one path segment back into a real product.
 *
 * The id is the inventory SKU (merchant-feed.ts emits `g:id = item.sku`), so no
 * feed id contains a colon; the LAST colon, when followed by digits, is the
 * quantity separator. Ids DO contain spaces (e.g. "FQP 112 Madison Nightstand 2
 * Drawer"), which arrive percent-encoded and are decoded by the Next router
 * before this sees them.
 */

export interface CheckoutDeeplink {
  id: string;
  quantity: number;
}

/**
 * Split `"<id>:<qty>"` into the feed id and a sane quantity.
 *
 * Pure and total: any malformed tail degrades to quantity 1 rather than
 * throwing. Only a purely numeric tail after the final colon is treated as a
 * quantity; it is clamped to [1, MAX_QUANTITY_PER_LINE] (0, negatives via the
 * missing sign, and oversized values included). Everything else is part of the
 * id, so a genuinely unknown id still fails the lookup and 404s upstream.
 */
export function parseCheckoutDeeplink(raw: string): CheckoutDeeplink {
  const s = raw ?? '';
  const idx = s.lastIndexOf(':');
  if (idx > 0) {
    const tail = s.slice(idx + 1);
    if (/^\d+$/.test(tail)) {
      const q = Number.parseInt(tail, 10);
      const quantity = Math.min(Math.max(q, 1), MAX_QUANTITY_PER_LINE);
      return { id: s.slice(0, idx), quantity };
    }
  }
  return { id: s, quantity: 1 };
}

export interface CheckoutDeeplinkProduct {
  /** The feed id (SKU). */
  id: string;
  productName: string;
  wood: string;
  stainName: string;
  /** Dollars, equal to the feed g:price (no bundle add-ons). */
  priceDollars: number;
  /** Relative image path, already percent-encoded for the filename. */
  image: string;
  /** Canonical product page, for a "view full product" link. */
  slug: string | null;
}

let byId: Map<string, InventoryItem> | null = null;

/**
 * The same item set the Google feed emits, keyed by feed id (SKU). Built once:
 * the catalogue is fixed for the life of a deployment and the page that reads
 * this renders per request.
 */
function feedInventoryById(): Map<string, InventoryItem> {
  if (byId) return byId;
  const map = new Map<string, InventoryItem>();
  for (const item of feedItems(browsableInventory())) {
    if (item.sku) map.set(item.sku, item);
  }
  byId = map;
  return map;
}

/**
 * The product a feed id resolves to, or null if the id is not in the feed.
 *
 * Price and image come from the same server-side catalogue the feed reads, so
 * the URL can never set the price. The stain chosen is the one the feed prices
 * and pictures: the first in-stock stain (every feed stain has priceAddition
 * 0, so this equals g:price).
 */
export function checkoutProductForFeedId(id: string): CheckoutDeeplinkProduct | null {
  const item = feedInventoryById().get(id);
  if (!item) return null;
  const stain = item.stains.find(s => s.inStock !== false) ?? item.stains[0];
  return {
    id,
    productName: item.productName,
    wood: item.wood,
    stainName: stain?.name ?? 'Default',
    priceDollars: itemPriceDollars(item),
    image: pickDefaultImage(item.stains),
    slug: item.slug ?? null,
  };
}

/** Every feed id that resolves to a deep link (the feed's own id set). */
export function allFeedIds(): string[] {
  return [...feedInventoryById().keys()];
}
