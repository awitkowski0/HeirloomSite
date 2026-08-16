import 'dotenv/config';
import Stripe from 'stripe';

/**
 * Invoice the remaining balance on a deposit order.
 *
 *   node scripts/create-balance-invoice.mjs HC-3F9A2B1C [--dry-run]
 *
 * Deliberately NOT automatic. The balance falls due when the piece is actually
 * finished, and that is a fact only a person in the shop has. A draft created
 * automatically on deposit payment would either sit for two months as clutter or
 * - worse - be sent on the strength of a date rather than a finished piece.
 * This keeps the shape the checkout already has: the tooling prepares an
 * accurate document, a human decides when it goes.
 *
 * Creates a DRAFT, exactly like src/lib/quote.ts does for the deposit. Nothing
 * here finalises, sends or charges. Someone reviews it and presses Send.
 *
 * The amount is READ from the deposit invoice's own metadata rather than
 * recomputed. That is what guarantees the two invoices sum to the order total:
 * splitPayment() defined the balance as "the total minus the deposit", so
 * re-deriving it here from a price list that may have moved since is the one way
 * to make them disagree. It also means this script needs no catalogue, no
 * pricing table and no import from src/ at all.
 */

const DASHBOARD = 'https://dashboard.stripe.com';

function die(message) {
  console.error(`\n  ${message}\n`);
  process.exit(1);
}

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const orderRef = args.find(a => !a.startsWith('--'));

if (!orderRef) {
  die('Usage: node scripts/create-balance-invoice.mjs <ORDER_REF> [--dry-run]');
}
if (!/^HC-[0-9A-F]{8}$/.test(orderRef)) {
  die(`"${orderRef}" is not an order reference. They look like HC-3F9A2B1C.`);
}

const key = process.env.STRIPE_SECRET_KEY;
if (!key) die('STRIPE_SECRET_KEY is not set. Put it in .env or export it.');

const stripe = new Stripe(key);
const live = key.startsWith('sk_live');
const dash = path => `${DASHBOARD}/${live ? '' : 'test/'}${path}`;

/**
 * Stripe's search index lags writes by up to a minute. That is harmless here -
 * a deposit old enough to have been paid is long since indexed - but it is why
 * the create call below ALSO carries an idempotency key rather than trusting
 * the "already invoiced" check alone. A duplicate balance invoice is a
 * customer-visible double-bill.
 */
async function findOne(query) {
  const { data } = await stripe.invoices.search({ query, limit: 2 });
  return data;
}

const deposits = await findOne(
  `metadata["order_ref"]:"${orderRef}" AND metadata["kind"]:"deposit"`
);

if (deposits.length === 0) {
  // Distinguish "no such order" from "that order was paid in full", because the
  // operator's next move is completely different.
  const any = await findOne(`metadata["order_ref"]:"${orderRef}"`);
  if (any.length === 0) die(`No order ${orderRef} found in ${live ? 'live' : 'test'} mode.`);
  die(
    `Order ${orderRef} was paid in full - there is no balance to invoice.\n` +
      `  ${dash(`invoices/${any[0].id}`)}`
  );
}
if (deposits.length > 1) {
  die(
    `Order ${orderRef} matches ${deposits.length} deposit invoices. Resolve that by hand\n` +
      '  before invoicing a balance - one of them is a duplicate.'
  );
}

const deposit = deposits[0];

if (deposit.status !== 'paid') {
  die(
    `The deposit for ${orderRef} is "${deposit.status}", not paid. The balance is\n` +
      '  invoiced after the deposit clears and the staining is finished.\n' +
      `  ${dash(`invoices/${deposit.id}`)}`
  );
}

const dueLaterCents = Number(deposit.metadata?.due_later_cents);
if (!Number.isInteger(dueLaterCents) || dueLaterCents <= 0) {
  die(`Order ${orderRef} records no outstanding balance (due_later_cents is empty or zero).`);
}

const orderHash = deposit.metadata?.order_hash;
if (!orderHash) {
  die(`Order ${orderRef} has no order_hash in its metadata; refusing to guess an idempotency key.`);
}

const existing = await findOne(
  `metadata["order_hash"]:"${orderHash}" AND metadata["kind"]:"balance"`
);
if (existing.length > 0) {
  die(
    `The balance for ${orderRef} has already been invoiced (${existing[0].status}).\n` +
      `  ${dash(`invoices/${existing[0].id}`)}`
  );
}

const money = cents =>
  (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });

console.log(`\n  Order        ${orderRef}`);
console.log(`  Customer     ${deposit.customer_name ?? '-'} <${deposit.customer_email ?? '-'}>`);
console.log(`  Deposit      ${money(deposit.amount_paid)} paid (${deposit.number ?? deposit.id})`);
console.log(`  Balance      ${money(dueLaterCents)}`);
console.log(`  Mode         ${live ? 'LIVE' : 'test'}`);

if (dryRun) {
  console.log('\n  --dry-run: nothing created.\n');
  process.exit(0);
}

const invoice = await stripe.invoices.create(
  {
    customer: typeof deposit.customer === 'string' ? deposit.customer : deposit.customer.id,
    currency: deposit.currency,
    // A draft, like the deposit. Stripe will never finalise or email it on its
    // own; the whole point is that a person sends it once the piece is done.
    auto_advance: false,
    collection_method: 'send_invoice',
    // Counted from finalisation, so this can sit as a draft indefinitely.
    days_until_due: 7,
    pending_invoice_items_behavior: 'exclude',
    // No tax line below, so nothing for Stripe to disagree with either.
    automatic_tax: { enabled: false },
    description: `Balance on completion - website order ${orderRef}`,
    custom_fields: [{ name: 'Order', value: orderRef.slice(0, 30) }],
    footer: 'Delivery and setup are included. The deposit on this order has been paid.',
    shipping_details: deposit.shipping_details ?? undefined,
    metadata: {
      order_ref: orderRef,
      order_hash: orderHash,
      source: 'balance_script',
      kind: 'balance',
      deposit_invoice_id: deposit.id,
      balance_cents: String(dueLaterCents),
    },
  },
  { idempotencyKey: `${orderHash}:balance` }
);

/*
 * Two calls, and the failure of the second matters - same reasoning as
 * src/lib/quote.ts. If this throws, do NOT delete the invoice: the create key is
 * already bound to that id, so a retry would be handed back the deleted invoice
 * and fail permanently. An empty draft is recoverable by hand; that is not.
 *
 * ONE line, and no tax. All of the order's sales tax was charged on the deposit
 * invoice, which billed the full tax and deferred half of the tax-inclusive
 * total. Adding tax here would charge it twice.
 */
await stripe.invoices.addLines(
  invoice.id,
  {
    lines: [
      {
        description: `Balance on completion - order ${orderRef} (deposit ${deposit.number ?? deposit.id} paid)`,
        amount: dueLaterCents,
        metadata: { kind: 'balance', order_ref: orderRef },
      },
    ],
  },
  { idempotencyKey: `${orderHash}:balance-lines` }
);

// Back-reference, so the deposit invoice points at its balance in the dashboard.
// Best-effort: the balance invoice exists either way, and failing here must not
// make the operator think it does not.
try {
  await stripe.invoices.update(deposit.id, {
    metadata: { ...deposit.metadata, balance_invoice_id: invoice.id },
  });
} catch (err) {
  console.error(`  (could not back-link the deposit invoice: ${err.message})`);
}

console.log(`\n  Draft created. Review it and press Send:`);
console.log(`  ${dash(`invoices/${invoice.id}`)}\n`);
