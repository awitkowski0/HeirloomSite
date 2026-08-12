import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { getStripe, StripeNotConfiguredError } from '@/lib/stripe-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Stripe webhook receiver.
 *
 * Until this existed, the ONLY signal that an order had been paid for was the
 * customer's browser calling onSuccess and navigating to the confirmation page.
 * Close the tab after paying, lose connectivity, or pay through a redirect
 * method and nothing server-side ever learned the order had happened. Payment
 * confirmation cannot depend on the payer's browser staying alive.
 *
 * Deliberately scoped: this verifies the signature and records the event.
 * There is no datastore and no email provider in this project, so `deliver()`
 * below is the single place a persistence or notification integration belongs.
 * Until it is filled in, a paid order is durably LOGGED but still does not
 * reach anyone automatically - that gap is real and is not closed by this file.
 */

interface OrderRecord {
  paymentIntentId: string;
  status: string;
  amountCents: number;
  currency: string;
  email: string | null;
  name: string | null;
  itemCount: string | null;
  livemode: boolean;
}

function summarise(pi: Stripe.PaymentIntent): OrderRecord {
  return {
    paymentIntentId: pi.id,
    status: pi.status,
    amountCents: pi.amount,
    currency: pi.currency,
    email: pi.receipt_email,
    name: pi.shipping?.name ?? null,
    itemCount: pi.metadata?.item_count ?? null,
    livemode: pi.livemode,
  };
}

/**
 * The extension point. Replace the log with a real sink (a row in a database, a
 * notification email, an order-management webhook) when one exists.
 *
 * Never throws: a sink failure must not return a non-2xx to Stripe, or Stripe
 * retries and the same order is processed twice.
 */
async function deliver(event: string, order: OrderRecord): Promise<void> {
  try {
    console.log(`[order] ${event}`, JSON.stringify(order));
  } catch (err) {
    console.error('[order] delivery failed; Stripe still gets a 200', err);
  }
}

export async function POST(req: Request) {
  const signature = req.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature' }, { status: 400 });
  }

  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error('Webhook received but STRIPE_WEBHOOK_SECRET is not set; refusing to trust it.');
    return NextResponse.json({ error: 'Webhooks are not configured' }, { status: 503 });
  }

  // The RAW body, not req.json(): the signature is computed over the exact
  // bytes Stripe sent, so any parse-and-restringify breaks verification.
  const payload = await req.text();

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(payload, signature, secret);
  } catch (err) {
    if (err instanceof StripeNotConfiguredError) {
      return NextResponse.json({ error: 'Payments are not configured' }, { status: 503 });
    }
    // An unverified body is either a misconfiguration or a forgery. Either way
    // it must never be acted on, and the payload must not be logged.
    console.error('Webhook signature verification failed:', (err as Error).message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  switch (event.type) {
    case 'payment_intent.succeeded':
    case 'payment_intent.payment_failed':
      await deliver(event.type, summarise(event.data.object));
      break;
    case 'charge.refunded': {
      const charge = event.data.object;
      await deliver(event.type, {
        paymentIntentId: typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.id,
        status: 'refunded',
        amountCents: charge.amount_refunded,
        currency: charge.currency,
        email: charge.receipt_email,
        name: charge.shipping?.name ?? null,
        itemCount: null,
        livemode: charge.livemode,
      });
      break;
    }
    default:
      // Acknowledged, not handled. Returning non-2xx would make Stripe retry an
      // event we were never going to act on.
      break;
  }

  return NextResponse.json({ received: true });
}
