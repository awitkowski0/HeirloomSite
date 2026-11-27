import { useId, useLayoutEffect, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react';
import Image from 'next/image';
import { lockPageScroll } from '@/components/ui/Modal';
import PhotoThumbs from './PhotoThumbs';
import { useSlideTrack } from './useSlideTrack';

interface Props {
  open: boolean;
  /** Called once the dialog has closed, however it was closed. */
  onClose: () => void;
  images: string[];
  productName: string;
  /** The photo on screen; shared with the page carousel so both stay in step. */
  index: number;
  onIndexChange: (index: number) => void;
}

const FINE_POINTER = '(hover: hover) and (pointer: fine)';

/** Where in the slide the pointer is, as the zoom's transform-origin. */
function aimZoom(e: MouseEvent<HTMLElement>) {
  const slide = e.currentTarget;
  const box = slide.getBoundingClientRect();
  slide.style.setProperty('--zoom-x', `${((e.clientX - box.left) / box.width) * 100}%`);
  slide.style.setProperty('--zoom-y', `${((e.clientY - box.top) / box.height) * 100}%`);
}

/**
 * Full-screen photo viewer for a product, in the site's own materials: the
 * page, enlarged. Paper background (so the photographs' white plate multiplies
 * away exactly as it does on the page), the product name in the display serif,
 * hairline controls and a thumbnail rail.
 *
 * It is a native <dialog> opened with showModal(). That puts it in the top
 * layer - above the sticky site header without a portal or a z-index to
 * outbid - makes the page behind it inert, contains focus and closes on
 * Escape or the phone's back gesture, none of which is written here.
 *
 * Movement is the same native scroll-snap track as the page carousel - swipe
 * on a phone, arrows/thumbnails/keyboard elsewhere. On a fine pointer, a click
 * toggles a 2.5x zoom that follows the cursor, which is the point of opening a
 * furniture photograph full-screen: the grain and the joinery.
 */
export default function ProductLightbox({ open, onClose, images, productName, index, onIndexChange }: Props) {
  const count = images.length;
  const titleId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [zoomed, setZoomed] = useState(false);

  // The <dialog> is always in the document, closed and empty. Its contents
  // mount on the first open - nobody who never opens it pays for them - and
  // then stay, so the closing fade has something to fade.
  const [mounted, setMounted] = useState(false);
  if (open && !mounted) setMounted(true);

  const { trackRef, goTo, onScroll, onScrollEnd } = useSlideTrack(count, index, i => {
    setZoomed(false);
    onIndexChange(i);
  });

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!open) {
      if (dialog.open) dialog.close();
      return;
    }
    if (!dialog.open) dialog.showModal();
    // Open on the photo that was clicked, with no glide to it. `index` is
    // read once here on purpose: later moves go through goTo.
    const track = trackRef.current;
    if (track) track.scrollLeft = index * track.clientWidth;
    return lockPageScroll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Wrapping from the last photo to the first would scroll past every photo
  // in between, so a wrap jumps rather than glides.
  const step = (by: number) => {
    const target = (index + by + count) % count;
    goTo(target, Math.abs(target - index) > 1 ? 'instant' : 'smooth');
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (count < 2 || (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft')) return;
    // Also stops the focused track scrolling itself a second time.
    e.preventDefault();
    step(e.key === 'ArrowRight' ? 1 : -1);
  };

  const toggleZoom = (e: MouseEvent<HTMLElement>) => {
    // A phone already pinch-zooms; a tap there should not fight it.
    if (!window.matchMedia(FINE_POINTER).matches) return;
    aimZoom(e);
    setZoomed(z => !z);
  };

  return (
    <dialog
      ref={dialogRef}
      className="lightbox"
      aria-labelledby={titleId}
      onKeyDown={onKeyDown}
      // Every way out - the Close button, Escape, the back gesture - ends
      // here, so the page hears about it exactly once.
      onClose={() => {
        setZoomed(false);
        onClose();
      }}
    >
      {mounted && (
        <>
          <header className="lightbox-bar">
            {/* h1: the page behind a modal is inert, so this is the first
                heading in scope. */}
            <h1 id={titleId} className="lightbox-title">
              {productName}
            </h1>
            {count > 1 && (
              <p className="label-caps lightbox-count" aria-live="polite">
                <span aria-hidden="true">
                  {index + 1} / {count}
                </span>
                <span className="visually-hidden">
                  Photo {index + 1} of {count}
                </span>
              </p>
            )}
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="lightbox-close"
              aria-label="Close photos"
            >
              <span className="label-caps">Close</span>
              <span className="material-symbols-outlined" aria-hidden="true">
                close
              </span>
            </button>
          </header>

          <div className="lightbox-stage">
            {count > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => step(-1)}
                  className="slide-nav lightbox-nav slide-nav-prev"
                  aria-label="Previous photo"
                >
                  <span className="material-symbols-outlined" aria-hidden="true">
                    chevron_left
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => step(1)}
                  className="slide-nav lightbox-nav slide-nav-next"
                  aria-label="Next photo"
                >
                  <span className="material-symbols-outlined" aria-hidden="true">
                    chevron_right
                  </span>
                </button>
              </>
            )}
            <div
              ref={trackRef}
              onScroll={onScroll}
              onScrollEnd={onScrollEnd}
              className="slide-track lightbox-track"
              // Not a tab stop: a scroller with nothing focusable inside is
              // one by default, and the arrow keys already work from every
              // control in the dialog.
              tabIndex={-1}
              data-zoomed={zoomed || undefined}
            >
              {images.map((src, i) => (
                <div
                  key={src}
                  className="lightbox-slide"
                  onPointerMove={i === index && zoomed ? aimZoom : undefined}
                  onClick={i === index ? toggleZoom : undefined}
                >
                  <Image
                    src={src}
                    alt={i === 0 ? productName : `${productName}, photo ${i + 1}`}
                    fill
                    // Zoomed, the photo is drawn 2.5x the viewport wide, so
                    // ask for a source to match; the sharper file swaps in
                    // when it arrives.
                    sizes={zoomed && i === index ? '250vw' : '100vw'}
                    // The photo that was clicked is wanted now; its neighbours
                    // load as the track nears them.
                    loading={open && i === index ? 'eager' : 'lazy'}
                    style={{ objectFit: 'contain' }}
                  />
                </div>
              ))}
            </div>
          </div>

          {count > 1 && (
            <footer className="lightbox-rail">
              <PhotoThumbs images={images} index={index} onSelect={goTo} label={`${productName} photos`} />
              <p className="label-caps lightbox-hint" aria-hidden="true">
                {zoomed ? 'Click to zoom out' : 'Click to zoom'}
              </p>
            </footer>
          )}
        </>
      )}
    </dialog>
  );
}
