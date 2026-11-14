import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { formatPrice } from '../src/lib/format';
import {
  addToCartButtonLabel,
  initialBundleSelectedSlugs,
} from '../src/lib/bundle-selection';

/*
 * Pricing App #59 Merchant cause 4: optional add-ons start unchecked, and
 * the main button shows the listed product price until the shopper selects
 * add-ons.
 */

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const configurator = readFileSync(
  resolve(root, 'src/components/product/ProductConfigurator.tsx'),
  'utf8',
);

test('optional add-ons start unchecked by default', () => {
  const selected = initialBundleSelectedSlugs();
  assert.equal(selected.size, 0);
  assert.ok(!selected.has('toddler-kit'));
  assert.ok(configurator.includes('initialBundleSelectedSlugs()'));
  assert.ok(!configurator.includes('!i.startsUnchecked'));
});

test('main button shows the listed product price until add-ons are selected', () => {
  const listed = 2300;
  assert.equal(
    addToCartButtonLabel({
      stainSelected: true,
      listedPrice: listed,
      selectedAddOnCount: 0,
      cartTotal: listed,
    }),
    `ADD TO CART — ${formatPrice(listed)}`,
  );
  assert.ok(addToCartButtonLabel({
    stainSelected: true,
    listedPrice: listed,
    selectedAddOnCount: 0,
    cartTotal: listed,
  }).includes(formatPrice(2300)));

  assert.equal(
    addToCartButtonLabel({
      stainSelected: true,
      listedPrice: listed,
      selectedAddOnCount: 2,
      cartTotal: 2680,
    }),
    `ADD 3 ITEMS — ${formatPrice(2680)}`,
  );

  assert.equal(
    addToCartButtonLabel({
      stainSelected: false,
      listedPrice: listed,
      selectedAddOnCount: 0,
      cartTotal: listed,
    }),
    'OUT OF STOCK',
  );

  assert.ok(configurator.includes('addToCartButtonLabel('));
  assert.ok(configurator.includes('listedPrice: totalPrice'));
});
