import 'server-only';
import { createHash } from 'node:crypto';
import type Stripe from 'stripe';
import { getStripe } from './stripe-server';
import { splitPayment, type PaymentOption, type PaymentSplit } from './order-terms';
import { variantLabel } from './labels';
import type { PricedCart, ShippingDetails } from './pricing';

/**
 * Turning a submitted quote into a DRAFT Stripe invoice.
 *
 * Nothing here charges anyone. The site builds the invoice, itemised and
 * priced, and it waits in the Stripe dashboard until a person reads it and
 * presses Send. That human step is the point: these are made-to-order pieces
 * and the stain, the kit list or the price can all have moved since the
 * conversation.
 *
 * Why a draft rather than leaving the whole thing manual: the alternative is
 * re-typing every line, the 6% Pennsylvania tax and the 50% split by hand onto
 * a $3,000 order. Three chances to mistype, and the quote the customer was
 * shown quietly stops matching the invoice they receive. src/lib/pricing.ts
 * already computes all of it; this hands that to Stripe rather than to a
 * person.
 */

/** Stripe caps a metadata value at 500 characters and a set at 50 keys. */
const MAX_CUSTOM_FIELD_VALUE = 30;

export interface QuoteResult {
  orderRef: string;
  invoiceId: string;
  customerId: string;
  split: PaymentSplit;
}

/**
 * A short, human reference for the order.
 *
 * `invoice.number` is null while an invoice is a draft, and a draft is all this
 * ever creates - so there would otherwise be nothing for a customer to quote in
 * an email or for the shop to search on. Derived from the order hash so the
 * same submitted order always produces the same reference.
 */
function orderRefFrom(hash: string): string {
  return `HC-${hash.slice(0, 8).toUpperCase()}`;
}

/**
 * One customer per email address, forever.
 *
 * Reuse matters more than it looks: every invoice this shop ever sends that
 * person, deposit and balance, then lands on one dashboard page, which is what
 * makes "what does this customer still owe" answerable at all.
 */
async function findOrCreateCustomer(
  stripe: Stripe,
  shipping: ShippingDetails,
  orderRef: string
): Promise<Stripe.Customer> {
  const name = `${shipping.firstName} ${shipping.lastName}`;
  const address: Stripe.AddressParam = {
    line1: shipping.address,
    city: shipping.city,
    state: shipping.state,
    postal_code: shipping.zip,
    country: 'US',
  };

  const existing = await stripe.customers.list({ email: shipping.email, limit: 1 });
  if (existing.data.length > 0) {
    return stripe.customers.update(existing.data[0].id, {
      name,
      address,
      shipping: { name, address },
      /*
       * Deliberately no timestamp. src/lib/pricing.ts documents why: a value
       * that differs per request makes the parameters differ under a stable
       * idempotency key, and Stripe then rejects the retry - which is exactly
       * the double-submit case the key exists to absorb. The authoritative
       * time is the invoice's own `created`.
       */
      metadata: { last_order_ref: orderRef, source: 'website_checkout' },
    });
  }

  return stripe.customers.create({
    email: shipping.email,
    name,
    address,
    shipping: { name, address },
    metadata: { first_order_ref: orderRef, last_order_ref: orderRef, source: 'website_checkout' },
  });
}

/**
 * The invoice lines: every item, then tax, then the deferred balance.
 *
 * The negative line is what lets one document show the whole order while asking
 * for half of it. A single opaque "50% deposit" line would total the same and
 * tell the customer nothing about what they had actually bought - a poor
 * document for a $3,000 commission.
 *
 * Tax is our own line rather than a Stripe tax rate. Stripe applies a rate per
 * line and rounds per line, which can differ by a cent or two from
 * priceCart()'s single calculation - and an invoice that disagrees with the
 * quote by a cent is worse than one that is merely approximate, because it
 * looks like a mistake.
 */
