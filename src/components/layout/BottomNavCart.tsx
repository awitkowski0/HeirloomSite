'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCart } from '@/context/useCart';

/** Cart entry in the mobile bottom nav. Hydration-gated, same as CartBadge. */
export default function BottomNavCart() {
  const { totalItems, hydrated } = useCart();
  const pathname = usePathname();
  const count = hydrated ? totalItems : 0;
  const isActive = pathname === '/checkout';

  return (
    <Link
      href="/checkout"
      className={isActive ? 'nav-item active' : 'nav-item'}
      aria-current={isActive ? 'page' : undefined}
      aria-label={
        count === 0 ? 'Cart, empty' : `Cart, ${count} item${count === 1 ? '' : 's'}`
      }
      style={{ position: 'relative' }}
    >
      <span className="material-symbols-outlined" aria-hidden="true">
        shopping_bag
      </span>
      <span className="nav-label">Cart</span>
      {count > 0 && (
        <span className="cart-badge cart-badge--nav" aria-hidden="true">
          {count}
        </span>
      )}
    </Link>
  );
}
