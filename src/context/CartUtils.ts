import type { CartItem } from '../types';

export function itemKey(item: CartItem): string {
  const addonKey = (item.addons || [])
    .map(a => `${a.name}:${a.price}:${a.stainName || ''}`)
    .sort()
    .join('|');
  return `${item.productName}|${item.wood}|${item.stainName}|${addonKey}`;
}

export function addItemToCart(prev: CartItem[], item: CartItem): CartItem[] {
  const key = itemKey(item);
  const existing = prev.find(i => itemKey(i) === key);
  if (existing) {
    return prev.map(i => itemKey(i) === key ? { ...i, quantity: i.quantity + 1 } : i);
  }
  return [...prev, { ...item, quantity: 1 }];
}
