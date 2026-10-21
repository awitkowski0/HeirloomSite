export interface StainGalleryItem {
  id?: string;
  url: string;
  originalName?: string;
}

export interface Stain {
  name: string;
  inStock: boolean;
  priceAddition: number;
  image?: string;
  gallery?: StainGalleryItem[];
}

/** A product referenced by another product's `bundle` or `related`. */
export interface RelatedProduct {
  slug: string;
  productName: string;
  /** Lowest price across the target's variants, in dollars, as elsewhere in the catalogue. */
  price: number;
  image: string | null;
  category: string | null;
  /*
   * The single configuration this product has, or null when it has real
   * choices. A cart line needs product + variant + stain, so only a target
   * with exactly one of each can be added by a checkbox; build-data.mjs
   * rejects any `bundle` entry where this would be null.
   */
  wood: string | null;
  stainName: string | null;
  /** True when `price` is this parent's bundlePriceOverrides price, not the item's own. */
  bundleOverride?: boolean;
  /** The item's own price when `price` is a bundle override. */
  listPrice?: number;
  /** Not part of the package (product.json bundleOptional - the OTO guard rails). */
  optional?: boolean;
  /** The pick-list checkbox starts unticked (product.json bundleUnchecked - the OTO full guard rail). */
  startsUnchecked?: boolean;
}

export interface Addon {
  name: string;
  description: string | null;
  price: number;
  priceStained: number;
  image: string | null;
  category: string | null;
  stainable: boolean;
}

/**
 * What the `wood` field actually means for a product.
 *
 * One field carries four different things across the catalogue - a wood species,
 * a rug size, a paint/stain finish, or nothing at all ("Default Title", a
 * Shopify export artifact). This used to be guessed at render time by sniffing
 * the string for quote marks; it is now declared in product.json and validated
 * against the data by scripts/build-data.mjs.
 */
export type VariantType = 'wood' | 'size' | 'finish' | 'none';

export interface InventoryItem {
  productName: string;
  wood: string;
  category: string | null;
  /** The range this piece belongs to (Addison, West Lake...), or null. */
  collection: string | null;
  variantType: VariantType;
  description: string | null;
  extendedDescription: string | null;
  title: string | null;
  metaDescription: string | null;
  basePrice: number;
  tags: string[];
  sku: string | null;
  slug: string | null;
  dimensions: string | null;
  weight: number | null;
  addons: Addon[];
  /*
   * Other products this one relates to, resolved from slugs at build time by
   * scripts/build-data.mjs.
   *
   * `includes` is what already ships with the crib and is already inside its
   * price - the conversion rails and the guard rail. Shown so a buyer can see
   * what the 4-in-1 claim consists of, and never added to the cart: those are
   * not being sold a second time.
   *
   * `bundle` is the genuinely optional paid add-on - for a crib, the mattress.
   * Each entry is a real product with its own page and price, so ticking one
   * adds its own cart line rather than inflating the crib's; that keeps
   * src/lib/pricing.ts authoritative with no new pricing concept, and makes an
   * invoice itemise correctly.
   *
   * `related` is the rest of the matching family - the dressers, nightstands
   * and chests that complete the nursery.
   *
   * Empty for any product that declares neither.
   */
  includes: RelatedProduct[];
  bundle: RelatedProduct[];
  related: RelatedProduct[];
  stains: Stain[];
}

export interface ImageRecord {
  productName: string;
  wood: string;
  stainName: string | null;
  path: string;
  order?: number;
  altText?: string | null;
  source?: string | null;
}

export interface ShowroomSlide {
  image: string;
  imageMobile?: string;
  productId?: string;
}

export interface ShowroomFeatured {
  productName: string;
  stainName?: string;
}

export interface ShowroomData {
  slides: ShowroomSlide[];
  featured: ShowroomFeatured[];
}

export interface StainType {
  name: string;
  color: string | null;
  defaultPriceAddition: number;
}

export interface AppSettings {
  paymentProvider: string;
}

export interface CartAddon {
  name: string;
  price: number;
  stainName?: string;
}

/**
 * Something that ships with a cart line and is already inside its price.
 *
 * DISPLAY ONLY, and that is a load-bearing restriction. src/lib/pricing.ts
 * re-prices every line the browser sends from the catalogue, so a rail kit
 * that reached the server as a cart line would be charged at its own $320 -
 * which is exactly the $910-per-crib double-charge that splitting `includes`
 * from `bundle` was written to fix. CheckoutClient never maps this into the
 * request; it exists so the cart can SHOW the whole order.
 */
export interface CartInclude {
  productName: string;
  image: string | null;
}

export interface CartItem {
  id: string;
  productName: string;
  cribName?: string;
  wood: string;
  stainName: string;
  price: number;
  image: string;
  quantity: number;
  addons?: CartAddon[];
  /** What comes with this line, already paid for. Never sent to the server. */
  includes?: CartInclude[];
  /**
   * The parent line whose bundle price this add-on line was added at. Sent to
   * the server, which looks the price up itself (the client price is ignored)
   * and only while that parent is in the same cart.
   */
  bundledWith?: CartParentRef;
  /**
   * The item's own catalogue price, stored with a bundle-priced line so the
   * cart can show what the server will charge if the parent leaves the cart
   * (see src/lib/cart-pricing.ts). Display only; the server never reads it.
   */
  listPrice?: number;
}

export interface CartParentRef {
  productName: string;
  wood: string;
}
