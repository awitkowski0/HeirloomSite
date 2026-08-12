'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Modal from '@/components/ui/Modal';
import { productSelected } from '@/lib/analytics';
import { getStainColor, stainLabel } from '@/lib/stainColors';
import { formatPriceApprox } from '@/lib/format';
import { humanizeWood } from '@/lib/labels';
import type { GalleryProduct } from './types';

interface Props {
  product: GalleryProduct | null;
  onClose: () => void;
}

/**
 * Finish preview for a gallery product.
 *
 * The wood and stain chips actually work now. They previously rendered as
 * focusable <button>s with no onClick whatsoever, so keyboard users tabbed
 * through N+M controls that did nothing. The price was also reading
 * priceAddition rather than the base price, so it displayed "$0" for every
 * product whose stains carry no surcharge - which is all of them.
 */
export default function GalleryCarousel({ product, onClose }: Props) {
  const [wood, setWood] = useState<string | null>(null);
  const [stain, setStain] = useState<string | null>(null);

  if (!product) return null;

  const activeWood = wood && product.woods.includes(wood) ? wood : product.woods[0] || '';
  const stains = product.woodStains[activeWood] || [];
  const activeStain =
    (stain && stains.find(s => s.name === stain)) || stains.find(s => s.inStock) || stains[0];

  const basePrice = product.woodPrices[activeWood] ?? product.minPrice;
  const price = basePrice + (activeStain?.priceAddition || 0);

  return (
    <Modal
      open={product !== null}
      onClose={onClose}
      title={`${product.name} finishes`}
      overlayClassName="gallery-carousel-overlay"
      className="gallery-carousel-content"
    >
      <button
        type="button"
        className="gallery-carousel-close"
        aria-label="Close finishes preview"
        onClick={onClose}
      >
        <span className="material-symbols-outlined" aria-hidden="true">close</span>
      </button>

      <div className="gallery-carousel-image-wrap">
        {activeStain?.image ? (
          <Image
            src={activeStain.image}
            alt={`${product.name} in ${humanizeWood(activeWood)}, ${stainLabel(activeStain.name)}`}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            style={{ objectFit: 'contain' }}
          />
        ) : (
          <p className="product-card-no-image">Image unavailable</p>
        )}
      </div>

      <div className="gallery-carousel-controls">
        <p className="headline-md text-primary">{product.name}</p>
        <p className="body-lg gallery-carousel-price">{formatPriceApprox(price)}</p>

        {product.woods.length > 1 && (
          <div className="gallery-carousel-group">
            <p className="label-caps" id="carousel-wood-label">Wood</p>
            <div className="wood-grid" role="radiogroup" aria-labelledby="carousel-wood-label">
              {product.woods.map(w => (
                <button
                  key={w}
                  type="button"
                  role="radio"
                  aria-checked={w === activeWood}
                  className={`wood-chip ${w === activeWood ? 'selected' : ''}`}
                  onClick={() => {
                    setWood(w);
                    setStain(null);
                  }}
                >
                  {humanizeWood(w)}
                </button>
              ))}
            </div>
          </div>
        )}

        {stains.length > 1 && (
          <div className="gallery-carousel-group">
            <p className="label-caps" id="carousel-stain-label">Stain</p>
            <div className="stain-strip-list" role="radiogroup" aria-labelledby="carousel-stain-label">
              {stains.map(s => {
                const color = getStainColor(s.name);
                const label = stainLabel(s.name);
                return (
                  <button
                    key={s.name}
                    type="button"
                    role="radio"
                    aria-checked={s.name === activeStain?.name}
                    aria-label={`${label}${s.inStock ? '' : ', out of stock'}`}
                    disabled={!s.inStock}
                    className={`stain-strip-swatch ${s.name === activeStain?.name ? 'selected' : ''}`}
                    onClick={() => setStain(s.name)}
                  >
                    {color === null ? (
                      <span className="stain-size-chip">{label}</span>
                    ) : (
                      <span className="stain-swatch" style={{ backgroundColor: color }} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <p role="status" aria-live="polite" className="visually-hidden">
          {activeStain
            ? `${humanizeWood(activeWood)}, ${stainLabel(activeStain.name)}, ${formatPriceApprox(price)}`
            : ''}
        </p>

        <Link
          href={`/product/${product.slug}`}
          className="gallery-carousel-cta button-primary"
          onClick={() =>
            productSelected({ product_name: product.name, source: 'gallery_carousel' })
          }
        >
          View Details
          <span className="material-symbols-outlined" aria-hidden="true">arrow_forward</span>
        </Link>
      </div>
    </Modal>
  );
}
