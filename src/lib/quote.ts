import 'server-only';
import { createHash } from 'node:crypto';
import type Stripe from 'stripe';
import { getStripe } from './stripe-server';
import {
  shippingMethodById,
  splitPayment,
  type PaymentOption,
  type PaymentSplit,
} from './order-terms';
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
  /*
   * The option this invoice was BILLED under, which is not always the one that
   * was asked for - Affirm degrades to a plain pay-in-full invoice outside its
   * amount range. The emails are written from this, so they cannot promise an
   * Affirm button the invoice will not show.
   */
  paymentOption: PaymentOption;
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
 *
 * Known race, accepted: list-then-create is not atomic and Stripe has no
 * create-if-absent for customers, so two submissions from a NEW address landing
 * together can produce two Customers. It needs simultaneous first-ever orders
 * from one address, it costs a duplicate dashboard row rather than a duplicate
 * charge, and the next order from that address reuses whichever came first.
 * Locking it properly would need a datastore, which this flow deliberately
 * does not have.
 *
 * Note also that address and shipping are overwritten on every order, so a
 * repeat buyer shipping to a different address updates their own record. That
 * is the right default for a delivery business - the newest address is the one
 * to deliver to - but it does mean the Customer holds the latest destination,
 * not a billing address.
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
      phone: shipping.phone,
      address,
      shipping: { name, phone: shipping.phone, address },
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
    phone: shipping.phone,
    address,
    shipping: { name, phone: shipping.phone, address },
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

  /*
   * The discount, right after the items it applies to and before shipping -
   * an invoice that read items, delivery, tax, THEN a discount would leave
   * shipping and tax looking like they were computed on the wrong base, even
   * though (per src/lib/pricing.ts) the discount is already folded into tax.
   */
  if (priced.discountCents > 0 && priced.coupon) {
    lines.push({
      description: `Discount (${priced.coupon.code})`,
      amount: -priced.discountCents,
      metadata: {
        kind: 'discount',
        coupon_code: priced.coupon.code,
        promotion_code_id: priced.coupon.promotionCodeId,
      },
    });
  }

  /*
   * Delivery is its own line, before tax, because it is a charge the customer
   * chose and can see the price of. Folding it into the item lines would make
   * the invoice disagree with the checkout summary they approved.
   */
  if (priced.shippingCents > 0) {
    const method = shippingMethodById(priced.shippingMethod);
    lines.push({
      description: method.name,
      amount: priced.shippingCents,
      metadata: { kind: 'shipping', method: method.id },
    });
  }

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

/** The customer id off an invoice, which Stripe may return expanded or as a string. */
function customerIdOf(invoice: Stripe.Invoice): string {
  const customer = invoice.customer;
  if (!customer) return '';
  return typeof customer === 'string' ? customer : customer.id;
}

/**
 * An existing draft for this exact order, if the idempotency key has expired.
 *
 * Fails OPEN. A search outage must not stop someone ordering: the cost of
 * missing a duplicate is a second draft the shop can void, and the cost of
 * failing here is a customer who cannot buy anything.
 */
async function findExistingDraft(
  stripe: Stripe,
  orderHash: string
): Promise<Stripe.Invoice | null> {
  try {
    const { data } = await stripe.invoices.search({
      query: `metadata["order_hash"]:"${orderHash}" AND status:"draft"`,
      limit: 1,
    });
    return data[0] ?? null;
  } catch (err) {
    console.error('quote: duplicate-draft search failed; creating a new draft.', err);
    return null;
  }
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
        discount: priced.discountCents,
        coupon: priced.coupon?.promotionCodeId ?? null,
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

  /*
   * The idempotency key below only covers 24 hours - Stripe expires them.
   * Someone who submits, thinks it over for a weekend and resubmits the
   * identical cart would otherwise get a SECOND draft, and because orderRef is
   * derived from the same hash both drafts would carry the same HC- reference,
   * which is precisely the case the shop cannot untangle in the dashboard.
   *
   * Search rather than replacing the key: the index lags writes by up to a
   * minute, so it does not cover the double-click the key already handles well.
   * The two guards cover different windows and are both wanted.
   */
  const priorDraft = await findExistingDraft(stripe, orderHash);
  if (priorDraft) {
    return {
      orderRef,
      invoiceId: priorDraft.id as string,
      customerId: customerIdOf(priorDraft),
      split,
      paymentOption,
    };
  }

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
      /*
       * Affirm is offered on a pay-in-full invoice and NOT on a deposit one.
       *
       * Affirm finances the whole invoice and pays us immediately, so a
       * customer who took it on a 50% deposit would need a SECOND Affirm loan
       * for the balance two months later - two applications, two credit checks
       * and two schedules for one crib. It also makes no sense as a product:
       * Affirm already does the "spread the cost" job the deposit exists for,
       * so the two together are the same idea charged twice.
       *
       * Restricting to card here rather than listing the allowed set: Klarna
       * carries the identical problem, and naming a method the account has
       * switched off would fail invoice creation - which would take the whole
       * checkout down. Pay-in-full omits payment_settings entirely and inherits
       * the account default, so Affirm, Klarna and Link all appear there.
       *
       * That is also why choosing Affirm at checkout does not name it here. The
       * 'affirm' and 'full' options mint the same invoice; what differs is the
       * metadata, the confirmation email and the fact that the customer has
       * been told to expect Affirm on it. Hardcoding ['affirm'] would swap a
       * customer seeing one fewer payment button for the entire checkout
       * failing on any account where Affirm is off or under review, which is
       * not a trade worth taking for a button order.
       */
      ...(paymentOption === 'deposit'
        ? { payment_settings: { payment_method_types: ['card' as const] } }
        : {}),
      description: `Website order ${orderRef}`,
      custom_fields: [{ name: 'Order', value: orderRef.slice(0, MAX_CUSTOM_FIELD_VALUE) }],
      footer:
        split.dueLaterCents > 0
          ? `${shippingMethodById(priced.shippingMethod).name} is included in this total. ` +
            'The remaining balance is invoiced once staining is complete.'
          : `${shippingMethodById(priced.shippingMethod).name} is included in this total. Paid in full.`,
      shipping_details: {
        name: `${shipping.firstName} ${shipping.lastName}`,
        phone: shipping.phone,
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
        /*
         * What this invoice IS, not what the flow usually produces. It was
         * hardcoded 'deposit', so a pay-in-full order was labelled a deposit -
         * and scripts/create-balance-invoice.mjs selects on exactly this field,
         * so it would have offered to bill a balance that does not exist.
         *
         * Written as "deposit or else full", not "full or else deposit": an
         * Affirm order is paid in full, and the inverted test would have
         * relabelled it a deposit and put the same phantom balance back.
         */
        kind: paymentOption === 'deposit' ? 'deposit' : 'full',
        payment_option: paymentOption,
        subtotal_cents: String(priced.subtotalCents),
        discount_cents: String(priced.discountCents),
        coupon_code: priced.coupon?.code ?? '',
        promotion_code_id: priced.coupon?.promotionCodeId ?? '',
        shipping_cents: String(priced.shippingCents),
        tax_cents: String(priced.taxCents),
        total_cents: String(priced.totalCents),
        due_now_cents: String(split.dueNowCents),
        due_later_cents: String(split.dueLaterCents),
        tax_state: shipping.state,
        shipping_method: priced.shippingMethod,
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

  return { orderRef, invoiceId: invoice.id as string, customerId: customer.id, split, paymentOption };
}
