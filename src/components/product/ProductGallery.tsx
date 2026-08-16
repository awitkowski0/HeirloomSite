'use client';

import { useState } from 'react';
import Image from 'next/image';
import Modal from '@/components/ui/Modal';

interface Props {
  images: string[];
  productName: string;
  /** True for the LCP image on a product page. */
  priority?: boolean;
}

export default function ProductGallery({ images, productName, priority = false }: Props) {
  const [index, setIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  /*
   * A product with no images is a missing asset, not a stock state.
   *
   * This said "Out of Stock", which was wrong on both counts: nothing here
   * knows anything about availability, and the buy button next to it went on
   * saying ADD TO CART. Two live products have no photography at all
   * (crib-mattress, guard-rail), so both pages contradicted themselves.
   */
  if (images.length === 0) {
    return (
      <div className="image-container product-image product-image--empty">
        <p className="product-image-empty-text">Photography coming soon</p>
      </div>
    );
  }

  const safeIndex = Math.min(index, images.length - 1);
  const prev = () => setIndex(i => (i - 1 + images.length) % images.length);
  const next = () => setIndex(i => (i + 1) % images.length);

  return (
    <>
      <div className="image-container product-image">
        <button
          type="button"
          onClick={() => setLightboxOpen(true)}
          aria-label={`Open fullscreen view of ${productName}`}
          className="product-image-trigger"
        >
          <Image
            src={images[safeIndex]}
            alt={productName}
            fill
            priority={priority}
            /* The grid does not split until 1024px, but this claimed 55vw from
              769px up - so every tablet was told to fetch roughly half the
              pixels it actually renders. Pre-existing, unrelated to the
              layout change. */
            sizes="(max-width: 1023px) 100vw, 50vw"
            style={{ objectFit: 'contain' }}
          />
        </button>

        {/*
          The arrows over the main image and a dot `tablist` beneath it used
          to live here, giving this component four ways to change image -
          arrows, dots, thumbnails, and the lightbox's own arrows - three of
          which did exactly the same thing. The thumbnails are strictly better
          than the dots (they show what you are selecting) and the lightbox
          keeps its arrows, so both of these went.
        */}
      </div>

      {images.length > 1 && (
        <div className="gallery-thumbs" role="tablist" aria-label="Image thumbnails">
          {images.map((url, i) => (
            <button
              key={url}
              type="button"
              role="tab"
              aria-selected={i === safeIndex}
              aria-label={`View image ${i + 1} of ${images.length}`}
              onClick={() => setIndex(i)}
              className={`gallery-thumb ${i === safeIndex ? 'active' : ''}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- 72px
                  thumbnail strip; optimizing these would multiply Vercel image
                  transformations by every image on every product. */}
              <img src={url} alt="" loading="lazy" />
            </button>
          ))}
        </div>
      )}

      <Modal
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        title={`${productName}, image ${safeIndex + 1} of ${images.length}`}
        overlayClassName="lightbox-overlay"
        className="lightbox-content"
      >
        {/*
          A real dismiss surface behind the photograph.

          Modal closes when the overlay is clicked directly, but
          .lightbox-content is width:100%/height:100% and covers the whole
          overlay, so the click never landed on the overlay itself and
          click-outside-to-close silently did nothing. With that gone and the
          close button drawn as a bare white glyph, Escape was the only exit
          anyone could find.

          A button rather than a div with a handler: it is a control, it should
          be reachable and announced as one.
        */}
        <button
          type="button"
          onClick={() => setLightboxOpen(false)}
          className="lightbox-dismiss"
          aria-label="Close fullscreen view"
          tabIndex={-1}
        />

        <button
          type="button"
          onClick={() => setLightboxOpen(false)}
          className="lightbox-close-btn"
          aria-label="Close fullscreen view"
        >
          <span className="material-symbols-outlined" aria-hidden="true">close</span>
        </button>

        <div className="lightbox-img-wrap">
          <Image
            src={images[safeIndex]}
            alt={productName}
            fill
            sizes="100vw"
            style={{ objectFit: 'contain' }}
          />
        </div>

        {images.length > 1 && (
          <>
            <button type="button" onClick={prev} className="lightbox-nav-btn lightbox-nav-prev" aria-label="Previous image">
              <span className="material-symbols-outlined" aria-hidden="true">chevron_left</span>
            </button>
            <button type="button" onClick={next} className="lightbox-nav-btn lightbox-nav-next" aria-label="Next image">
              <span className="material-symbols-outlined" aria-hidden="true">chevron_right</span>
            </button>
            <p role="status" aria-live="polite" className="visually-hidden">
              Image {safeIndex + 1} of {images.length}
            </p>
          </>
        )}
      </Modal>
    </>
  );
}
