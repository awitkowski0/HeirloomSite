import 'server-only';
import { fromCents } from './format';
import type { PricedCart, ShippingDetails } from './pricing';
import { variantLabel } from './labels';
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

async function send(to: string, subject: string, html: string): Promise<boolean> {
  const cfg = config();
  if (!cfg) return false;

  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${cfg.key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: cfg.from, to, subject, html }),
      // Resend being slow must not push the function past its execution limit
      // and turn a recorded order into a 504.
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      // Loud, and with the subject, because the order itself is fine and this
      // is recoverable by hand from the logs.
      console.error(`Resend rejected "${subject}" (${res.status})`);
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
    `<tr><td>Delivery</td><td align="right">Included</td></tr>`,
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

/** Itemised acknowledgement. Sent immediately, because the invoice may not be for hours. */
export function sendQuoteConfirmation(
  priced: PricedCart,
  shipping: ShippingDetails,
  quote: QuoteResult
): Promise<boolean> {
  const html = `
    <p>Thank you — we have your order, reference <strong>${esc(quote.orderRef)}</strong>.</p>
    <p><strong>Nothing has been charged.</strong> We are reviewing your order now and will
    email you an invoice from Stripe, usually within one business day.
    ${quote.split.dueLaterCents > 0 ? 'Your 50% deposit is due when it arrives; the balance is invoiced once staining is complete.' : ''}</p>
    <table cellpadding="6">${itemRows(priced)}${totalsRows(priced, quote, shipping.state)}</table>
    <p>Delivering to:<br>${esc(shipping.firstName)} ${esc(shipping.lastName)}<br>
    ${esc(shipping.address)}<br>${esc(shipping.city)}, ${esc(shipping.state)} ${esc(shipping.zip)}</p>
  `;
  return send(shipping.email, `Your Heirloom order ${quote.orderRef}`, html);
}

/**
 * The shop's alert. Carries everything needed to act from a phone, including a
 * mode-correct dashboard link: a test-mode invoice never appears in the live
 * dashboard, and looking in the wrong one is the first thing everybody does.
 */
export function sendQuoteAlert(
  priced: PricedCart,
  shipping: ShippingDetails,
  quote: QuoteResult,
  livemode: boolean
): Promise<boolean> {
  const to = process.env.ORDER_NOTIFICATION_EMAIL;
  if (!to) {
    console.error('ORDER_NOTIFICATION_EMAIL is not set; nobody is being told about new quotes.');
    return Promise.resolve(false);
  }

  const dashboard = `https://dashboard.stripe.com/${livemode ? '' : 'test/'}invoices/${quote.invoiceId}`;
  const paTax =
    priced.taxCents > 0
      ? '<p><em>Pennsylvania order — check the tax line if the buyer is in Philadelphia or Allegheny County, where the rate is higher than the 6% charged here.</em></p>'
      : '';

  const html = `
    <p><strong>New quote ${esc(quote.orderRef)}</strong>${livemode ? '' : ' [TEST MODE]'}</p>
    <p>A draft invoice is waiting. Review the stain and the price, then send it:<br>
    <a href="${dashboard}">${dashboard}</a></p>
    <table cellpadding="6">${itemRows(priced)}${totalsRows(priced, quote, shipping.state)}</table>
    <p>${esc(shipping.firstName)} ${esc(shipping.lastName)}<br>
    ${esc(shipping.email)}<br>
    ${esc(shipping.address)}<br>${esc(shipping.city)}, ${esc(shipping.state)} ${esc(shipping.zip)}</p>
    ${paTax}
  `;
  return send(to, `[${livemode ? 'Order' : 'TEST'}] New quote ${quote.orderRef} — ${money(quote.split.dueNowCents)} due`, html);
}
