/*
 * Delivery-area wording on /shipping, /faq, /timeline and /how-conversion-works
 * (Pricing App issue #23; source: Heirloom-Pricing-App mkt/merchant eb25fc4 (v3),
 * marketing/merchant/delivery-area-wording/RECOMMENDATION.md section 5).
 * Reads each page's source, flattens the JSX to visible text and checks the
 * delivery sentences. "may be available" is deliberate (Google misrepresentation
 * policy): never "are available". Run with `npm test`.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

function pageText(rel: string): string {
  const src = readFileSync(new URL(`../src/app/${rel}/page.tsx`, import.meta.url), 'utf8');
  return src
    .replace(/\{' '\}/g, ' ')
    .replace(/&rsquo;/g, '\u2019')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .replace(/ ([.,;])/g, '$1');
}

// Copy v2 (Brand writer pass + proof pass, 2026-11-01): same facts, plainer wording.
// Round 2: Brand #114 D13; D12 'Newark, NJ' (order-terms.ts EXCLUDED_METRO_ZIPS); D14 'contact us'.
const EXPECTED: Array<[string, string]> = [
  ['shipping', 'We deliver in Pennsylvania, New Jersey and Maryland. Delivery to some ZIP codes in Newark, NJ is quoted individually. Other areas may be available on request, so contact us for details and a quote.'],
  ['faq', 'We deliver in Pennsylvania, New Jersey and Maryland. Delivery to some ZIP codes in Newark, NJ is quoted individually. Other areas may be available on request, so contact us for details and a quote. Once you enter your state and ZIP at checkout, you\u2019ll see your delivery options and the charge. If your ZIP needs a quote, checkout will ask you to contact us. See Delivery.'],
  ['timeline', 'We deliver in Pennsylvania, New Jersey and Maryland. Delivery to some ZIP codes in Newark, NJ is quoted individually. Other areas may be available on request, so contact us for a quote.'],
  ['timeline', 'Delivery ZIP code: we deliver in Pennsylvania, New Jersey and Maryland, and some Newark, NJ ZIP codes are quoted individually.'],
  ['how-conversion-works', '\u2014 Curbside or White Glove. We deliver in Pennsylvania, New Jersey and Maryland. Delivery to some ZIP codes in Newark, NJ is quoted individually. Other areas may be available on request, so contact us for a quote.'],
];

const PAGES = ['shipping', 'faq', 'timeline', 'how-conversion-works'];
const BANNED = ['not able to deliver', 'except some ZIP', 'NYC', 'North Jersey', 'are available'];

for (const [page, sentence] of EXPECTED) {
  test(`/${page} carries the v3 delivery-area sentence: "${sentence.slice(0, 60)}..."`, () => {
    assert.ok(pageText(page).includes(sentence), `missing on /${page}: ${sentence}`);
  });
}

test('delivery sentences say "may be available", never "are available"', () => {
  for (const [, sentence] of EXPECTED) {
    if (/available/.test(sentence)) assert.match(sentence, /may be available/);
  }
  for (const page of PAGES) {
    assert.ok(pageText(page).includes('may be available'), `/${page}`);
    assert.ok(!pageText(page).includes('are available'), `/${page} says "are available"`);
  }
});

test('how-conversion-works "what to ask" line uses ZIP', () => {
  assert.ok(pageText('how-conversion-works').includes('(and ZIP in PA, NJ or MD)?'));
});

function tsxFiles(dir: URL): URL[] {
  const out: URL[] = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const u = new URL(e.name + (e.isDirectory() ? '/' : ''), dir);
    if (e.isDirectory()) out.push(...tsxFiles(u));
    else if (e.name.endsWith('.tsx')) out.push(u);
  }
  return out;
}

test('no flat no / old metro wording anywhere in src/ page copy (src/app, src/components)', () => {
  const files = [
    ...tsxFiles(new URL('../src/app/', import.meta.url)),
    ...tsxFiles(new URL('../src/components/', import.meta.url)),
  ];
  assert.ok(files.length > 10);
  for (const f of files) {
    const src = readFileSync(f, 'utf8').replace(/\s+/g, ' ');
    for (const phrase of ['not able to deliver', 'except some ZIP', 'NYC', 'North Jersey']) {
      assert.ok(!src.includes(phrase), `${f.pathname.split('/src/')[1]} contains "${phrase}"`);
    }
  }
});

test('none of the banned phrases appear in the visible text of the four pages', () => {
  for (const page of PAGES) {
    const text = pageText(page);
    for (const phrase of [...BANNED, 'New York City']) {
      assert.ok(!text.includes(phrase), `/${page} contains "${phrase}"`);
    }
  }
});
