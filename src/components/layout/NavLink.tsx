'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

interface NavLinkProps {
  href: string;
  children: ReactNode;
  className?: string;
  activeClassName?: string;
  /**
   * Match this href only, not its descendants.
   *
   * The prefix match is right for a section link - /safety should stay marked
   * on /safety/anything - and wrong for a link that is a SIBLING of the paths
   * beneath it. "All" points at /products while every category points at
   * /products/<slug>, so the prefix rule lit All up on every category page:
   * two items highlighted at once, and two elements claiming
   * aria-current="page", which tells a screen reader the page is two places.
   */
  exact?: boolean;
  /**
   * Decide activeness for this link from outside.
   *
   * For a nav where one item's href is a prefix of another's, no per-link rule
   * gets it right: exact matching leaves /products/dressers with nothing
   * marked, and prefix matching marks both Shop and Cribs on /products/cribs.
   * Only the nav as a whole can see that Cribs is the more specific match, so
   * it decides and passes the answer down.
   */
  active?: boolean;
}

/**
 * Navigation link that marks the current page.
 *
 * The stylesheet has styled `.nav-item.active` since forever, but nothing ever
 * applied the class - so the current-page indicator was dead code both visually
 * and semantically, and no aria-current existed anywhere on the site.
 */
export default function NavLink({
  href,
  children,
  className = 'nav-text-link',
  activeClassName = 'active',
  exact = false,
  active,
}: NavLinkProps) {
  const pathname = usePathname();
  const computed =
    href === '/' || exact
      ? pathname === href
      : pathname === href || pathname.startsWith(`${href}/`);
  const isActive = active ?? computed;

  return (
    <Link
      href={href}
      className={isActive ? `${className} ${activeClassName}` : className}
      aria-current={isActive ? 'page' : undefined}
    >
      {children}
    </Link>
  );
}
