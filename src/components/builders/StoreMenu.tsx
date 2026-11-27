'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { useSelectedLayoutSegment } from 'next/navigation';
import StoreSearch from './StoreSearch';

/*
 * Home, one entry per collection or piece type, then a search limited to this
 * builder. On a phone the entries slide sideways inside their own scroller, so
 * the page itself never scrolls sideways.
 */
export default function StoreMenu({
  builderName,
  home,
  sections,
  slugs,
}: {
  builderName: string;
  home: string;
  sections: readonly { slug: string; name: string }[];
  slugs: readonly string[];
}) {
  const active = useSelectedLayoutSegment();
  const rail = useRef<HTMLElement>(null);

  // Keep the current section in view in the scroller, without moving the page.
  useEffect(() => {
    const scroller = rail.current;
    const current = scroller?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!scroller || !current) return;
    scroller.scrollLeft = current.offsetLeft - 16;
  }, [active]);

  return (
    <div className="store-menu">
      <nav ref={rail} className="store-menu__rail" aria-label={`${builderName} store`}>
        <ul>
          <li>
            <Link href={home} aria-current={active === null ? 'page' : undefined}>
              Home
            </Link>
          </li>
          {sections.map(s => (
            <li key={s.slug}>
              <Link href={`${home}/${s.slug}`} aria-current={active === s.slug ? 'page' : undefined}>
                {s.name}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <StoreSearch builderName={builderName} slugs={slugs} />
    </div>
  );
}
