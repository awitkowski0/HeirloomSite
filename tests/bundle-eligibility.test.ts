/*
 * The cart must not show a bundle price the server will not charge: pricing.ts
 * only honours bundledWith when the parent's row lists an override for the kit.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { priceCart } from '../src/lib/pricing';
import { chargedSubtotalCents, type PricedCartLineInput } from '../src/lib/cart-pricing';
import { hasBundlePrice } from '../src/lib/bundle-prices';

interface Row {
  productName: string;
  wood: string;
  basePrice: number;
  bundleOverrides?: Array<{ productName: string; wood: string; stainName: string; price: number }>;
  stains: Array<{ name: string; priceAddition?: number; inStock: boolean }>;
}
const pricing = JSON.parse(readFileSync(new URL('../data/pricing.json', import.meta.url), 'utf8')) as Row[];

test('a parent with no override for the kit: cart summary equals the invoice', () => {
  const o = pricing.find(r => r.bundleOverrides?.length)!.bundleOverrides![0];
  const parent = pricing.find(
    r => !r.bundleOverrides?.length && r.productName !== o.productName && r.stains.some(s => s.inStock)
  )!;
  const kit = pricing.find(r => r.productName === o.productName && r.wood === o.wood)!;
  const list = kit.basePrice + (kit.stains.find(s => s.name === o.stainName)?.priceAddition ?? 0);
  const ref = { productName: parent.productName, wood: parent.wood };

  const server = priceCart(
    [
      { ...ref, stainName: parent.stains.find(s => s.inStock)!.name, quantity: 1 },
      { productName: o.productName, wood: o.wood, stainName: o.stainName, quantity: 1, bundledWith: ref },
    ],
    'NJ',
    'threshold'
  );
  const cart: PricedCartLineInput[] = [
    { ...ref, quantity: 1, price: parent.basePrice },
    { productName: o.productName, wood: o.wood, quantity: 1, price: o.price, listPrice: list, bundledWith: ref },
  ];
  assert.equal(chargedSubtotalCents(cart, hasBundlePrice), server.subtotalCents);
});
