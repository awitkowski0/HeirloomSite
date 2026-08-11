'use client';

import Link from 'next/link';
import Image from 'next/image';
import { productSelected } from '@/lib/analytics';
import { formatPriceApprox } from '@/lib/format';
import { humanizeWood } from '@/lib/labels';
import { PRODUCT_IMAGE_SIZES } from '@/lib/images';
import type { GalleryProduct } from './types';

interface Props {
  product: GalleryProduct;
  displayImage: string;
  displayPrice: number;
  hasActiveSelection: boolean;
  onOpenFinishes: () => void;
}

/**
 * Gallery tile.
 *
 * The card body is a real <Link>. It was previously a
 * <div onClick={handleClick}> with no role, tabIndex or key handler, so the
 * entire /gallery grid was unreachable by keyboard and invisible to screen
 * readers as a control - and it was not crawlable either.
 *
 * That handler also branched on window.innerWidth < 768: on mobile the first
 * tap expanded the card and the second opened a carousel, while on desktop a
 * single click navigated. Same markup, two different interaction models, with
 * nothing in the DOM signalling which one applied. Browsing to the product is
 * now one behaviour everywhere, and the finishes preview is its own explicit,
 * always-visible, keyboard-reachable button.
 */
export default function GalleryCard({
  product,
  displayImage,
  displayPrice,
  hasActiveSelection,
  onOpenFinishes,
}: Props) {
  const priceLabel = hasActiveSelection
    ? formatPriceApprox(displayPrice)
    : `From ${formatPriceApprox(product.minPrice)}`;

  return (
    <div className="product-card-wrapper">
      <div className="product-card">
        <Link
          href={`/product/${product.slug}`}
          className="product-card-link-area"
          onClick={() =>
            productSelected({
              product_name: product.name,
              source: 'gallery_card',
            })
          }
        >
          <span className="visually-hidden">{product.name}, {priceLabel}</span>
          <span className="product-card-img-wrap">
            {displayImage ? (
              <Image
                src={displayImage}
                alt={product.name}
                fill
                sizes={PRODUCT_IMAGE_SIZES}
                style={{ objectFit: 'contain' }}
              />
            ) : (
              <span className="product-card-no-image">Image unavailable</span>
            )}
          </span>
        </Link>

        <div className="product-info-overlay">
          <p className="product-overlay-price">{priceLabel}</p>
          <div className="product-overlay-woods">
            {product.woods.slice(0, 4).map(w => (
              <span key={w} className="wood-tag">
                {humanizeWood(w)}
              </span>
            ))}
            {product.woods.length > 4 && (
              <span className="wood-tag wood-tag--more">+{product.woods.length - 4}</span>
            )}
          </div>
        </div>
      </div>

      <div className="product-card-text">
        <h3 className="headline-lg text-primary">
          <Link
            href={`/product/${product.slug}`}
            onClick={() =>
              productSelected({ product_name: product.name, source: 'gallery_view_details' })
            }
          >
            {product.name}
          </Link>
        </h3>
        <div className="product-card-price-row">
          <span className="product-card-rule" aria-hidden="true" />
          <p className="body-lg">{priceLabel}</p>
          <span className="product-card-rule" aria-hidden="true" />
        </div>
        <button type="button" className="view-finishes-btn" onClick={onOpenFinishes}>
          View finishes
          <span className="material-symbols-outlined" aria-hidden="true">
            palette
          </span>
        </button>
      </div>
    </div>
  );
}
