/**
 * One selectable finish of a product, flattened.
 *
 * The browser used to model two axes, wood and stain, because the catalogue
 * carried three wood species. It carries one now, so the wood axis had exactly
 * one value and the control for it was removed - leaving a two-dimensional
 * data shape describing a one-dimensional choice.
 *
 * Flattening it is also what lets one component serve all 16 cribs. Six of them
 * declare `variantType: "wood"` (Brown Maple, eleven stains under it) and ten
 * declare `variantType: "finish"` (ten painted finishes, each its own variant
 * with a single stain). Those are the same choice to a customer - "what colour
 * is it" - and only differ in how the supplier feed happened to encode them.
 *
 * `variant` and `stainName` are kept because a URL needs them: variantHref()
 * builds /product/<slug>/<variant>/<stain> and collapses the second segment
 * when the two are the same.
 */
export interface GalleryFinish {
  /** What the customer sees and filters by. */
  name: string;
  /** The underlying variant value, for building the product URL. */
  variant: string;
  /** The stain within that variant, for building the product URL. */
  stainName: string;
  image?: string;
  /** Price of this exact configuration, in dollars. */
  price: number;
  inStock: boolean;
}

export interface GalleryProduct {
  slug: string;
  name: string;
  minPrice: number;
  finishes: GalleryFinish[];
}
