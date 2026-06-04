import { useState } from 'react';

interface Props {
  images: string[];
  productName: string;
}

export default function ProductGallery({ images, productName }: Props) {
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  if (images.length === 0) {
    return (
      <div className="image-container product-image" style={{ backgroundColor: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '500px' }}>
        <div style={{ padding: '48px', textAlign: 'center', color: 'var(--error)' }}>Out of Stock</div>
      </div>
    );
  }

  return (
    <>
      <div
        className="image-container product-image"
        style={{ backgroundColor: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '500px', flexDirection: 'column', position: 'relative' }}
      >
        <button
          onClick={() => setLightboxOpen(true)}
          aria-label={`Open fullscreen view of ${productName}`}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none', background: 'transparent', cursor: 'pointer', padding: 0 }}
        >
          <img
            src={images[galleryIndex]}
            alt={productName}
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          />
        </button>
        {images.length > 1 && (
          <>
            <button
              onClick={e => { e.stopPropagation(); setGalleryIndex(i => (i - 1 + images.length) % images.length); }}
              className="gallery-nav-btn gallery-nav-prev"
              aria-label="Previous image"
            >
              <span className="material-symbols-outlined" aria-hidden="true">chevron_left</span>
            </button>
            <button
              onClick={e => { e.stopPropagation(); setGalleryIndex(i => (i + 1) % images.length); }}
              className="gallery-nav-btn gallery-nav-next"
              aria-label="Next image"
            >
              <span className="material-symbols-outlined" aria-hidden="true">chevron_right</span>
            </button>
            <div className="gallery-pagination" role="tablist" aria-label="Image gallery pagination">
              {images.map((_, i) => (
                <button
                  key={i}
                  role="tab"
                  aria-selected={i === galleryIndex}
                  aria-label={`Go to slide ${i + 1}`}
                  onClick={e => { e.stopPropagation(); setGalleryIndex(i); }}
                  className={`gallery-dot ${i === galleryIndex ? 'active' : ''}`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {images.length > 1 && (
        <div role="tablist" aria-label="Image thumbnails" style={{ display: 'flex', gap: '8px', marginTop: '12px', overflowX: 'auto', paddingBottom: '4px' }}>
          {images.map((url, i) => (
            <button
              key={i}
              role="tab"
              aria-selected={i === galleryIndex}
              aria-label={`View image ${i + 1}`}
              onClick={() => setGalleryIndex(i)}
              style={{
                width: '72px', height: '72px', padding: 0, borderRadius: '8px', cursor: 'pointer',
                border: i === galleryIndex ? '2px solid var(--primary)' : '2px solid transparent',
                opacity: i === galleryIndex ? 1 : 0.6, transition: 'all 0.2s', flexShrink: 0,
                background: 'transparent'
              }}
            >
              <img
                src={url}
                alt=""
                style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '6px' }}
              />
            </button>
          ))}
        </div>
      )}

      {lightboxOpen && (
        <div className="lightbox-overlay" onClick={() => setLightboxOpen(false)}>
          <button onClick={e => { e.stopPropagation(); setLightboxOpen(false); }} className="lightbox-close-btn" aria-label="Close lightbox">
            <span className="material-symbols-outlined" style={{ fontSize: '36px' }} aria-hidden="true">close</span>
          </button>
          <img src={images[galleryIndex]} alt={productName} className="lightbox-img" onClick={e => e.stopPropagation()} />
          {images.length > 1 && (
            <>
              <button onClick={e => { e.stopPropagation(); setGalleryIndex(i => (i - 1 + images.length) % images.length); }} className="lightbox-nav-btn lightbox-nav-prev" aria-label="Previous image">
                <span className="material-symbols-outlined" style={{ fontSize: '28px' }} aria-hidden="true">chevron_left</span>
              </button>
              <button onClick={e => { e.stopPropagation(); setGalleryIndex(i => (i + 1) % images.length); }} className="lightbox-nav-btn lightbox-nav-next" aria-label="Next image">
                <span className="material-symbols-outlined" style={{ fontSize: '28px' }} aria-hidden="true">chevron_right</span>
              </button>
            </>
          )}
        </div>
      )}
    </>
  );
}
