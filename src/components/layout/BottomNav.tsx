'use client';

import MobileSearchTrigger from '@/components/search/MobileSearchTrigger';
import { usePathname } from 'next/navigation';
import NavLink from './NavLink';
import BottomNavCart from './BottomNavCart';

/*
 * Five items, not six.
 *
 * The bar previously carried Showroom, Gallery, Products, Search, Contact and
 * Cart. At 390px that is six tracked-caps labels in 360 usable pixels, and the
 * last one was clipped off the right edge. "Showroom" goes: the wordmark in
 * the header is already the link home, and it is the only item here that
 * duplicates something always on screen.
 */
const ITEMS = [
  { href: '/products', icon: 'collections_bookmark', label: 'Shop' },
  { href: '/products/cribs', icon: 'crib', label: 'Cribs' },
] as const;

/**
 * The most specific item that matches, or none.
 *
 * Shop's href is a prefix of Cribs's, so neither per-link rule works alone:
 * prefix matching lit both on /products/cribs - two items highlighted and two
 * elements claiming aria-current="page", which tells a screen reader the page
 * is in two places - while exact matching left /products/dressers with nothing
 * marked at all. Longest match gives Shop on /products/dressers and Cribs on
 * /products/cribs, which is what both look like they should do.
 */
function activeHref(pathname: string): string | null {
  let best: string | null = null;
  for (const item of ITEMS) {
    const matches = pathname === item.href || pathname.startsWith(`${item.href}/`);
    if (matches && (best === null || item.href.length > best.length)) best = item.href;
  }
  return best;
}

/**
 * Mobile bottom navigation.
 *
 * Labelled, unlike before: the page previously had two <nav> landmarks and only
 * the header one was named, so screen-reader users got an ambiguous
 * "navigation" landmark here.
 */
export default function BottomNav() {
  const pathname = usePathname();
  const active = activeHref(pathname);

  return (
    <nav className="bottom-nav" aria-label="Primary">
      {ITEMS.map(item => (
        <NavLink
          key={item.href}
          href={item.href}
          className="nav-item"
          active={active === item.href}
        >
          <span className="material-symbols-outlined" aria-hidden="true">
            {item.icon}
          </span>
          <span className="nav-label">{item.label}</span>
        </NavLink>
      ))}
      <MobileSearchTrigger />
      <NavLink href="/contact" className="nav-item">
        <span className="material-symbols-outlined" aria-hidden="true">
          mail
        </span>
        <span className="nav-label">Help</span>
      </NavLink>
      <BottomNavCart />
    </nav>
  );
}
