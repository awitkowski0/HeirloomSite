'use client';

import { useState } from 'react';
import Image from 'next/image';
import Modal from '@/components/ui/Modal';

interface Props {
  images: string[];
  productName: string;
  priority?: boolean;
}

export default function ProductGallery({ images, productName, priority = false }: Props) {
  const [index, setIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  if (images.length === 0) {
    return <div className="product-image product-image--empty"><p className="small">Photography coming soon</p></div>;
  }

  const safeIndex = Math.min(index, images.length - 1);
  const current = images[safeIndex];

  return (
    <>
      <div className="product-image">
        <button type="button" onClick={() => setLightboxOpen(true)} aria-label={`Open a larger view of ${productName}`}>
          {/* Keyed on the file so a new finish fades in instead of snapping. */}
          <Image key={current} src={current} alt={productName} fill priority={priority} sizes="(max-width: 859px) 100vw, 55vw" />
        </button>
      </div>

      {images.length > 1 && (
        <div className="gallery-thumbs" role="group" aria-label="More photos">
          {images.map((url, i) => (
            <button key={url} type="button" aria-pressed={i === safeIndex} aria-label={`Photo ${i + 1} of ${images.length}`} onClick={() => setIndex(i)}>
              {/* eslint-disable-next-line @next/next/no-img-element -- A small strip; optimizing it would multiply transformations per product. */}
              <img src={url} alt="" loading="lazy" />
            </button>
          ))}
        </div>
      )}

      <Modal
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        title={`${productName}, photo ${safeIndex + 1} of ${images.length}`}
        overlayClassName="lightbox-overlay"
        className="lightbox-content"
      >
        <button type="button" onClick={() => setLightboxOpen(false)} className="lightbox-dismiss" aria-label="Close larger view" tabIndex={-1} />
        <button type="button" onClick={() => setLightboxOpen(false)} className="lightbox-close">Close</button>
        <div className="lightbox-img-wrap">
          <Image src={current} alt={productName} fill sizes="100vw" style={{ objectFit: 'contain' }} />
        </div>
        {images.length > 1 && (
          <div className="lightbox-nav">
            <button type="button" onClick={() => setIndex(i => (i - 1 + images.length) % images.length)}>Previous</button>
            <button type="button" onClick={() => setIndex(i => (i + 1) % images.length)}>Next</button>
          </div>
        )}
      </Modal>
    </>
  );
}
