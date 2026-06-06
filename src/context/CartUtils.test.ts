import { test, describe } from 'node:test';
import assert from 'node:assert';
import { itemKey, addItemToCart } from './CartUtils.ts';
import type { CartItem } from '../types';

const baseItem: CartItem = {
  id: '1',
  productName: 'Crib',
  wood: 'Oak',
  stainName: 'Natural',
  price: 100,
  image: 'img.png',
  quantity: 1
};

describe('itemKey', () => {
  test('generates key for item without addons', () => {
    const key = itemKey(baseItem);
    assert.strictEqual(key, 'Crib|Oak|Natural|');
  });

  test('generates key for item with addons', () => {
    const itemWithAddons: CartItem = {
      ...baseItem,
      addons: [{ name: 'Rail', price: 20, stainName: 'Natural' }]
    };
    const key = itemKey(itemWithAddons);
    assert.strictEqual(key, 'Crib|Oak|Natural|Rail:20:Natural');
  });

  test('sorts addons to ensure deterministic key', () => {
    const item1: CartItem = {
      ...baseItem,
      addons: [
        { name: 'A', price: 10 },
        { name: 'B', price: 20 }
      ]
    };
    const item2: CartItem = {
      ...baseItem,
      addons: [
        { name: 'B', price: 20 },
        { name: 'A', price: 10 }
      ]
    };
    assert.strictEqual(itemKey(item1), itemKey(item2));
  });

  test('different products have different keys', () => {
    const item2 = { ...baseItem, productName: 'Bed' };
    assert.notStrictEqual(itemKey(baseItem), itemKey(item2));
  });

  test('different wood types have different keys', () => {
    const item2 = { ...baseItem, wood: 'Maple' };
    assert.notStrictEqual(itemKey(baseItem), itemKey(item2));
  });

  test('different stains have different keys', () => {
    const item2 = { ...baseItem, stainName: 'Dark' };
    assert.notStrictEqual(itemKey(baseItem), itemKey(item2));
  });
});

describe('addItemToCart', () => {
  test('adds item to empty cart', () => {
    const cart: CartItem[] = [];
    const newCart = addItemToCart(cart, baseItem);
    assert.strictEqual(newCart.length, 1);
    assert.strictEqual(newCart[0].productName, 'Crib');
    assert.strictEqual(newCart[0].quantity, 1);
  });

  test('adds new item to non-empty cart', () => {
    const cart: CartItem[] = [baseItem];
    const newItem = { ...baseItem, id: '2', productName: 'Bed' };
    const newCart = addItemToCart(cart, newItem);
    assert.strictEqual(newCart.length, 2);
    assert.strictEqual(newCart[1].productName, 'Bed');
  });

  test('increments quantity for existing item', () => {
    const cart: CartItem[] = [{ ...baseItem, quantity: 1 }];
    const newCart = addItemToCart(cart, baseItem);
    assert.strictEqual(newCart.length, 1);
    assert.strictEqual(newCart[0].quantity, 2);
  });

  test('existing item check considers addons', () => {
    const itemWithAddon: CartItem = {
      ...baseItem,
      addons: [{ name: 'Rail', price: 20 }]
    };
    const cart: CartItem[] = [baseItem];
    const newCart = addItemToCart(cart, itemWithAddon);
    assert.strictEqual(newCart.length, 2);
    assert.strictEqual(newCart[0].quantity, 1);
    assert.strictEqual(newCart[1].quantity, 1);
  });
});
