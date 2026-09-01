import 'server-only';
import { fromCents } from './format';
import type { PricedCart, ShippingDetails } from './pricing';
import { variantLabel } from './labels';
import { shippingMethodById } from './order-terms';
import { getStripe } from './stripe-server';
import type { QuoteResult } from './quote';

/**
 * Transactional email, over plain fetch.
 *
 * No SDK, matching src/lib/turnstile.ts, which hand-rolls its Cloudflare call
 * for the same reason: this is one POST with a bearer token and a JSON body,
 * and the runtime dependency list is nine packages precisely because things
 * like this do not get one added for them.
 *
 * Nothing here ever throws. By the time email is attempted the quote is already
 * a durable draft invoice in Stripe - which is the shop's actual worklist - so
 * failing the request would tell a customer their order failed when it did not,
 * and hand them a retry that creates a second invoice.
 */

const ENDPOINT = 'https://api.resend.com/emails';

let warnedUnconfigured = false;

function config(): { key: string; from: string } | null {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.ORDER_FROM_EMAIL;
  if (key && from) return { key, from };
  if (!warnedUnconfigured) {
    warnedUnconfigured = true;
    console.error(
      'Email is not configured: RESEND_API_KEY and ORDER_FROM_EMAIL must both be set. ' +
        'Quotes are still recorded as draft invoices in Stripe, but nobody is notified.'
    );
  }
  return null;
}

/** Customer-supplied strings reach these templates; none of them may inject markup. */
function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const money = (cents: number) =>
  fromCents(cents).toLocaleString('en-US', { style: 'currency', currency: 'USD' });

/*
 * Resend caps a single send at 50 recipients. Nowhere near a shop's worth of
 * staff, but a truncated notification list must not be silent.
 */
const MAX_RECIPIENTS = 50;

/** Deliberately loose. Resend is the real validator; this only catches typos. */
const LOOKS_LIKE_EMAIL = /^[^\s@,]+@[^\s@,]+\.[^\s@,]{2,}$/;

/**
 * Shared with /api/subscribe rather than copied into it.
 *
 * A second regex would drift from this one, and the two would then disagree
 * about which addresses exist - so a signup could be accepted at one endpoint
 * and rejected at the other for the same address, which is the kind of bug
 * nobody reproduces.
 */
export function looksLikeEmail(value: unknown): value is string {
  return typeof value === 'string' && value.length <= 254 && LOOKS_LIKE_EMAIL.test(value.trim());
}

/**
 * Who hears about an order: ORDER_NOTIFICATION_EMAIL, comma-separated.
 *
 *   ORDER_NOTIFICATION_EMAIL=orders@example.com, shop@example.com
 *
 * Parsed rather than passed through, because one malformed entry would
 * otherwise 422 the whole send and nobody would be told about the order at all.
 * A bad address is dropped with a warning naming it; the rest still get the
 * mail. That is the right trade for a notification: partial delivery beats none,
 * and the log says exactly which entry to fix.
 *
 * All recipients go in `to`, not `bcc` - these are colleagues, and seeing who
 * else was notified is useful rather than a disclosure.
 */
function notificationRecipients(): string[] {
  const raw = process.env.ORDER_NOTIFICATION_EMAIL;
  if (!raw) return [];

  const seen = new Set<string>();
  const recipients: string[] = [];
  for (const part of raw.split(',')) {
    const address = part.trim();
    if (!address) continue;
    if (!LOOKS_LIKE_EMAIL.test(address)) {
      console.error(`ORDER_NOTIFICATION_EMAIL: skipping malformed address "${address}".`);
      continue;
    }
    const key = address.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    recipients.push(address);
  }

  if (recipients.length > MAX_RECIPIENTS) {
    console.error(
      `ORDER_NOTIFICATION_EMAIL lists ${recipients.length} addresses; Resend accepts ` +
        `${MAX_RECIPIENTS} per send. The rest will not be notified.`
    );
    return recipients.slice(0, MAX_RECIPIENTS);
  }
  return recipients;
}

