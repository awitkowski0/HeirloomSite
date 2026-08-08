'use client';

import Link from 'next/link';
import { useCart } from '@/context/useCart';

/**
 * The cart link and its item-count badge.
 *
 * Gated on `hydrated`: the server prerenders with an empty cart (no
 * localStorage), so rendering a count before the client read completes is a
 * guaranteed hydration mismatch. Until then we render the link with its
 * empty-cart label and no badge, which matches the server exactly.
 */
export default function CartBadge() {
  const { totalItems, hydrated } = useCart();
  const count = hydrated ? totalItems : 0;

  return (
    <Link
      href="/checkout"
      className="icon-btn"
      style={{ position: 'relative' }}
      aria-label={
        count === 0 ? 'Shopping cart, empty' : `Shopping cart, ${count} item${count === 1 ? '' : 's'}`
      }
    >
      <span className="material-symbols-outlined" aria-hidden="true">
        shopping_bag
      </span>
      {count > 0 && (
        <span className="cart-badge" aria-hidden="true">
          {count}
        </span>
      )}
    </Link>
  );
}
