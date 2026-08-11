'use client';

import { useEffect } from 'react';
import { productSelected } from '@/lib/analytics';

/**
 * One delegated click listener for a whole product grid.
 *
 * ProductCard is a server component and should stay one: a listing page renders
 * up to 73 of them, and giving each an onClick would ship and hydrate a client
 * component per tile purely to fire an analytics event. Instead the tiles carry
 * `data-product-name` / `data-product-category`, and this component - mounted
 * once per page - reads them off the closest matching ancestor of the click.
 *
 * Uses the capture phase so the event is recorded even though the click also
 * triggers a client-side navigation.
 */
export default function ListingAnalytics() {
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      const card = target?.closest?.('[data-product-name]') as HTMLElement | null;
      if (!card) return;
      productSelected({
        product_name: card.dataset.productName || '',
        product_category: card.dataset.productCategory,
        source: 'product_listing',
      });
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, []);

  return null;
}
