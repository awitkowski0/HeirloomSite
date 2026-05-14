import React, { createContext, useContext, useState, useEffect } from 'react';

export interface CartAddon {
  name: string;
  price: number;
  stainName?: string;
}

export interface CartItem {
  id: string;
  productName: string;
  cribName?: string;
  wood: string;
  stainName: string;
  price: number;
  image: string;
  quantity: number;
  addons?: CartAddon[];
}

function itemKey(item: CartItem): string {
  const addonKey = (item.addons || [])
    .map(a => `${a.name}:${a.price}:${a.stainName || ''}`)
    .sort()
    .join('|');
  return `${item.productName}|${item.wood}|${item.stainName}|${addonKey}`;
}

interface CartContextType {
  cart: CartItem[];
  addToCart: (item: CartItem) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
  totalItems: number;
  subtotal: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const savedCart = localStorage.getItem('heirloom_cart');
      return savedCart ? JSON.parse(savedCart) : [];
    } catch (e) {
      console.error("Failed to parse cart", e);
      return [];
    }
  });

  // Save to localStorage on change
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
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  return (
    <CartContext.Provider value={{ cart, addToCart, removeFromCart, clearCart, totalItems, subtotal }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within a CartProvider");
  return context;
};