/**
 * Where a customer's reply goes.
 *
 * Optional, and which way it should go depends entirely on ORDER_FROM_EMAIL.
 *
 * Sending from a real mailbox on the apex domain - heirloomcribs.care@... -
 * needs nothing here: the apex MX already routes replies to that inbox.
 *
 * Sending from a Resend-verified SUBDOMAIN does. MX records do not inherit
 * downwards, so the apex MX that makes the shop's own address deliverable does
 * nothing for `send.<domain>`; the only MX there is Resend's bounce handler,
 * and a customer hitting Reply would have their message silently discarded.
 * ORDER_REPLY_TO is what points them at an inbox instead.
 *
 * Says once, at info level rather than as an error, where replies will land -
 * unset is a correct configuration in the first case and a broken one in the
 * second, and this file cannot tell which without guessing at DNS.
 */
function replyToAddress(): string | undefined {
  const address = process.env.ORDER_REPLY_TO?.trim();
  if (address) return address;
  if (!notedReplyTo) {
    notedReplyTo = true;
    console.warn(
      'ORDER_REPLY_TO is not set, so customer replies go to ' +
        `${process.env.ORDER_FROM_EMAIL ?? 'the sending address'}. That is correct if it is a ` +
        'real mailbox; if you send from a subdomain verified in Resend, it is not, and replies ' +
        'will be discarded.'
    );
  }
  return undefined;
}

let notedReplyTo = false;

async function send(
  to: string | string[],
  subject: string,
  html: string,
  replyTo?: string
): Promise<boolean> {
  const cfg = config();
  if (!cfg) return false;

  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${cfg.key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: cfg.from, to, subject, html, reply_to: replyTo }),
      // Resend being slow must not push the function past its execution limit
      // and turn a recorded order into a 504.
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      /*
       * The BODY, not just the status.
       *
       * Resend explains itself - "The gmail.com domain is not verified", "You
       * can only send testing emails to your own email address" - and a bare
       * 403 sends whoever is reading the log hunting for an auth problem that
       * is not there. The order itself is fine and this is recoverable by
       * hand, so it has to say what to fix.
       */
      const detail = await res.text().catch(() => '');
      console.error(`Resend rejected "${subject}" (${res.status}) ${detail}`.trim());
      return false;
    }
    return true;
  } catch (err) {
    console.error(`Resend unreachable for "${subject}"`, err);
    return false;
  }
}

function itemRows(priced: PricedCart): string {
  return priced.lines
    .map(line => {
      const variant = variantLabel(line.wood, line.stainName);
      const name = variant ? `${line.productName} — ${variant}` : line.productName;
      return `<tr><td>${esc(name)}${line.quantity > 1 ? ` × ${line.quantity}` : ''}</td><td align="right">${money(line.lineCents)}</td></tr>`;
    })
    .join('');
}

function totalsRows(priced: PricedCart, quote: QuoteResult, taxState: string): string {
  const rows = [
    `<tr><td>Subtotal</td><td align="right">${money(priced.subtotalCents)}</td></tr>`,
    `<tr><td>${esc(shippingMethodById(priced.shippingMethod).name)}</td><td align="right">${money(priced.shippingCents)}</td></tr>`,
    `<tr><td>Sales tax${priced.taxCents > 0 ? ` (${esc(taxState)} 6%)` : ''}</td><td align="right">${money(priced.taxCents)}</td></tr>`,
    `<tr><td><strong>Order total</strong></td><td align="right"><strong>${money(priced.totalCents)}</strong></td></tr>`,
    `<tr><td><strong>Due now</strong></td><td align="right"><strong>${money(quote.split.dueNowCents)}</strong></td></tr>`,
  ];
  if (quote.split.dueLaterCents > 0) {
    rows.push(
      `<tr><td>Due at completion</td><td align="right">${money(quote.split.dueLaterCents)}</td></tr>`
    );
  }
  return rows.join('');
}

