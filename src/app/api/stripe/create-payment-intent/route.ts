import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { getStripe, StripeNotConfiguredError } from '@/lib/stripe-server';
import { mintOrderToken } from '@/lib/orderToken';
import { priceCart, validateShipping, requireTermsAcceptance, PricingError } from '@/lib/pricing';
import { verifyTurnstile, TurnstileError } from '@/lib/turnstile';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Stripe caps each metadata VALUE at 500 characters. */
const METADATA_VALUE_LIMIT = 500;

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  try {
    // Before anything else: this endpoint creates real PaymentIntents and is
    // reachable by anyone. No-op unless TURNSTILE_SECRET_KEY is configured.
    await verifyTurnstile(
      body.turnstileToken,
      req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for')
    );

    const shipping = validateShipping(body);
    requireTermsAcceptance(body);
    // Tax depends on the destination, so pricing has to run after the address
    // is validated, not alongside it.
    const priced = priceCart(body.cart, shipping.state);

    /*
     * Item detail is deliberately compact.
     *
     * The old handler JSON.stringify'd the full cart - including image paths
     * like /data/products/3-4%20Guard%20Rail/3_4_guard_rail_0.jpg - into a
     * single `items` metadata value. Measured per-item length was a median of
     * 208 characters, so a three-item cart blew the 500-char cap and Stripe
     * threw StripeInvalidRequestError, surfacing to the customer as a generic
     * "Failed to initialize payment".
     *
     * Images are dropped (they are recoverable from the catalogue by
     * product/wood/stain) and the payload is split across numbered keys with a
     * hard guard, so a large cart can never fail the charge.
     */
    const compactItems = priced.lines.map(l => ({
      p: l.productName,
      w: l.wood,
      s: l.stainName,
      q: l.quantity,
      c: l.unitCents,
      ...(l.addons.length > 0 ? { a: l.addons.map(a => a.name) } : {}),
    }));

    const itemChunks: Record<string, string> = {};
    let current = '';
    let chunkIndex = 0;
    for (const item of compactItems) {
      const encoded = JSON.stringify(item);
      if (current.length + encoded.length + 1 > METADATA_VALUE_LIMIT) {
        itemChunks[`items_${chunkIndex++}`] = `[${current}]`;
        current = '';
      }
      current = current ? `${current},${encoded}` : encoded;
    }
    if (current) itemChunks[`items_${chunkIndex}`] = `[${current}]`;

    /*
     * Idempotency, derived from the order rather than from a client-supplied id.
     *
     * Every submit created a brand new PaymentIntent and abandoned the previous
     * one, so a double-click, a flaky connection retry, or editing the address
     * and resubmitting all littered Stripe with intents for the same order. The
     * key is a hash of exactly what determines the charge - the priced lines and
     * the destination - so an identical resubmit returns the SAME intent, and a
     * genuinely different order gets a new one.
     */
    const idempotencyKey = createHash('sha256')
      .update(
        JSON.stringify({
          lines: priced.lines,
          total: priced.totalCents,
          shipping,
        })
      )
      .digest('hex');

    const stripe = getStripe();
    const paymentIntent = await stripe.paymentIntents.create({
      // Integer cents. `total * 100` on float dollars produced values like
      // 205019.99999999997, which Stripe rejects.
      amount: priced.totalCents,
      currency: 'usd',
      automatic_payment_methods: { enabled: true },
      receipt_email: shipping.email,
      // Use Stripe's first-class shipping field rather than stuffing a home
      // address into metadata, which Stripe documents as not for personal data.
      shipping: {
        name: `${shipping.firstName} ${shipping.lastName}`,
        address: {
          line1: shipping.address,
          city: shipping.city,
          state: shipping.state,
          postal_code: shipping.zip,
          country: 'US',
        },
      },
      metadata: {
        subtotal_cents: String(priced.subtotalCents),
        shipping_cents: String(priced.shippingCents),
        tax_cents: String(priced.taxCents),
        total_cents: String(priced.totalCents),
        item_count: String(priced.lines.length),
        ...itemChunks,
        terms_accepted: 'true',
      },
    }, { idempotencyKey });

    if (!paymentIntent.client_secret) {
      throw new Error('Stripe returned no client_secret');
    }

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      token: mintOrderToken(paymentIntent.id),
      // The server's own totals, so the client renders what will actually be
      // charged rather than prices snapshotted into localStorage at
      // add-to-cart time.
      totals: {
        subtotalCents: priced.subtotalCents,
        shippingCents: priced.shippingCents,
        taxCents: priced.taxCents,
        totalCents: priced.totalCents,
      },
    });
  } catch (err) {
    if (err instanceof StripeNotConfiguredError) {
      // 503, not 500: the service is unconfigured, not broken. The message is
      // safe to surface - it names an absent variable, never a value.
      console.error('create-payment-intent: payments are not configured.', err.message);
      return NextResponse.json(
        {
          error:
            'Payments are not configured on this deployment. Please contact us to complete your order.',
        },
        { status: 503 }
      );
    }
    if (err instanceof TurnstileError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    if (err instanceof PricingError) {
      // Validation problems are the caller's to fix, and the message is safe
      // to show: it names a product, stain or field, never anything internal.
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error('createPaymentIntent error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
