'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

interface NavLinkProps {
  href: string;
  children: ReactNode;
  className?: string;
  activeClassName?: string;
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
}: NavLinkProps) {
  const pathname = usePathname();
  const isActive =
    href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);

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
