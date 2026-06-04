import { useState, useEffect, type ReactNode } from 'react';
import { CartContext } from './useCart';
import type { CartItem } from '../types';

function itemKey(item: CartItem): string {
  const addonKey = (item.addons || [])
    .map(a => `${a.name}:${a.price}:${a.stainName || ''}`)
    .sort()
    .join('|');
  return `${item.productName}|${item.wood}|${item.stainName}|${addonKey}`;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('heirloom_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('heirloom_cart', JSON.stringify(cart));
  }, [cart]);

  const addToCart = (item: CartItem) => {
    setCart(prev => {
      const key = itemKey(item);
      const existing = prev.find(i => itemKey(i) === key);
      if (existing) {
        return prev.map(i => itemKey(i) === key ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(i => i.id !== id));
  };

  const clearCart = () => setCart([]);

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <CartContext.Provider value={{ cart, addToCart, removeFromCart, clearCart, totalItems, subtotal }}>
      {children}
    </CartContext.Provider>
  );
}
