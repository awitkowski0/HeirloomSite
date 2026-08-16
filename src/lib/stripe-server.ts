import 'server-only';
import Stripe from 'stripe';

/**
 * Lazy Stripe client.
 *
 * Constructed on first use rather than at module scope, so `next build` does
 * not evaluate process.env.STRIPE_SECRET_KEY! while collecting routes (which
 * would either throw or bake in an undefined key).
 *
 * apiVersion is deliberately omitted: the pinned literal "2024-12-18.acacia"
 * was stale for stripe@22 and only type-checked because of an `as any`.
 */
let client: Stripe | null = null;

/**
 * Thrown when payments are not configured, as distinct from a payment that
 * failed. Callers map this to a 503 with an actionable message instead of an
 * opaque 500 - a missing environment variable should not look identical to a
 * Stripe outage.
 */
export class StripeNotConfiguredError extends Error {
  constructor(missing: string) {
    super(`${missing} is not set`);
    this.name = 'StripeNotConfiguredError';
  }
}

export function getStripe(): Stripe {
  if (!client) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      console.error(
        '\n  Ordering is disabled: STRIPE_SECRET_KEY is not set.\n' +
          '  It is the only Stripe variable the server needs. Checkout takes no card,\n' +
          '  so there is no publishable key and no Stripe.js in the browser bundle.\n' +
          '  Set STRIPE_WEBHOOK_SECRET too, or payment confirmations are dropped.\n'
      );
      throw new StripeNotConfiguredError('STRIPE_SECRET_KEY');
    }
    client = new Stripe(key);
  }
  return client;
}
