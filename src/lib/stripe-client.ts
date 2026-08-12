'use client';

import { loadStripe, type Stripe } from '@stripe/stripe-js';

/**
 * Lazy Stripe.js loader.
 *
 * loadStripe() previously ran at module scope, which injected the Stripe script
 * for anyone who merely loaded the checkout chunk and relied on loadStripe's
 * internal non-browser guard during prerender.
 */
let promise: Promise<Stripe | null> | null = null;

export function getStripe(): Promise<Stripe | null> {
  promise ??= loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');
  return promise;
}
