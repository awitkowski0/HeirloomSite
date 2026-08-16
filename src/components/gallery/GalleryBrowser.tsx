'use client';

import { useMemo, useState } from 'react';
import GalleryCard from './GalleryCard';
import GalleryCarousel from './GalleryCarousel';
import { FinishFilter, ALL_FINISHES } from './GalleryFilters';
import { useDelistedProducts } from '@/lib/useDelistedProducts';
import type { GalleryProduct } from './types';

interface Props {
  products: GalleryProduct[];
}

/**
 * Filterable product grid with a finishes preview.
 *
 * The product data is built on the server and passed in, so the grid is in the
 * prerendered HTML rather than appearing after a spinner. Filter state is
 * useState and deliberately not a query parameter: reading searchParams would
 * opt the route out of static prerendering, which AGENTS.md treats as the one
 * thing this site cannot trade away.
 */
export default function GalleryBrowser({ products }: Props) {
  const [selectedFinish, setSelectedFinish] = useState(ALL_FINISHES);
  const [carouselSlug, setCarouselSlug] = useState<string | null>(null);
  const { isDelisted } = useDelistedProducts();

  const availableFinishes = useMemo(() => {
    const set = new Set<string>();
    for (const product of products) {
      for (const finish of product.finishes) set.add(finish.name);
    }
    return [...set].sort();
  }, [products]);

  const visible = useMemo(() => {
    const hasActiveSelection = selectedFinish !== ALL_FINISHES;

    return products
      .filter(product => !isDelisted(product.slug))
      .map(product => {
        /*
         * Searches every finish, not just the first variant's.
         *
         * The old version looked the selected stain up in woodStains[woods[0]]
         * only. That was invisible while the grid held six wood products whose
         * single variant carried all eleven stains, and would have been wrong
         * the moment a finish-variant product joined it: each of those has one
         * stain per variant, so ten of its eleven finishes lived under a
         * variant this never looked at, and filtering by any of them would
         * have hidden a crib that is available in exactly that finish.
         */
        const finish = hasActiveSelection
          ? product.finishes.find(f => f.name === selectedFinish)
          : product.finishes.find(f => f.inStock) || product.finishes[0];

        // Filtering by a finish this product does not offer hides it, rather
        // than silently showing a different one.
        if (!finish) return null;

        return {
          product,
          displayImage: finish.image || product.finishes[0]?.image || '',
          displayPrice: finish.price,
          hasActiveSelection,
        };
      })
      .filter((v): v is NonNullable<typeof v> => v !== null);
  }, [products, selectedFinish, isDelisted]);

  const carouselProduct = carouselSlug
    ? products.find(p => p.slug === carouselSlug) ?? null
    : null;

  return (
    <>
      <div className="container gallery-header">
        <div className="gallery-filter-stack">
          <FinishFilter
            finishes={availableFinishes}
            selected={selectedFinish}
            onSelect={f => setSelectedFinish(selectedFinish === f ? ALL_FINISHES : f)}
          />
        </div>
      </div>

      <div className="container">
        <p role="status" aria-live="polite" className="gallery-count">
          Showing {visible.length} of {products.length} pieces
        </p>

        {visible.length === 0 ? (
          <p className="body-lg text-on-surface-variant gallery-empty">
            No pieces match that finish.
          </p>
        ) : (
          <div className="gallery-grid">
            {visible.map(v => (
              <GalleryCard
                key={v.product.slug}
                product={v.product}
                displayImage={v.displayImage}
                displayPrice={v.displayPrice}
                hasActiveSelection={v.hasActiveSelection}
                onOpenFinishes={() => setCarouselSlug(v.product.slug)}
              />
            ))}
          </div>
        )}
      </div>

      <GalleryCarousel product={carouselProduct} onClose={() => setCarouselSlug(null)} />
    </>
  );
}
