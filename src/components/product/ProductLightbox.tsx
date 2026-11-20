import { useEffect, useRef, useState, type CSSProperties, type MouseEvent } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import Modal from '@/components/ui/Modal';

interface Props {
  open: boolean;
  onClose: () => void;
  images: string[];
  productName: string;
  /** The photo on screen; shared with the page carousel so both stay in step. */
  index: number;
  onIndexChange: (index: number) => void;
}

const FINE_POINTER = '(hover: hover) and (pointer: fine)';

/**
 * Full-screen photo viewer for a product, in the site's own materials.
 *
 * It was a 90% black overlay with white glyph buttons - the only dark surface
 * on a site that is paper, ink and hairline rules everywhere else, and it put
 * the photographs on black when every other view puts them on paper. Now it is
 * the page, enlarged: the paper background (so the photographs' white plate
 * multiplies away exactly as it does on the page), the product name in the
 * display serif, square ink-outlined controls and a thumbnail rail.
 *
 * Movement is the same native scroll-snap track as the page carousel - swipe
 * on a phone, arrows/thumbnails/keyboard elsewhere. On a fine pointer, a click
 * toggles a 2.5x zoom that follows the cursor, which is the point of opening a
 * furniture photograph full-screen: the grain and the joinery.
 */
export default function ProductLightbox({ open, onClose, images, productName, index, onIndexChange }: Props) {
  // Portalled to <body>: rendered in place it sat inside the product page's
  // stacking context, under the sticky site header, which hid the title bar
  // and the Close button. Only ever mounted after a click, so document exists.
  if (!open) return null;
  return createPortal(
    <Modal
      open={open}
      onClose={onClose}
      title={`${productName}, photo ${index + 1} of ${images.length}`}
      overlayClassName="lightbox-overlay"
      className="lightbox"
    >
      {/* Mounted only while open, so its scroll position starts fresh at
          `index` each time and nothing runs while it is closed. */}
      <LightboxBody
        images={images}
        productName={productName}
        index={index}
        onIndexChange={onIndexChange}
        onClose={onClose}
      />
    </Modal>,
    document.body
  );
}

function LightboxBody({ images, productName, index, onIndexChange, onClose }: Omit<Props, 'open'>) {
  const count = images.length;
  const trackRef = useRef<HTMLDivElement>(null);
  const [zoomed, setZoomed] = useState(false);
  const [origin, setOrigin] = useState({ x: 50, y: 50 });

  // Open on the photo that was clicked, without a visible glide to it.
  // Runs once per mount; later moves go through goTo.
  const initialIndex = useRef(index);
  useEffect(() => {
    const track = trackRef.current;
    if (track) track.scrollLeft = initialIndex.current * track.clientWidth;
  }, []);

  const goTo = (i: number) => {
    const target = (i + count) % count;
    setZoomed(false);
    onIndexChange(target);
    const track = trackRef.current;
    if (!track) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // Wrapping from the last photo to the first would scroll past every photo
    // in between, so a wrap jumps rather than glides.
    const wraps = Math.abs(target - index) > 1;
    track.scrollTo({ left: target * track.clientWidth, behavior: reduce || wraps ? 'instant' : 'smooth' });
  };

  const onScroll = () => {
    const track = trackRef.current;
    if (!track || track.clientWidth === 0) return;
    const i = Math.round(track.scrollLeft / track.clientWidth);
    if (i !== index && i >= 0 && i < count) {
      setZoomed(false);
      onIndexChange(i);
    }
  };

  // Arrow keys page through the photos. Modal owns Escape and the focus trap.
  useEffect(() => {
    if (count < 2) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') goTo(index + 1);
      else if (e.key === 'ArrowLeft') goTo(index - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const followPointer = (e: MouseEvent<HTMLElement>) => {
    if (!zoomed) return;
    const box = e.currentTarget.getBoundingClientRect();
    setOrigin({
      x: ((e.clientX - box.left) / box.width) * 100,
      y: ((e.clientY - box.top) / box.height) * 100,
    });
  };

  const toggleZoom = (e: MouseEvent<HTMLElement>) => {
    // A phone already pinch-zooms; a tap there should not fight it.
    if (!window.matchMedia(FINE_POINTER).matches) return;
    const box = e.currentTarget.getBoundingClientRect();
    setOrigin({
      x: ((e.clientX - box.left) / box.width) * 100,
      y: ((e.clientY - box.top) / box.height) * 100,
    });
    setZoomed(z => !z);
  };

  return (
    <>
      <header className="lightbox-bar">
        <p className="lightbox-title">{productName}</p>
        {count > 1 && (
          <p className="label-caps lightbox-count" aria-live="polite">
            {index + 1} / {count}
          </p>
        )}
        <button type="button" onClick={onClose} className="lightbox-close" aria-label="Close photos">
          <span className="label-caps">Close</span>
          <span className="material-symbols-outlined" aria-hidden="true">
            close
          </span>
        </button>
      </header>

      <div className="lightbox-stage">
        <div
          ref={trackRef}
          className={`lightbox-track${zoomed ? ' is-zoomed' : ''}`}
          onScroll={count > 1 ? onScroll : undefined}
        >
          {images.map((src, i) => (
            <div
              key={src}
              className="lightbox-slide"
              onPointerMove={i === index ? followPointer : undefined}
              onClick={i === index ? toggleZoom : undefined}
              style={
                i === index && zoomed
                  ? ({ '--zoom-x': `${origin.x}%`, '--zoom-y': `${origin.y}%` } as CSSProperties)
                  : undefined
              }
            >
              <Image
                src={src}
                alt={i === 0 ? productName : `${productName}, photo ${i + 1}`}
                fill
                sizes="100vw"
                // The photo that was clicked is wanted now; its neighbours
                // load as the track nears them.
                loading={i === index ? 'eager' : 'lazy'}
                style={{ objectFit: 'contain' }}
              />
            </div>
          ))}
        </div>

        {count > 1 && (
          <>
            <button type="button" onClick={() => goTo(index - 1)} className="lightbox-arrow lightbox-arrow-prev" aria-label="Previous photo">
              <span className="material-symbols-outlined" aria-hidden="true">
                arrow_back
              </span>
            </button>
            <button type="button" onClick={() => goTo(index + 1)} className="lightbox-arrow lightbox-arrow-next" aria-label="Next photo">
              <span className="material-symbols-outlined" aria-hidden="true">
                arrow_forward
              </span>
            </button>
          </>
        )}
      </div>

      {count > 1 && (
        <div className="lightbox-thumbs" role="tablist" aria-label="Photos">
          {images.map((src, i) => (
            <button
              key={src}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`Photo ${i + 1} of ${count}`}
              onClick={() => goTo(i)}
              className={`lightbox-thumb${i === index ? ' is-active' : ''}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- 64px
                  rail; same reasoning as the page's thumbnail strip. */}
              <img src={src} alt="" loading="lazy" />
            </button>
          ))}
        </div>
      )}
    </>
  );
}
