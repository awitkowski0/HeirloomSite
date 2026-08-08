import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Capability token for reading an order.
 *
 * Keyed on ORDER_TOKEN_SECRET, not STRIPE_SECRET_KEY. Using the Stripe key
 * meant one secret served two unrelated purposes, and rotating Stripe silently
 * invalidated every outstanding order link a customer had been emailed.
 *
 * Falls back to the Stripe key only so that tokens minted before this change
 * keep working; the fallback is logged once so it does not become permanent.
 */
let warned = false;

function secret(): string {
  const dedicated = process.env.ORDER_TOKEN_SECRET;
  if (dedicated && dedicated.length >= 16) return dedicated;

  const fallback = process.env.STRIPE_SECRET_KEY;
  if (!fallback) throw new Error('ORDER_TOKEN_SECRET is not configured');
  if (!warned) {
    warned = true;
    console.warn(
      'ORDER_TOKEN_SECRET is unset; falling back to STRIPE_SECRET_KEY. ' +
        'Set ORDER_TOKEN_SECRET (openssl rand -hex 32) so rotating the Stripe key ' +
        'does not invalidate outstanding order links.'
    );
  }
  return fallback;
}

export function mintOrderToken(paymentIntentId: string): string {
  return createHmac('sha256', secret()).update(paymentIntentId).digest('hex');
}

export function verifyOrderToken(paymentIntentId: string, token: string): boolean {
  const expected = Buffer.from(mintOrderToken(paymentIntentId));
  const provided = Buffer.from(token);
  // Length check first: timingSafeEqual throws on a length mismatch.
  if (expected.length !== provided.length) return false;
  return timingSafeEqual(expected, provided);
}
