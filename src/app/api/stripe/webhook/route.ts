import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { getStripe, StripeNotConfiguredError } from '@/lib/stripe-server';
import {
  sendPaymentAlert,
  sendPaymentFailedAlert,
  sendPaymentReceipt,
  type InvoiceEvent,
} from '@/lib/email';

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
 * Verifies the signature, logs the event, and notifies. There is still no
 * datastore: Stripe is the record, and `order_ref` / `order_hash` in invoice
 * metadata are the join keys that answer "what does this customer still owe"
 * through invoices.search. `deliver()` remains the single seam where a database
 * would attach if one ever exists.
 *
 * What it does NOT do is create the balance invoice. That is
 * scripts/create-balance-invoice.mjs, run by hand when the staining is actually
 * finished - a fact this process cannot know. The deposit-paid alert therefore
 * carries the command to run, so the follow-up lives in the shop's inbox.
 */

function summarise(invoice: Stripe.Invoice): InvoiceEvent {
  const meta = invoice.metadata ?? {};
  /*
   * Parsed here rather than in the templates. Stripe metadata values are always
   * strings, and `Number(undefined)` is NaN - which is neither > 0 nor an
   * integer, so an invoice written by anything other than quote.ts falls
   * through to "nothing outstanding" instead of printing NaN at a customer.
   */
  const dueLaterCents = Number(meta.due_later_cents);
  return {
    invoiceId: invoice.id as string,
    orderRef: meta.order_ref ?? null,
    kind: meta.kind ?? null,
    status: invoice.status ?? 'unknown',
    amountDueCents: invoice.amount_due,
    amountPaidCents: invoice.amount_paid,
    dueLaterCents: Number.isInteger(dueLaterCents) && dueLaterCents > 0 ? dueLaterCents : 0,
    email: invoice.customer_email,
    name: invoice.customer_name,
    hostedInvoiceUrl: invoice.hosted_invoice_url ?? null,
    livemode: invoice.livemode,
  };
}

/**
 * Log, then notify.
 *
 * Never throws, and never awaits its way into a non-2xx: a mail failure must not
 * make Stripe retry, or the same payment is announced twice. src/lib/email.ts
 * already fails soft for exactly this reason; the try/catch is the second belt.
 *
 * The log line stays regardless of whether mail is configured - it is the
 * durable record in the Vercel logs, and the only one on a deployment without
 * Resend.
 */
async function deliver(event: string, order: InvoiceEvent): Promise<void> {
  try {
    console.log(`[order] ${event}`, JSON.stringify(order));

    if (event === 'invoice.paid') {
      await Promise.allSettled([sendPaymentAlert(order), sendPaymentReceipt(order)]);
      return;
    }
    if (event === 'invoice.payment_failed') {
      await sendPaymentFailedAlert(order);
    }
    // finalized / sent / voided / marked_uncollectible are logged only. Stripe's
    // own invoice emails cover the customer side of those, and duplicating them
    // from here would mean the customer hears about one send twice.
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
    /*
     * Invoices, not PaymentIntents.
     *
     * Checkout no longer creates a PaymentIntent - it records a draft invoice
     * that a person reviews and sends. Invoices do create their own
     * PaymentIntents when paid, so keeping the old payment_intent.* cases
     * subscribed would fire twice for every payment and send duplicate
     * notifications. invoice.paid is the authoritative signal.
     */
    case 'invoice.paid':
    case 'invoice.payment_failed':
    case 'invoice.sent':
    case 'invoice.finalized':
    case 'invoice.voided':
    case 'invoice.marked_uncollectible':
      await deliver(event.type, summarise(event.data.object));
      break;
    default:
      // Acknowledged, not handled. Returning non-2xx would make Stripe retry an
      // event we were never going to act on.
      break;
  }

  return NextResponse.json({ received: true });
}
