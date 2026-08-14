'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Modal from '@/components/ui/Modal';
import { productSelected } from '@/lib/analytics';
import { variantHref } from '@/lib/variants';
import { getStainColor, stainLabel } from '@/lib/stainColors';
import { formatPriceApprox } from '@/lib/format';
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
  const [finishName, setFinishName] = useState<string | null>(null);

  if (!product) return null;

  const finishes = product.finishes;
  const active =
    (finishName && finishes.find(f => f.name === finishName)) ||
    finishes.find(f => f.inStock) ||
    finishes[0];
  const price = active?.price ?? product.minPrice;

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
        {active?.image ? (
          <Image
            src={active.image}
            alt={`${product.name} in ${stainLabel(active.name)}`}
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

        {finishes.length > 1 && (
          <div className="gallery-carousel-group">
            <p className="label-caps" id="carousel-finish-label">Finish</p>
            <div className="stain-strip-list" role="radiogroup" aria-labelledby="carousel-finish-label">
              {finishes.map(f => {
                const color = getStainColor(f.name);
                const label = stainLabel(f.name);
                return (
                  <button
                    key={f.name}
                    type="button"
                    role="radio"
                    aria-checked={f.name === active?.name}
                    aria-label={`${label}${f.inStock ? '' : ', out of stock'}`}
                    disabled={!f.inStock}
                    className={`stain-strip-swatch ${f.name === active?.name ? 'selected' : ''}`}
                    onClick={() => setFinishName(f.name)}
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
          {active ? `${stainLabel(active.name)}, ${formatPriceApprox(price)}` : ''}
        </p>

        <Link
          href={variantHref(product.slug, active?.variant, active?.stainName)}
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
