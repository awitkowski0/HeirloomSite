import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanFill, decodeFillHash, encodeFill } from '../src/lib/checkout-fill';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel: string) => readFileSync(resolve(root, rel), 'utf8');

test('a fill link round-trips, including non-ASCII names', () => {
  const payload = {
    shipping: { email: 'ana@example.com', firstName: 'Ána', lastName: 'Núñez', state: 'PA', zip: '18064' },
    method: 'white_glove' as const,
    payment: 'deposit' as const,
  };
  const hash = `#${encodeFill(payload)}`;
  assert.deepEqual(decodeFillHash(hash), payload);
});

test('untrusted payloads are cleaned field by field, never trusted whole', () => {
  const cleaned = cleanFill({
    v: 1,
    s: { email: ' a@b.co ', city: 'x'.repeat(101), state: 'zz', zip: 18064, firstName: '', evil: '<script>' },
    m: 'teleport',
    p: 'free',
  });
  assert.deepEqual(cleaned, { shipping: { email: 'a@b.co' }, method: undefined, payment: undefined });
  assert.equal(cleanFill({ v: 2, s: { email: 'a@b.co' } }), null, 'unknown version');
  assert.equal(cleanFill({ v: 1, s: {} }), null, 'nothing usable');
  assert.equal(cleanFill('nope'), null);
});

test('decodeFillHash ignores other hashes and garbage', () => {
  for (const hash of ['', '#', '#tone=dark', '#fill=', '#fill=%%%', '#fill=bm90IGpzb24', `#fill=${'A'.repeat(5000)}`]) {
    assert.equal(decodeFillHash(hash), null, hash);
  }
});

test('the checkout never submits or ticks the terms from a fill link', () => {
  const src = read('src/components/checkout/CheckoutClient.tsx');
  const effect = src.slice(src.indexOf('decodeFillHash(window.location.hash)'), src.indexOf("capture('checkout_filled_from_chat'"));
  assert.ok(effect.length > 0);
  assert.doesNotMatch(effect, /setAgreedToTerms|handleSubmit|fetch\(/);
  assert.match(effect, /history\.replaceState/, 'the payload is removed from the address bar');
});

test('the staff fill page is noindex, outside the /checkout/* rewrite, and not linked from the site', () => {
  assert.match(read('src/app/staff/checkout-link/page.tsx'), /robots:\s*\{\s*index:\s*false/);
  assert.match(read('src/proxy.ts'), /matcher: '\/checkout\/:path\*'/);
  for (const f of ['src/components/layout/Footer.tsx', 'src/components/layout/HelpMenu.tsx', 'src/app/sitemap.ts']) {
    assert.doesNotMatch(read(f), /staff\/checkout-link/, f);
  }
});
