/*
 * Invoice / order-confirmation timing copy (Phil, Oct 26): every line that says
 * when the invoice arrives must say "within 48 hours of the order", never "one
 * business day" or similar. The 48-hour CANCELLATION window and the legal
 * pages' other day counts (e.g. "within 5 business days" for damage reports)
 * are separate rules and are not checked here.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const read = (rel: string) => readFileSync(join(process.cwd(), rel), 'utf8');

// Every customer-facing file that states when the invoice is sent.
const INVOICE_TIMING_FILES = [
  'src/app/page.tsx',
  'src/app/faq/page.tsx',
  'src/app/timeline/page.tsx',
  'src/app/returns/page.tsx',
  'src/app/terms/page.tsx',
  'src/components/checkout/CheckoutClient.tsx',
  'src/components/checkout/TermsBlock.tsx',
  'src/lib/email.ts',
];

const OLD_TIMING =
  '(one|1|next|same)\\s+business\\s+day|within\\s+(a|one)\\s+day|within\\s+24\\s+hours|by\\s+the\\s+next';
// "invoice" followed by old timing wording in the same sentence. Scoped to the
// invoice sentence so the FAQ's support-reply hours ("same business day ...
// next business day" for a Personal Assistance request) are not caught.
const OLD_INVOICE_TIMING = new RegExp(`invoice[^.;]{0,160}?(${OLD_TIMING})`, 'i');

test('no invoice-timing sentence still says "one business day" (or a 24-hour / next-day variant)', () => {
  for (const f of INVOICE_TIMING_FILES) {
    const hit = read(f).replace(/\s+/g, ' ').match(OLD_INVOICE_TIMING);
    assert.equal(hit, null, `${f} still has old invoice timing: "${hit?.[0]}"`);
  }
});

test('every invoice-timing file says "within 48 hours of the order"', () => {
  for (const f of INVOICE_TIMING_FILES) {
    assert.match(read(f).replace(/\s+/g, ' '), /within 48 hours of the order/, `${f} lacks the 48-hour wording`);
  }
});

test('home page Confirm Order step uses the 48-hour invoice line', () => {
  assert.ok(
    read('src/app/page.tsx').includes(
      'A secure Stripe invoice follows within 48 hours of the order. A minimum 50% deposit begins production.',
    ),
  );
});
