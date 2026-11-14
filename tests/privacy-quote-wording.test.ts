import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/*
 * Pricing App #59 Merchant spec (comment 6871307365) Cause 1, Brand round 2
 * on HeirloomSite #144: /privacy no longer calls a placed order a "quote".
 */

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const privacy = readFileSync(resolve(root, 'src/app/privacy/page.tsx'), 'utf8');

test('/privacy replaces the three Brand-specified quote lines', () => {
  assert.ok(
    privacy.includes(
      'When you place an order, we collect your name, email address, shipping address and phone number, along with the items you configured.',
    ),
  );
  assert.ok(!privacy.includes('When you request a quote'));
  assert.ok(
    privacy.includes(
      'tells us which of our ads led to an order and lets Meta show our ads to people who have visited.',
    ),
  );
  assert.ok(!privacy.includes('led to a quote'));
  assert.ok(privacy.includes('checks that checkout submissions and list signups'));
  assert.ok(!privacy.includes('quote requests'));
  assert.doesNotMatch(privacy, /\bquote\b/i);
});