/**
 * The customer's acknowledgement. Sent immediately, because the invoice may not
 * be for hours.
 *
 * Written to the payment path the customer actually chose, not to both. The
 * choice is made at checkout, so a deposit buyer being told to "select Affirm"
 * would go looking for an option their invoice will not offer - see the note in
 * src/lib/quote.ts about why Affirm is pay-in-full only. They are told how to
 * switch instead, which is a reply rather than a dead end.
 *
 * Three paths now, because Affirm is its own choice at checkout rather than
 * something a pay-in-full buyer discovers on the invoice. Branching on
 * quote.paymentOption and not on the amounts: an Affirm order and a plain
 * pay-in-full order have identical splits, so the split cannot tell them apart
 * - and it is the customer who asked for Affirm who most needs to be told
 * where the button is.
 */
export function sendQuoteConfirmation(
  priced: PricedCart,
  shipping: ShippingDetails,
  quote: QuoteResult
): Promise<boolean> {
  const takingDeposit = quote.paymentOption === 'deposit';

  /* Sentences rather than paragraphs, so the deposit path can continue the
     first one instead of opening a second block to add one clause to it. */
  const invoiceIsComing = `To get production started, we&rsquo;ll email you a secure Stripe
    invoice, usually within one business day.`;

  /* Identical in all three paths: Affirm decides the terms, we never do, and
     neither this email nor the checkout may imply otherwise. */
  const affirmTerms = `Affirm will show you their available plans, rates and eligibility
    directly; those terms are determined by Affirm and shared with you at that time.`;

  const paymentPath =
    quote.paymentOption === 'affirm'
      ? `<p>${invoiceIsComing}</p>
         <p>You asked to pay over time. When the invoice opens, choose
         <strong>Affirm</strong> and follow their prompts. ${affirmTerms}</p>
         <p>Prefer not to? The same invoice takes a card, and nothing about the order
         changes if you pay it that way instead.</p>`
      : takingDeposit
        ? `<p>${invoiceIsComing} A minimum 50% deposit is all that&rsquo;s needed to begin;
           the remaining balance is invoiced once staining is complete.</p>
           <p>Would you rather spread the cost? Reply to this email and we&rsquo;ll send a
           single pay-in-full invoice instead, which lets you check out with Affirm.
           ${affirmTerms}</p>`
        : `<p>${invoiceIsComing}</p>
           <p>When you open it you can pay by card, or select Affirm and follow their
           prompts. ${affirmTerms}</p>`;

  const html = `
    <p>Thank you from the bottom of our hearts for entrusting us with this special piece
    for your nursery, and for letting us be part of your family&rsquo;s story. We&rsquo;re
    carefully reviewing your order right now.</p>

    <p>Your reference is <strong>${esc(quote.orderRef)}</strong>.
    <strong>Nothing has been charged.</strong></p>

    ${paymentPath}

    <p>Once we receive your ${takingDeposit ? 'deposit' : 'payment'}, we&rsquo;ll look at the
    details you provided and confirm an estimated delivery window along with the shipping
    method that best fits your location and preferences. We&rsquo;ll also give you a call on
    <strong>${esc(shipping.phone)}</strong> to confirm everything before your piece goes
    into production.</p>

    <p>We&rsquo;re truly happy to walk with you through this part of the journey and help
    this heirloom find its way safely into your home.</p>

    <table cellpadding="6">${itemRows(priced)}${totalsRows(priced, quote, shipping.state)}</table>

    <p>Delivering to:<br>${esc(shipping.firstName)} ${esc(shipping.lastName)}<br>
    ${esc(shipping.address)}<br>${esc(shipping.city)}, ${esc(shipping.state)} ${esc(shipping.zip)}</p>
  `;
  return send(shipping.email, `Your Heirloom order ${quote.orderRef}`, html, replyToAddress());
}

/**
 * The shop's alert. Carries everything needed to act from a phone, including a
 * mode-correct dashboard link: a test-mode invoice never appears in the live
 * dashboard, and looking in the wrong one is the first thing everybody does.
 */
