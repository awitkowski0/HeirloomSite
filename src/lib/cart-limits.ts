/**
 * Cart bounds, shared by the client cart and the server pricer.
 *
 * These lived in two places and disagreed: the cart clamped a line to 99 while
 * src/lib/pricing.ts rejected anything above 20. A line between the two
 * rendered and totalled correctly all the way to "Continue to payment", then
 * failed with "Invalid quantity" - and since checkout could only REMOVE a line,
 * not reduce it, there was no way to recover except emptying the cart.
 *
 * Deliberately NOT marked `server-only`: pricing.ts is server-only and the cart
 * is a client module, so the single source of truth has to be importable by
 * both. It contains two integers and no logic.
 */
export const MAX_QUANTITY_PER_LINE = 20;
export const MAX_CART_LINES = 50;
