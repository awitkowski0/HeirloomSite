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
        <img
          src={images[galleryIndex]}
          alt={productName}
          style={{ width: '100%', height: '100%', objectFit: 'contain', cursor: 'pointer', position: 'absolute', inset: 0 }}
          onClick={() => setLightboxOpen(true)}
        />
        {images.length > 1 && (
          <>
            <button
              onClick={e => { e.stopPropagation(); setGalleryIndex(i => (i - 1 + images.length) % images.length); }}
              className="gallery-nav-btn gallery-nav-prev"
            >
              <span className="material-symbols-outlined">chevron_left</span>
            </button>
            <button
              onClick={e => { e.stopPropagation(); setGalleryIndex(i => (i + 1) % images.length); }}
              className="gallery-nav-btn gallery-nav-next"
            >
              <span className="material-symbols-outlined">chevron_right</span>
            </button>
            <div className="gallery-pagination">
              {images.map((_, i) => (
                <button key={i} onClick={e => { e.stopPropagation(); setGalleryIndex(i); }} className={`gallery-dot ${i === galleryIndex ? 'active' : ''}`} />
              ))}
            </div>
          </>
        )}
      </div>

      {images.length > 1 && (
        <div style={{ display: 'flex', gap: '8px', marginTop: '12px', overflowX: 'auto', paddingBottom: '4px' }}>
          {images.map((url, i) => (
            <img
              key={i}
              src={url}
              alt=""
              onClick={() => setGalleryIndex(i)}
              style={{
                width: '72px', height: '72px', objectFit: 'cover', borderRadius: '8px', cursor: 'pointer',
                border: i === galleryIndex ? '2px solid var(--primary)' : '2px solid transparent',
                opacity: i === galleryIndex ? 1 : 0.6, transition: 'all 0.2s', flexShrink: 0,
              }}
            />
          ))}
        </div>
      )}

      {lightboxOpen && (
        <div className="lightbox-overlay" onClick={() => setLightboxOpen(false)}>
          <button onClick={e => { e.stopPropagation(); setLightboxOpen(false); }} className="lightbox-close-btn">
            <span className="material-symbols-outlined" style={{ fontSize: '36px' }}>close</span>
          </button>
          <img src={images[galleryIndex]} alt="" className="lightbox-img" onClick={e => e.stopPropagation()} />
          {images.length > 1 && (
            <>
              <button onClick={e => { e.stopPropagation(); setGalleryIndex(i => (i - 1 + images.length) % images.length); }} className="lightbox-nav-btn lightbox-nav-prev">
                <span className="material-symbols-outlined" style={{ fontSize: '28px' }}>chevron_left</span>
              </button>
              <button onClick={e => { e.stopPropagation(); setGalleryIndex(i => (i + 1) % images.length); }} className="lightbox-nav-btn lightbox-nav-next">
                <span className="material-symbols-outlined" style={{ fontSize: '28px' }}>chevron_right</span>
              </button>
            </>
          )}
        </div>
      )}
    </>
  );
}