function buildLines(
  priced: PricedCart,
  split: PaymentSplit,
  taxState: string
): Stripe.InvoiceAddLinesParams.Line[] {
  const lines: Stripe.InvoiceAddLinesParams.Line[] = priced.lines.map(line => {
    const variant = variantLabel(line.wood, line.stainName);
    return {
      description: variant ? `${line.productName} — ${variant}` : line.productName,
      amount: line.lineCents,
      metadata: {
        wood: line.wood,
        stain: line.stainName,
        quantity: String(line.quantity),
        unit_cents: String(line.unitCents),
      },
    };
  });

  if (priced.taxCents > 0) {
    lines.push({
      description: `${taxState} sales tax (6%)`,
      amount: priced.taxCents,
      metadata: { kind: 'tax' },
    });
  }

  if (split.dueLaterCents > 0) {
    lines.push({
      description: 'Balance due on completion — invoiced when staining is finished',
      amount: -split.dueLaterCents,
      metadata: { kind: 'deferred_balance' },
    });
  }

  return lines;
}

export async function createQuote(
  priced: PricedCart,
  shipping: ShippingDetails,
  paymentOption: PaymentOption
): Promise<QuoteResult> {
  /*
   * Keyed on what determines the invoice, INCLUDING the deposit choice.
   *
   * Without paymentOption in the hash, someone who submits at 50%, goes back
   * and resubmits choosing to pay in full gets the original half-price invoice
   * returned to them, silently. `v` is a literal so a future change to this
   * shape forces fresh keys rather than colliding with old ones.
   */
  const orderHash = createHash('sha256')
    .update(
      JSON.stringify({
        v: 1,
        lines: priced.lines,
        subtotal: priced.subtotalCents,
        tax: priced.taxCents,
        total: priced.totalCents,
        shipping,
        paymentOption,
      })
    )
    .digest('hex');

  const orderRef = orderRefFrom(orderHash);
  const split = splitPayment(priced.totalCents, paymentOption);
  const stripe = getStripe();

  const customer = await findOrCreateCustomer(stripe, shipping, orderRef);

  const invoice = await stripe.invoices.create(
    {
      customer: customer.id,
      /*
       * The load-bearing flag. `auto_advance: false` is what keeps this a draft
       * that Stripe will never finalise or email on its own. Relying on the
       * default is how an unreviewed invoice with the wrong stain reaches a
       * customer an hour after they submitted.
       */
      auto_advance: false,
      // Required for Stripe's built-in payment reminders, which are the whole
      // follow-up story and cost nothing to switch on in the dashboard.
      collection_method: 'send_invoice',
      // Counted from FINALISATION, not creation, so a draft can sit for as long
      // as the review takes without going overdue.
      days_until_due: 7,
      // A stray invoice item left on this customer by anything else must not
      // silently attach itself to a real order.
      pending_invoice_items_behavior: 'exclude',
      // Explicit, so nobody switches it on later and desynchronises the invoice
      // from the quote the customer was shown.
      automatic_tax: { enabled: false },
      description: `Website order ${orderRef}`,
      custom_fields: [{ name: 'Order', value: orderRef.slice(0, MAX_CUSTOM_FIELD_VALUE) }],
      footer:
        split.dueLaterCents > 0
          ? 'Delivery and setup are included. The remaining balance is invoiced once staining is complete.'
          : 'Delivery and setup are included. Paid in full.',
      shipping_details: {
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
        order_ref: orderRef,
        order_hash: orderHash,
        source: 'website_checkout',
        kind: 'deposit',
        payment_option: paymentOption,
        subtotal_cents: String(priced.subtotalCents),
        shipping_cents: String(priced.shippingCents),
        tax_cents: String(priced.taxCents),
        total_cents: String(priced.totalCents),
        due_now_cents: String(split.dueNowCents),
        due_later_cents: String(split.dueLaterCents),
        tax_state: shipping.state,
        item_count: String(priced.lines.length),
        terms_accepted: 'true',
      },
    },
    { idempotencyKey: `${orderHash}:invoice` }
  );

  /*
   * Two calls, and the failure mode of the second one matters.
   *
   * If addLines throws, do NOT delete the draft. The create call's idempotency
   * key is already bound to this invoice id, so a retry would be handed back
   * the deleted invoice and fail permanently. An empty draft visible in the
   * dashboard is a far better outcome than an order that can never be retried.
   */
  await stripe.invoices.addLines(
    invoice.id as string,
    { lines: buildLines(priced, split, shipping.state) },
    { idempotencyKey: `${orderHash}:lines` }
  );

  return { orderRef, invoiceId: invoice.id as string, customerId: customer.id, split };
}
