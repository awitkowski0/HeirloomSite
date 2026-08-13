'use client';

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react';
import { CartContext } from './useCart';
import {
  cartItemId,
  getServerSnapshot,
  getSnapshot,
  itemKey,
  subscribe,
  updateCart,
} from './cartStore';
import type { CartItem } from '@/types';
import { MAX_QUANTITY_PER_LINE } from '@/lib/cart-limits';

export { cartItemId, itemKey } from './cartStore';

export function CartProvider({ children }: { children: ReactNode }) {
  // Server renders getServerSnapshot() (empty); the client swaps to the real
  // cart after hydration without a setState-in-effect cascade.
  const cart = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // `hydrated` gates any UI whose output depends on cart contents. Without it,
  // the server HTML ("cart empty") and the first client render disagree, which
  // is a hydration mismatch, and every visitor sees an empty-cart flash.
  const [hydrated, setHydrated] = useState(false);
  // This is the canonical "has hydration finished" flag: it must flip exactly
  // once, after the first client render, which is by definition a setState in a
  // mount effect. There is no external system to subscribe to here.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setHydrated(true), []);

  const addToCart = useCallback((item: CartItem) => {
    updateCart(prev => {
      const key = itemKey(item);
      const existing = prev.find(i => itemKey(i) === key);
      if (existing) {
        return prev.map(i =>
          itemKey(i) === key
            ? { ...i, quantity: Math.min(i.quantity + (item.quantity || 1), MAX_QUANTITY_PER_LINE) }
            : i
        );
      }
      return [
        ...prev,
        { ...item, id: cartItemId(item), quantity: Math.min(item.quantity || 1, MAX_QUANTITY_PER_LINE) },
      ];
    });
  }, []);

  const removeFromCart = useCallback((id: string) => {
    updateCart(prev => prev.filter(i => i.id !== id));
  }, []);

  const updateQuantity = useCallback((id: string, quantity: number) => {
    if (!Number.isInteger(quantity) || quantity < 1) return;
    updateCart(prev =>
      prev.map(i => (i.id === id ? { ...i, quantity: Math.min(quantity, MAX_QUANTITY_PER_LINE) } : i))
    );
  }, []);

  const clearCart = useCallback(() => updateCart(() => []), []);

  // Memoised: this was previously a fresh object literal on every render, so
  // every consumer (header, configurator, checkout) re-rendered each time.
  const value = useMemo(
    () => ({
      cart,
      hydrated,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      totalItems: cart.reduce((sum, item) => sum + item.quantity, 0),
      subtotal: cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
    }),
    [cart, hydrated, addToCart, removeFromCart, updateQuantity, clearCart]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
