'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/*
 * First-appearance entrances for sections below the fold, and the switch that
 * lets filtered-in cards fade. One listener for the whole site, DOM only, so no
 * page or card needs to hydrate to get it.
 *
 * Only elements that are below the viewport are ever hidden, so nothing above
 * the fold fades and nothing can flash. A Back navigation skips it: the browser
 * is restoring the scroll offset and the shopper should land on a settled page.
 */
const SELECTOR = 'main .section, main .detail, main .store-block, main .grid > .piece, main .grid > .piece-link';

export default function MotionRoot() {
  const pathname = usePathname();
  const routeKey = pathname?.replace(/^(\/product\/[^/]+)\/.*/, '$1') ?? pathname;

  useEffect(() => {
    let popped = false;
    const onPop = () => {
      popped = true;
      document.documentElement.toggleAttribute('data-vt-off', true);
      window.setTimeout(() => document.documentElement.removeAttribute('data-vt-off'), 700);
    };
    const onHash = () => {
      document.querySelectorAll<HTMLElement>('.browser .grid').forEach(g => {
        g.dataset.settled = '';
      });
    };
    window.addEventListener('popstate', onPop);
    window.addEventListener('hashchange', onHash);
    (window as unknown as { __heirloomPopped?: () => boolean }).__heirloomPopped = () => {
      const was = popped;
      popped = false;
      return was;
    };
    return () => {
      window.removeEventListener('popstate', onPop);
      window.removeEventListener('hashchange', onHash);
    };
  }, []);

  useEffect(() => {
    const popped = (window as unknown as { __heirloomPopped?: () => boolean }).__heirloomPopped?.();
    if (popped || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const pending = [...document.querySelectorAll<HTMLElement>(SELECTOR)].filter(
      el => !el.dataset.reveal && el.getBoundingClientRect().top > window.innerHeight + 40,
    );
    if (pending.length === 0) return;
    pending.forEach((el, i) => {
      el.dataset.reveal = 'pending';
      // Card stagger on first reveal only, and short: the row after the first four arrives together.
      el.style.setProperty('--reveal-i', String(Math.min(i % 4, 3)));
    });
    const observer = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          (entry.target as HTMLElement).dataset.reveal = 'in';
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: '0px 0px -8% 0px' },
    );
    pending.forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, [routeKey]);

  return null;
}
