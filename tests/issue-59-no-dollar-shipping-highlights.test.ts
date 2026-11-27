import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  EXTRA_PRODUCT_HIGHLIGHTS,
  SHARED_PRODUCT_HIGHLIGHTS,
  merchantFeedXml,
} from '../src/lib/merchant-feed';
import { getInventory } from '../src/lib/content';

/*
 * Pricing App #59 / HS #168 rework: shared feed highlights must not publish
 * shipping dollar amounts (Phil's no-published-rates rule). Checkout still
 * computes the charge for an order; that is out of this test.
 */

const DOLLAR_SHIPPING = /\$\s*[\d,]+/;

function tags(xml: string, name: string): string[] {
  const re = new RegExp(`<${name}>([\\s\\S]*?)</${name}>`, 'g');
  return [...xml.matchAll(re)].map(m => m[1]);
}

test('shared and extra feed highlights contain no dollar shipping amounts', () => {
  for (const line of SHARED_PRODUCT_HIGHLIGHTS) {
    assert.doesNotMatch(line, DOLLAR_SHIPPING, line);
  }
  for (const lines of Object.values(EXTRA_PRODUCT_HIGHLIGHTS)) {
    for (const line of lines) {
      assert.doesNotMatch(line, DOLLAR_SHIPPING, line);
    }
  }
  assert.match(SHARED_PRODUCT_HIGHLIGHTS[1], /Shipping is charged/);
  assert.match(SHARED_PRODUCT_HIGHLIGHTS[1], /Curbside or White Glove/);
  assert.doesNotMatch(SHARED_PRODUCT_HIGHLIGHTS.join('\n'), /starts at/);
});

test('every g:product_highlight in the built feed is dollar-free', () => {
  const xml = merchantFeedXml(getInventory());
  const bullets = tags(xml, 'g:product_highlight');
  assert.ok(bullets.length >= 136 * 4);
  for (const h of bullets) {
    assert.doesNotMatch(h, DOLLAR_SHIPPING, h);
  }
});

test('merchant-feed source does not hard-code a $ shipping amount in highlight copy', () => {
  const src = readFileSync(new URL('../src/lib/merchant-feed.ts', import.meta.url), 'utf8');
  const highlightBlock = src.slice(
    src.indexOf('SHARED_PRODUCT_HIGHLIGHTS'),
    src.indexOf('EXTRA_PRODUCT_HIGHLIGHTS') + 800,
  );
  assert.doesNotMatch(highlightBlock, DOLLAR_SHIPPING);
});
