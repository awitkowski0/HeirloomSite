import 'server-only';
import { getStripe } from './stripe-server';

/**
 * Fixed-amount-off coupon codes, backed by Stripe Promotion Codes.
 *
 * Stripe is the source of truth for whether a code exists, is active, and
 * carries which discount - codes are created and managed entirely in the
 * Stripe Dashboard, never here. What this module owns is the SAME rule
 * src/lib/pricing.ts follows for tax and shipping: the actual dollar amount
 * applied to an order is computed by our own code, never by Stripe's
 * `discounts` param, so the checkout summary and the invoice can never
 * disagree by a cent.
 *
 * Scope is deliberately narrow: fixed amount off only. Percent-off coupons
 * exist in Stripe's model but nothing here supports them yet, so one is
 * rejected the same way an unknown code is - a coupon this store can't
 * price correctly is not a coupon this store should apply.
 */

const MAX_CODE_LENGTH = 40;

export class CouponError extends Error {
  readonly status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = 'CouponError';
    this.status = status;
  }
}

export interface ResolvedCoupon {
  /** Canonical code as Stripe stored it, for display and for the invoice line. */
  code: string;
  promotionCodeId: string;
  couponId: string;
  amountOffCents: number;
}

/**
 * Look up, validate, and price a coupon code against a cart's product
 * subtotal.
 *
 * Called from BOTH POST /api/coupon/validate and POST /api/quotes - there is
 * exactly one implementation of "is this code currently good," and quote
 * creation calls it again with a freshly computed subtotal rather than
 * trusting an earlier validate response, since the cart or the coupon's own
 * state (expired, deactivated) can change in between.
 *
 * `subtotalCents` must come from src/lib/pricing.ts's cartSubtotalCents() or
 * priceCart(), never from the client - it is what the minimum-order
 * restriction is checked against.
 */
export async function resolveCoupon(
  rawCode: unknown,
  subtotalCents: number
): Promise<ResolvedCoupon> {
  if (typeof rawCode !== 'string' || rawCode.trim() === '') {
    throw new CouponError('Enter a coupon code.');
  }
  const code = rawCode.trim();
  if (code.length > MAX_CODE_LENGTH) {
    throw new CouponError('That coupon code is not valid.');
  }

  /*
   * Deliberately NOT `active: true` here. Stripe computes `active` as false
   * once a code is past its expires_at (confirmed empirically: it flips to
   * false itself, with no separate housekeeping job) - filtering on it would
   * make an expired code indistinguishable from one that never existed, and
   * the customer would see "not valid" instead of the more useful "expired."
   * Inactive-for-any-other-reason (deactivated in the dashboard, coupon's own
   * `valid` false) still needs its own check below, since `active` covers
   * more than just expiry.
   */
  const stripe = getStripe();
  const { data } = await stripe.promotionCodes.list({
    code,
    limit: 1,
    expand: ['data.promotion.coupon'],
  });
  const promo = data[0];
  if (!promo) throw new CouponError('That coupon code is not valid.');

  // Stripe does not auto-enforce this outside of Checkout Sessions/Elements,
  // neither of which this app uses - so it is checked by hand, here.
  if (promo.expires_at !== null && promo.expires_at * 1000 < Date.now()) {
    throw new CouponError('That coupon code has expired.');
  }

  if (!promo.active) throw new CouponError('That coupon code is no longer valid.');

  const coupon = promo.promotion.coupon;
  if (!coupon || typeof coupon === 'string' || !coupon.valid) {
    throw new CouponError('That coupon code is no longer valid.');
  }

  if (coupon.amount_off === null || coupon.currency?.toLowerCase() !== 'usd') {
    throw new CouponError('That coupon code is not valid for this store.');
  }

  const restrictions = promo.restrictions;
  if (restrictions.minimum_amount !== null) {
    const minCurrency = (restrictions.minimum_amount_currency ?? 'usd').toLowerCase();
    if (minCurrency !== 'usd') {
      throw new CouponError('That coupon code is not valid for this store.');
    }
    if (subtotalCents < restrictions.minimum_amount) {
      const min = (restrictions.minimum_amount / 100).toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
      });
      throw new CouponError(`This code requires a minimum order of ${min}.`);
    }
  }

  return {
    code: promo.code,
    promotionCodeId: promo.id,
    couponId: coupon.id,
    amountOffCents: coupon.amount_off,
  };
}
