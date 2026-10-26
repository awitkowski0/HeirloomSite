/*
 * Delivery-area wording on /shipping, /faq, /timeline and /how-conversion-works
 * (Pricing App issue #23; source: Heirloom-Pricing-App mkt/merchant eb85f75,
 * marketing/merchant/delivery-area-wording/RECOMMENDATION.md section 5).
 * Reads each page's source, flattens the JSX to visible text and checks the
 * delivery sentences. "may be available" is deliberate (Google misrepresentation
 * policy): never "are available". Run with `npm test`.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

function pageText(rel: string): string {
  const src = readFileSync(new URL(`../src/app/${rel}/page.tsx`, import.meta.url), 'utf8');
  return src
    .replace(/\{' '\}/g, ' ')
    .replace(/&rsquo;/g, '\u2019')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .replace(/ ([.,;])/g, '$1');
}

const EXPECTED: Array<[string, string]> = [
  ['shipping', 'We deliver in Pennsylvania, New Jersey and Maryland, except some ZIP codes in Newark. Additional delivery areas may be available; contact us through Get Personal Assistance for details and a quote.'],
  ['faq', 'We deliver in Pennsylvania, New Jersey and Maryland, except some ZIP codes in Newark. Additional delivery areas may be available; contact us through Get Personal Assistance for details and a quote. Checkout shows your delivery options and charge once you enter your state and ZIP. See Delivery.'],
  ['timeline', 'We deliver in Pennsylvania, New Jersey and Maryland, except some ZIP codes in Newark; other areas may be available by request and are quoted individually.'],
  ['timeline', 'Delivery ZIP code \u2014 we deliver in Pennsylvania, New Jersey and Maryland, except some ZIP codes in Newark.'],
  ['how-conversion-works', '\u2014 Curbside or White Glove; we deliver in Pennsylvania, New Jersey and Maryland, except some ZIP codes in Newark; other areas may be available by request and are quoted individually.'],
];

for (const [page, sentence] of EXPECTED) {
  test(`/${page} carries the new delivery-area sentence: "${sentence.slice(0, 60)}..."`, () => {
    assert.ok(pageText(page).includes(sentence), `missing on /${page}: ${sentence}`);
  });
}

test('delivery sentences say "may be available", never "are available"', () => {
  for (const [, sentence] of EXPECTED) {
    if (/available/.test(sentence)) assert.match(sentence, /may be available/);
  }
  for (const page of ['shipping', 'faq', 'timeline', 'how-conversion-works']) {
    assert.doesNotMatch(pageText(page), /areas are available/i, `/${page}`);
  }
});

test('old "NYC / North Jersey metro" wording is gone from the four pages', () => {
  for (const page of ['shipping', 'faq', 'timeline', 'how-conversion-works']) {
    const text = pageText(page);
    for (const old of ['NYC', 'North Jersey metro', 'New York City']) {
      assert.ok(!text.includes(old), `/${page} still contains "${old}"`);
    }
  }
});

test('how-conversion-works "what to ask" line uses ZIP', () => {
  assert.ok(pageText('how-conversion-works').includes('(and ZIP in PA, NJ or MD)?'));
});
