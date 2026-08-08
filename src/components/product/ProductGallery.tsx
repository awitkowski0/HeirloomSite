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

  if (images.length === 0) {
    return (
      <div className="image-container product-image product-image--empty">
        <p className="product-image-empty-text">Out of Stock</p>
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
            sizes="(max-width: 768px) 100vw, 55vw"
            style={{ objectFit: 'contain' }}
          />
        </button>

        {images.length > 1 && (
          <>
            <button type="button" onClick={prev} className="gallery-nav-btn gallery-nav-prev" aria-label="Previous image">
              <span className="material-symbols-outlined" aria-hidden="true">chevron_left</span>
            </button>
            <button type="button" onClick={next} className="gallery-nav-btn gallery-nav-next" aria-label="Next image">
              <span className="material-symbols-outlined" aria-hidden="true">chevron_right</span>
            </button>
            <div className="gallery-pagination" role="tablist" aria-label="Image gallery pagination">
              {images.map((url, i) => (
                <button
                  key={url}
                  type="button"
                  role="tab"
                  aria-selected={i === safeIndex}
                  aria-label={`Go to image ${i + 1} of ${images.length}`}
                  onClick={() => setIndex(i)}
                  className={`gallery-dot ${i === safeIndex ? 'active' : ''}`}
                />
              ))}
            </div>
          </>
        )}
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
