/*
 * The purchase-assurance block under Add to Cart (delivery tiers, standards,
 * lead time, talk to a person) - which product pages show it.
 *
 * It used to show only when a product's variants were wood types
 * (variantType === 'wood'), which hid it from every finish-variant crib (all
 * OTO cribs, Arched Top, Mini Newport) and from every case good. Whether a
 * buyer pays for delivery has nothing to do with how the variants are named:
 * every order is priced with one Curbside or White Glove charge
 * (src/lib/pricing.ts priceCart), so the line is true for every piece of
 * furniture. It is decided by category instead.
 *
 * Kits, rails and the mattress are left out: they are add-ons normally bought
 * with a crib (the crib page already shows the line), and the block's
 * "made to order in the wood and finish you picked" copy does not describe a
 * mattress. A category not listed here (a new furniture type) shows the block.
 */
export const ADD_ON_CATEGORIES: readonly string[] = ['Accessories', 'Guard Rails & Conversions'];

export function showsPurchaseAssurances(category: string | null | undefined): boolean {
  if (!category) return true;
  return !ADD_ON_CATEGORIES.includes(category);
}

/* Names the two services only. Dollar rates are not published on product pages
   (fuel charges can change); checkout shows the charge for the order. */
export function deliveryLineTitle(): string {
  return 'Delivery: Curbside or White Glove';
}