export async function sendQuoteAlert(
  priced: PricedCart,
  shipping: ShippingDetails,
  quote: QuoteResult,
  livemode: boolean
): Promise<boolean> {
  const to = notificationRecipients();
  if (to.length === 0) {
    console.error('ORDER_NOTIFICATION_EMAIL is not set; nobody is being told about new quotes.');
    return false;
  }

  const dashboard = await dashboardUrlFor(quote.invoiceId, livemode);
  const paTax =
    priced.taxCents > 0
      ? '<p><em>Pennsylvania order — check the tax line if the buyer is in Philadelphia or Allegheny County, where the rate is higher than the 6% charged here.</em></p>'
      : '';

  /*
   * Said on the alert because the invoice itself cannot say it. An Affirm order
   * and a plain pay-in-full order are the same document - the difference is
   * that this customer has been told, twice, to expect an Affirm button on it.
   * If Affirm is ever switched off on the account, this line is what turns a
   * confused reply into an explicable one.
   */
  const chosePayment =
    quote.paymentOption === 'affirm'
      ? '<p><strong>Customer chose Affirm.</strong> The invoice is pay-in-full; Affirm appears on it as long as it is enabled in payment method settings.</p>'
      : '';

  const html = `
    <p><strong>New quote ${esc(quote.orderRef)}</strong>${livemode ? '' : ' [TEST MODE]'}</p>
    <p>A draft invoice is waiting. Review the stain and the price, then send it:<br>
    <a href="${dashboard}">${dashboard}</a></p>
    ${chosePayment}
    <table cellpadding="6">${itemRows(priced)}${totalsRows(priced, quote, shipping.state)}</table>
    <p>${esc(shipping.firstName)} ${esc(shipping.lastName)}<br>
    ${esc(shipping.email)}<br>
    <a href="tel:${esc(shipping.phone.replace(/[^0-9+]/g, ''))}">${esc(shipping.phone)}</a> —
    call to confirm before production<br>
    ${esc(shipping.address)}<br>${esc(shipping.city)}, ${esc(shipping.state)} ${esc(shipping.zip)}</p>
    ${paTax}
  `;
  return send(to, `[${livemode ? 'Order' : 'TEST'}] New quote ${quote.orderRef} — ${money(quote.split.dueNowCents)} due`, html);
}

// ---------------------------------------------------------------------------
// Payment notifications, driven by the Stripe webhook
// ---------------------------------------------------------------------------

/**
 * A Stripe invoice event, flattened.
 *
 * Built by src/app/api/stripe/webhook/route.ts from the invoice object. Defined
 * here because these templates are its only consumer, and passing a whole
 * Stripe.Invoice into a mail template invites reading fields off it that the
 * webhook has not established are present.
 */
export interface InvoiceEvent {
  invoiceId: string;
  orderRef: string | null;
  /** 'deposit' | 'full' | 'balance', as written by quote.ts or the balance script. */
  kind: string | null;
  status: string;
  amountDueCents: number;
  amountPaidCents: number;
  dueLaterCents: number;
  email: string | null;
  name: string | null;
  hostedInvoiceUrl: string | null;
  livemode: boolean;
}

/**
 * A dashboard link that opens the right invoice on the right account.
 *
 * `dashboard.stripe.com/test/invoices/<id>` is UNSCOPED: it resolves against
 * whichever account the browser session happens to be on. Anyone signed in to
 * more than one Stripe account - which is anyone who has ever used Stripe for
 * something else - gets a 404 on a perfectly good invoice. Scoping the path to
 * the account id makes the link deterministic.
 *
 * Resolved once per process and cached, not per email. On failure it falls back
 * to the unscoped form, which is what we had: worse, but not nothing.
 */
let cachedAccountId: string | null | undefined;

async function stripeAccountId(): Promise<string | null> {
  if (cachedAccountId !== undefined) return cachedAccountId;
  try {
    cachedAccountId = (await getStripe().accounts.retrieveCurrent()).id;
  } catch (err) {
    console.error('Could not resolve the Stripe account id for dashboard links.', err);
    cachedAccountId = null;
  }
  return cachedAccountId;
}

async function dashboardUrlFor(invoiceId: string, livemode: boolean): Promise<string> {
  const account = await stripeAccountId();
  const mode = livemode ? '' : 'test/';
  return account
    ? `https://dashboard.stripe.com/${account}/${mode}invoices/${invoiceId}`
    : `https://dashboard.stripe.com/${mode}invoices/${invoiceId}`;
}

