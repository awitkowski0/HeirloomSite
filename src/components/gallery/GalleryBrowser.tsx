'use client';

import { useMemo, useState } from 'react';
import GalleryCard from './GalleryCard';
import GalleryCarousel from './GalleryCarousel';
import { WoodFilter, StainFilter, ALL_WOODS, ALL_STAINS } from './GalleryFilters';
import type { GalleryProduct } from './types';

interface Props {
  products: GalleryProduct[];
  woods: string[];
}

/**
 * Client half of /gallery: filter state and the finishes modal.
 *
 * The product data itself is built on the server and passed in as props, so the
 * grid is in the prerendered HTML rather than appearing after a spinner.
 */
export default function GalleryBrowser({ products, woods }: Props) {
  const [selectedWood, setSelectedWood] = useState(ALL_WOODS);
  const [selectedStain, setSelectedStain] = useState(ALL_STAINS);
  const [carouselSlug, setCarouselSlug] = useState<string | null>(null);

  const availableStains = useMemo(() => {
    const set = new Set<string>();
    for (const product of products) {
      const woodsToScan =
        selectedWood === ALL_WOODS ? product.woods : product.woods.filter(w => w === selectedWood);
      for (const wood of woodsToScan) {
        for (const stain of product.woodStains[wood] || []) set.add(stain.name);
      }
    }
    return [...set].sort();
  }, [products, selectedWood]);

  const visible = useMemo(() => {
    const hasActiveSelection = selectedWood !== ALL_WOODS || selectedStain !== ALL_STAINS;

    return products
      .map(product => {
        const wood =
          selectedWood !== ALL_WOODS && product.woods.includes(selectedWood)
            ? selectedWood
            : product.woods[0];
        if (selectedWood !== ALL_WOODS && !product.woods.includes(selectedWood)) return null;

        const stains = product.woodStains[wood] || [];
        let stain = stains.find(s => s.inStock) || stains[0];
        if (selectedStain !== ALL_STAINS) {
          const match = stains.find(s => s.name === selectedStain);
          // Filtering by a stain this product does not offer hides it, rather
          // than silently showing a different finish.
          if (!match) return null;
          stain = match;
        }

        return {
          product,
          displayImage: stain?.image || stains[0]?.image || '',
          displayPrice: (product.woodPrices[wood] ?? product.minPrice) + (stain?.priceAddition || 0),
          hasActiveSelection,
        };
      })
      .filter((v): v is NonNullable<typeof v> => v !== null);
  }, [products, selectedWood, selectedStain]);

  const carouselProduct = carouselSlug
    ? products.find(p => p.slug === carouselSlug) ?? null
    : null;

  return (
    <>
      <div className="container gallery-header">
        <div className="gallery-filter-stack">
          {/*
            A filter with one option is not a filter. The shop sells Brown Maple
            only, so this renders nothing today -- but the gallery is defined by
            variant type rather than by a hardcoded species, so a second wood
            would bring the control back rather than needing it rebuilt.
          */}
          {woods.length > 1 && (
            <WoodFilter
              woods={woods}
              selected={selectedWood}
              onSelect={w => {
                setSelectedWood(w);
                setSelectedStain(ALL_STAINS);
              }}
              onReset={() => {
                setSelectedWood(ALL_WOODS);
                setSelectedStain(ALL_STAINS);
              }}
            />
          )}
          {/*
            Unconditional. This used to be gated on a wood being selected, which
            with a single wood -- never selected, because the control that would
            select it is gone -- would have hidden the stain filter entirely and
            left the gallery with no filters at all.
          */}
          <StainFilter
            stains={availableStains}
            selected={selectedStain}
            onSelect={s => setSelectedStain(selectedStain === s ? ALL_STAINS : s)}
          />
        </div>
      </div>

      <div className="container">
        <p role="status" aria-live="polite" className="gallery-count">
          Showing {visible.length} of {products.length} pieces
        </p>

        {visible.length === 0 ? (
          <p className="body-lg text-on-surface-variant gallery-empty">
            No pieces match that combination.
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
