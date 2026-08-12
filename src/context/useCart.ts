'use client';

import { createContext, useContext } from 'react';
import type { CartItem } from '@/types';

export interface CartContextType {
  cart: CartItem[];
  /**
   * False until the cart has been read from localStorage on the client.
   *
   * The server prerenders with an empty cart because localStorage does not
   * exist there. Any UI whose output depends on cart contents must wait for
   * this, or the server HTML and the first client render disagree and React
   * throws a hydration mismatch. It also stops every visitor seeing a
   * "your cart is empty" flash before their real cart loads.
   */
  hydrated: boolean;
  addToCart: (item: CartItem) => void;
  removeFromCart: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  subtotal: number;
}

export const CartContext = createContext<CartContextType | undefined>(undefined);

export function useCart(): CartContextType {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within a CartProvider');
  return context;
}