const dashboardUrl = (order: InvoiceEvent) => dashboardUrlFor(order.invoiceId, order.livemode);

const refOf = (order: InvoiceEvent) => order.orderRef ?? order.invoiceId;

/**
 * The shop's payment alert.
 *
 * For a deposit with a balance outstanding this carries the LITERAL command to
 * run when staining is finished. Nothing creates the balance invoice on its own
 * - deliberately, because only a person knows when the piece is done - so this
 * email is the one place the follow-up is recorded. Without it, half the revenue
 * on every order depends on somebody remembering.
 */
export async function sendPaymentAlert(order: InvoiceEvent): Promise<boolean> {
  const to = notificationRecipients();
  if (to.length === 0) {
    console.error('ORDER_NOTIFICATION_EMAIL is not set; nobody is being told about payments.');
    return false;
  }

  const ref = refOf(order);
  const dash = await dashboardUrl(order);
  const balanceOutstanding = order.kind === 'deposit' && order.dueLaterCents > 0;
  const what = order.kind === 'balance' ? 'Balance paid' : balanceOutstanding ? 'Deposit paid' : 'Paid in full';

  const followUp = balanceOutstanding
    ? `<p><strong>${money(order.dueLaterCents)} remains.</strong> When the staining is finished,
       invoice it with:</p>
       <pre style="padding:8px;background:#f4f4f4">node scripts/create-balance-invoice.mjs ${esc(ref)}</pre>
       <p>That creates a draft for review - it does not send anything.</p>`
    : '<p>Nothing further is outstanding on this order.</p>';

  const html = `
    <p><strong>${what} — ${esc(ref)}</strong>${order.livemode ? '' : ' [TEST MODE]'}</p>
    <p>${money(order.amountPaidCents)} received.</p>
    ${followUp}
    <p>${esc(order.name ?? '')} ${order.email ? `&lt;${esc(order.email)}&gt;` : ''}<br>
    <a href="${dash}">${dash}</a></p>
  `;
  // Reply-To is the buyer, as on the quote alert.
  return send(
    to,
    `[${order.livemode ? 'Paid' : 'TEST'}] ${what} ${ref} — ${money(order.amountPaidCents)}`,
    html,
    order.email ?? undefined
  );
}

/** The customer's receipt. Stripe emails its own; this one says what happens next. */
export function sendPaymentReceipt(order: InvoiceEvent): Promise<boolean> {
  if (!order.email) return Promise.resolve(false);

  const ref = refOf(order);
  const next =
    order.kind === 'deposit' && order.dueLaterCents > 0
      ? `<p>Your piece is now in the build queue. The remaining
         <strong>${money(order.dueLaterCents)}</strong> is invoiced once the staining is
         complete — we will email you then, and nothing is charged before that.</p>`
      : '<p>Your order is paid in full. We will be in touch to arrange delivery and setup.</p>';

  const html = `
    <p>Thank you — we have received ${money(order.amountPaidCents)} for order
    <strong>${esc(ref)}</strong>.</p>
    ${next}
  `;
  return send(order.email, `Payment received — order ${ref}`, html, replyToAddress());
}

/** Failed payments go to the shop only. Stripe already tells the customer. */
export async function sendPaymentFailedAlert(order: InvoiceEvent): Promise<boolean> {
  const to = notificationRecipients();
  if (to.length === 0) return false;

  const ref = refOf(order);
  const dash = await dashboardUrl(order);
  const html = `
    <p><strong>Payment failed — ${esc(ref)}</strong>${order.livemode ? '' : ' [TEST MODE]'}</p>
    <p>${money(order.amountDueCents)} is still due from ${esc(order.name ?? 'the customer')}
    ${order.email ? `&lt;${esc(order.email)}&gt;` : ''}.</p>
    <p>Stripe retries on its own schedule; this is only so it is not a surprise.<br>
    <a href="${dash}">${dash}</a></p>
  `;
  return send(
    to,
    `[${order.livemode ? 'Action' : 'TEST'}] Payment failed ${ref}`,
    html,
    order.email ?? undefined
  );
}
