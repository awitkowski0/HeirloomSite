/**
 * Currency formatting.
 *
 * The old code rendered prices as `${n.toLocaleString()}.00`, which is wrong for
 * the ~10 SKUs with fractional base prices: 1759.2 rendered as "$1,759.2.00".
 * Always format through Intl.
 */
const usd = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatPrice(amount: number): string {
  return usd.format(amount);
}

/** Whole-dollar display for listing grids, where cents are noise. */
const usdWhole = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function formatPriceApprox(amount: number): string {
  return usdWhole.format(amount);
}

/**
 * Money is computed in integer cents everywhere it matters. Floating point
 * dollars produced 1759.2 * 100 === 205019.99999999997, which Stripe rejects
 * outright as a non-integer amount.
 */
export function toCents(dollars: number): number {
  return Math.round(dollars * 100);
}

export function fromCents(cents: number): number {
  return cents / 100;
}
