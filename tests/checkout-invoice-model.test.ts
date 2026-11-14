import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CARD_OR_AFFIRM,
  INVOICE_FOLLOWS,
  INVOICE_MODEL_NOTICE,
  NO_CARD_AT_CHECKOUT,
} from '../src/lib/invoice-model-copy';

/*
 * Pricing App #59 Merchant cause 1: every checkout step states the invoice
 * model using already-published sentences only.
 */

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel: string) => readFileSync(resolve(root, rel), 'utf8');

test('invoice-model notice is the three published sentences, verbatim', () => {
  assert.equal(
    NO_CARD_AT_CHECKOUT,
    'No card is taken at checkout — the order is a commitment, not a charge.',
  );
  assert.equal(INVOICE_FOLLOWS, 'A secure Stripe invoice follows within 48 hours of your order.');
  assert.equal(CARD_OR_AFFIRM, 'You can pay by credit card or Affirm.');
  assert.equal(
    INVOICE_MODEL_NOTICE,
    `${NO_CARD_AT_CHECKOUT} ${INVOICE_FOLLOWS} ${CARD_OR_AFFIRM}`,
  );

  const faq = read('src/app/faq/page.tsx');
  const about = read('src/app/about-heirloom/page.tsx');
  assert.ok(faq.includes(NO_CARD_AT_CHECKOUT), 'commitment clause must already be on /faq');
  assert.ok(about.includes('No card is taken at checkout.'), 'short No card sentence remains on About');
  assert.ok(faq.includes(INVOICE_FOLLOWS), 'invoice-follows sentence must already be on /faq');
  assert.ok(
    faq.includes(CARD_OR_AFFIRM) || about.includes(CARD_OR_AFFIRM),
    'card-or-Affirm sentence must already be on /faq or About',
  );
});

test('InvoiceModelNote renders only the published notice', () => {
  const src = read('src/components/checkout/InvoiceModelNote.tsx');
  assert.ok(src.includes('INVOICE_MODEL_NOTICE'));
  assert.ok(!src.includes('openingHours'));
});

test('CheckoutClient shows the invoice-model note at cart, form, submit, and confirmation', () => {
  const src = read('src/components/checkout/CheckoutClient.tsx');
  assert.equal(
    (src.match(/<InvoiceModelNote/g) ?? []).length,
    6,
    'expected InvoiceModelNote at loading, empty cart, form, submit, confirmation, and order summary',
  );
  assert.match(src, /Loading your cart[\s\S]*?<InvoiceModelNote/);
  assert.match(src, /Your cart is empty[\s\S]*?<InvoiceModelNote/);
  assert.match(src, /No payment taken today[\s\S]*?<InvoiceModelNote/);
  assert.match(src, /<InvoiceModelNote \/>\s*<button\s+type="submit"/);
  assert.match(src, /Nothing has been charged[\s\S]*?<InvoiceModelNote/);
  assert.match(src, /Order Summary[\s\S]*?<InvoiceModelNote/);
});

test('the same invoice-model notice sits beside Add to cart and under Added to cart', () => {
  const configurator = read('src/components/product/ProductConfigurator.tsx');
  const popup = read('src/components/product/CartPopup.tsx');
  assert.ok(configurator.includes('<InvoiceModelNote'));
  assert.match(
    configurator,
    /addToCartButtonLabel\([\s\S]*?<InvoiceModelNote \/>/,
  );
  assert.ok(popup.includes('<InvoiceModelNote'));
  assert.match(popup, /Added to cart[\s\S]*?<InvoiceModelNote \/>[\s\S]*Go to Cart/);
});
