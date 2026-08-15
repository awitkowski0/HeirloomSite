import { NextResponse } from 'next/server';
import { StripeNotConfiguredError } from '@/lib/stripe-server';
import { priceCart, validateShipping, requireTermsAcceptance, PricingError } from '@/lib/pricing';
import { isPaymentOption } from '@/lib/order-terms';
import { verifyTurnstile, TurnstileError, turnstileEnabled } from '@/lib/turnstile';
import { createQuote } from '@/lib/quote';
import { sendQuoteAlert, sendQuoteConfirmation } from '@/lib/email';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Submit a quote. Nothing is charged here and no card is involved.
 *
 * Replaces POST /api/stripe/create-payment-intent. The shop wants a commitment
 * and a 50% deposit invoiced after review, not a card payment - which is what
 * the terms the customer accepts have said all along.
 *
 * Order of operations is load-bearing. Turnstile runs first because this
 * endpoint now creates Stripe objects AND sends mail to an address the caller
 * supplies; every rejection therefore happens before anything is created and
 * before anything is sent.
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
      req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for')
    );

    const shipping = validateShipping(body);
    requireTermsAcceptance(body);

    const paymentOption = isPaymentOption(body.paymentOption) ? body.paymentOption : 'deposit';
    // Tax depends on the destination, so pricing runs after the address is
    // validated, not alongside it.
    const priced = priceCart(body.cart, shipping.state);

    const quote = await createQuote(priced, shipping, paymentOption);

    /*
     * Awaited, not fired and forgotten.
     *
     * Vercel does not guarantee a function keeps running once the response is
     * returned, so a detached promise here is a coin flip on whether anyone is
     * told about the order. Both sends fail soft, so awaiting them cannot fail
     * the request - only delay it.
     */
    const livemode = process.env.STRIPE_SECRET_KEY?.startsWith('sk_live') ?? false;
    const sends: Array<Promise<boolean>> = [
      sendQuoteAlert(priced, shipping, quote, livemode),
    ];
    /*
     * Belt and braces while Turnstile is unconfigured in production: still
     * record the order and still tell the shop, but do not send mail to an
     * address a stranger typed. That contains any abuse to our own inbox,
     * where it is visible, instead of to third parties whose complaints would
     * burn the sending domain.
     */
    if (turnstileEnabled() || process.env.NODE_ENV !== 'production') {
      sends.push(sendQuoteConfirmation(priced, shipping, quote));
    } else {
      console.error(
        'Turnstile is not configured; skipping the customer confirmation email for ' +
          `${quote.orderRef} rather than mailing an unverified address.`
      );
    }
    await Promise.allSettled(sends);

    return NextResponse.json({
      orderRef: quote.orderRef,
      totals: {
        subtotalCents: priced.subtotalCents,
        shippingCents: priced.shippingCents,
        taxCents: priced.taxCents,
        totalCents: priced.totalCents,
      },
      dueNowCents: quote.split.dueNowCents,
      dueLaterCents: quote.split.dueLaterCents,
      // Null on a draft, always - Stripe only mints it at finalisation. Named
      // in the response so the client is not left wondering where it went.
      hostedInvoiceUrl: null as string | null,
    });
  } catch (err) {
    if (err instanceof StripeNotConfiguredError) {
      // 503, not 500: the service is unconfigured, not broken. The message
      // names an absent variable, never a value.
      console.error('quotes: Stripe is not configured.', err.message);
      return NextResponse.json(
        { error: 'Ordering is not configured on this deployment. Please contact us to place your order.' },
        { status: 503 }
      );
    }
    if (err instanceof TurnstileError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    if (err instanceof PricingError) {
      // Safe to surface: names a product, a stain or a field, never anything
      // internal.
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error('createQuote error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
