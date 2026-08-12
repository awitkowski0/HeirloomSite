import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Capability token for reading an order.
 *
 * Keyed on ORDER_TOKEN_SECRET alone. It used to fall back to STRIPE_SECRET_KEY
 * "so tokens minted before this change keep working" - but tokens live in
 * sessionStorage for the length of one checkout, and nothing has ever emailed
 * one, so there were no outstanding tokens for the fallback to protect. All it
 * did was give one secret two unrelated jobs and widen what a leak of either
 * one costs. Fails closed instead.
 */
function secret(): string {
  const dedicated = process.env.ORDER_TOKEN_SECRET;
  if (!dedicated || dedicated.length < 16) {
    throw new Error(
      'ORDER_TOKEN_SECRET is not configured (needs at least 16 chars; openssl rand -hex 32)'
    );
  }
  return dedicated;
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
