import { NextResponse } from 'next/server';
import { StripeNotConfiguredError } from '@/lib/stripe-server';
import { cartSubtotalCents, PricingError } from '@/lib/pricing';
import { resolveCoupon, CouponError } from '@/lib/coupon';
import { verifyTurnstile, TurnstileError, TURNSTILE_ACTIONS } from '@/lib/turnstile';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Check a coupon code before checkout, so the customer sees the discount in
 * the order summary rather than finding out only after submitting.
 *
 * This is a read-only lookup against a merchant-configured, finite set of
 * Stripe Promotion Codes - it creates nothing and sends no mail - but it is
 * still an anonymous, unauthenticated endpoint that costs a live Stripe API
 * call per request, so it is gated by Turnstile the same way /api/quotes and
 * /api/subscribe are.
 *
 * The discount returned here is a PREVIEW only. POST /api/quotes resolves the
 * coupon again, independently, against the cart it actually receives - this
 * response is never trusted as the final word on what gets charged.
 */
export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  try {
    await verifyTurnstile(
      body.turnstileToken,
      req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for'),
      TURNSTILE_ACTIONS.coupon
    );

    // Never trust a client-sent subtotal - recompute from our own catalogue.
    const subtotalCents = cartSubtotalCents(body.cart);
    const resolved = await resolveCoupon(body.code, subtotalCents);
    const discountCents = Math.min(subtotalCents, resolved.amountOffCents);

    return NextResponse.json({
      valid: true,
      code: resolved.code,
      amountOffCents: resolved.amountOffCents,
      discountCents,
    });
  } catch (err) {
    if (err instanceof StripeNotConfiguredError) {
      console.error('coupon/validate: Stripe is not configured.', err.message);
      return NextResponse.json(
        { error: 'Coupons are not available on this deployment.' },
        { status: 503 }
      );
    }
    if (err instanceof TurnstileError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    if (err instanceof CouponError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    if (err instanceof PricingError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error('coupon/validate error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
