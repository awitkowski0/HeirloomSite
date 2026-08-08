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

export function getStripe(): Stripe {
  if (!client) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error('STRIPE_SECRET_KEY is not configured');
    client = new Stripe(key);
  }
  return client;
}
