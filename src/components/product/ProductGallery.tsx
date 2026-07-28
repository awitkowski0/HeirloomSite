import { useState, useRef } from 'react';

interface Props {
  images: string[];
  productName: string;
}

// Minimum horizontal travel (px) before a drag counts as a swipe
const SWIPE_THRESHOLD = 40;

export default function ProductGallery({ images, productName }: Props) {
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // Reset to the first photo whenever the image set changes (e.g. the shopper
  // picks a different wood or stain). Adjusting state during render — the React
  // way to reset state on a prop change — keyed on the joined URLs so it only
  // resets on a real change, not on every render.
  const imagesKey = images.join('|');
  const [prevKey, setPrevKey] = useState(imagesKey);
  if (prevKey !== imagesKey) {
    setPrevKey(imagesKey);
    setGalleryIndex(0);
  }

  const showPrev = () => setGalleryIndex(i => (i - 1 + images.length) % images.length);
  const showNext = () => setGalleryIndex(i => (i + 1) % images.length);

  // Touch-swipe tracking, shared by the inline gallery and the lightbox
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const didSwipe = useRef(false);

  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStartX.current = t.clientX;
    touchStartY.current = t.clientY;
    didSwipe.current = false;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = e.touches[0].clientX - touchStartX.current;
    const dy = e.touches[0].clientY - (touchStartY.current ?? 0);
    // Once it's clearly a horizontal drag, mark it so a trailing tap is ignored
    if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) didSwipe.current = true;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - (touchStartY.current ?? 0);
    touchStartX.current = null;
    if (images.length > 1 && Math.abs(dx) > SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) showNext();
      else showPrev();
    }
  };

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
        style={{ backgroundColor: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '500px', flexDirection: 'column', position: 'relative', touchAction: 'pan-y' }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <button
          onClick={() => { if (didSwipe.current) { didSwipe.current = false; return; } setLightboxOpen(true); }}
          aria-label={`Open fullscreen view of ${productName}`}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none', background: 'transparent', cursor: 'pointer', padding: 0 }}
        >
          <img
            src={images[galleryIndex]}
            alt={productName}
            draggable={false}
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          />
        </button>
        {images.length > 1 && (
          <>
            <button
              onClick={e => { e.stopPropagation(); showPrev(); }}
              className="gallery-nav-btn gallery-nav-prev"
              aria-label="Previous image"
            >
              <span className="material-symbols-outlined" aria-hidden="true">chevron_left</span>
            </button>
            <button
              onClick={e => { e.stopPropagation(); showNext(); }}
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
          <img
            src={images[galleryIndex]}
            alt={productName}
            className="lightbox-img"
            draggable={false}
            style={{ touchAction: 'pan-y' }}
            onClick={e => e.stopPropagation()}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={e => { e.stopPropagation(); onTouchEnd(e); }}
          />
          {images.length > 1 && (
            <>
              <button onClick={e => { e.stopPropagation(); showPrev(); }} className="lightbox-nav-btn lightbox-nav-prev" aria-label="Previous image">
                <span className="material-symbols-outlined" style={{ fontSize: '28px' }} aria-hidden="true">chevron_left</span>
              </button>
              <button onClick={e => { e.stopPropagation(); showNext(); }} className="lightbox-nav-btn lightbox-nav-next" aria-label="Next image">
                <span className="material-symbols-outlined" style={{ fontSize: '28px' }} aria-hidden="true">chevron_right</span>
              </button>
            </>
          )}
        </div>
      )}
    </>
  );
}
