'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Morph from '@/components/motion/Morph';
import Modal from '@/components/ui/Modal';
import type { RoomImage } from '@/lib/room-images';

interface Props {
  images: string[];
  /** Approved room photos, always after the catalog photos. */
  rooms?: readonly RoomImage[];
  productName: string;
  priority?: boolean;
  /** Name of the photo a grid card morphs into. Only the first photo carries it. */
  morph?: string;
  /** Bumped when a finish swatch is clicked so the gallery returns to the catalog photo. */
  resetKey?: number;
}

const SIZES = '(max-width: 859px) 100vw, 55vw';

type Slide = { src: string; alt: string; room: boolean };

/*
 * The real catalog photo first, always, then any approved room photos. A snap
 * track, so a phone swipes natively and one DOM tree serves every width; arrows
 * and keyboard scroll the same track. Choosing a finish updates the first slide
 * in place and returns the gallery to it.
 */
export default function ProductGallery({ images, rooms = [], productName, priority = false, morph, resetKey = 0 }: Props) {
  const first = images[0];
  const stateKey = `${first}|${resetKey}`;
  const [slideState, setSlideState] = useState({ index: 0, key: stateKey });
  const index = slideState.key === stateKey ? slideState.index : 0;
  const setIndex = (next: number) => setSlideState({ index: next, key: stateKey });
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const track = useRef<HTMLDivElement>(null);
  const scrollingTo = useRef<number | null>(null);
  const scrollTimer = useRef<number | undefined>(undefined);

  const slides: Slide[] = [
    ...images.map((src, i) => ({ src: i === 0 ? first : src, alt: productName, room: false })),
    ...rooms.map(r => ({ src: r.src, alt: r.alt, room: true })),
  ];
  const safeIndex = Math.min(index, Math.max(slides.length - 1, 0));
  const current = slides[safeIndex];

  const goTo = (i: number, instant = false) => {
    const el = track.current;
    if (!el || slides.length === 0) return;
    const clamped = (i + slides.length) % slides.length;
    const reduce = instant || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.clearTimeout(scrollTimer.current);
    scrollingTo.current = reduce ? null : clamped;
    if (!reduce) {
      scrollTimer.current = window.setTimeout(() => {
        scrollingTo.current = null;
      }, 420);
    }
    setIndex(clamped);
    el.scrollTo({ left: clamped * el.clientWidth, behavior: reduce ? 'auto' : 'smooth' });
  };

  // Choosing a finish applies to the catalog photo: go back to it.
  useEffect(() => {
    const el = track.current;
    scrollingTo.current = null;
    if (el && el.scrollLeft !== 0) {
      el.scrollTo({ left: 0, behavior: 'auto' });
    }
  }, [first, resetKey]);

  if (images.length === 0) {
    return <div className="product-image product-image--empty"><p className="small">Photography coming soon</p></div>;
  }

  const frame = (slide: Slide, i: number) => (
    <div className={slide.room ? 'product-image pgal-room' : 'product-image'}>
      <button type="button" onClick={() => setLightboxOpen(true)} aria-label={`Open a larger view of ${productName}`}>
        <Image src={i === 0 ? first : slide.src} alt={slide.alt} fill priority={priority && i === 0} sizes={SIZES} />
      </button>
    </div>
  );

  return (
    <>
      <div
        className="pgal"
        role="group"
        aria-label={`Photos of ${productName}`}
        onKeyDown={e => {
          if (e.key === 'ArrowRight') goTo(safeIndex + 1);
          else if (e.key === 'ArrowLeft') goTo(safeIndex - 1);
        }}
      >
        <div
          className="pgal-track"
          ref={track}
          onScroll={e => {
            const el = e.currentTarget;
            if (!el.clientWidth) return;
            if (scrollingTo.current !== null) {
              if (Math.abs(el.scrollLeft - scrollingTo.current * el.clientWidth) < 4) {
                scrollingTo.current = null;
              } else {
                return;
              }
            }
            const next = Math.round(el.scrollLeft / el.clientWidth);
            if (next !== index) setIndex(next);
          }}
        >
          {slides.map((slide, i) => (
            <div className="pgal-slide" key={`${slide.room ? 'room' : 'photo'}-${i}`}>
              {morph && i === 0 ? <Morph name={`piece-${morph}`}>{frame(slide, i)}</Morph> : frame(slide, i)}
            </div>
          ))}
        </div>
        {slides.length > 1 && (
          <>
            <button type="button" className="gallery-arrow gallery-arrow--prev" aria-label="Previous photo" onClick={() => goTo(safeIndex - 1)}>‹</button>
            <button type="button" className="gallery-arrow gallery-arrow--next" aria-label="Next photo" onClick={() => goTo(safeIndex + 1)}>›</button>
          </>
        )}
      </div>

      {slides.length > 1 && (
        <div className="gallery-thumbs" role="group" aria-label="More photos">
          {slides.map((slide, i) => (
            <button key={`${slide.src}-${i}`} type="button" aria-pressed={i === safeIndex} aria-label={`Photo ${i + 1} of ${slides.length}`} onClick={() => goTo(i, true)}>
              {/* eslint-disable-next-line @next/next/no-img-element -- A small strip; optimizing it would multiply transformations per product. */}
              <img src={slide.src} alt="" loading="lazy" className={slide.room ? 'pgal-thumb-room' : undefined} />
            </button>
          ))}
        </div>
      )}

      <Modal
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        title={`${productName}, photo ${safeIndex + 1} of ${slides.length}`}
        initialFocus="dialog"
        overlayClassName="lightbox-overlay"
        className="lightbox-content"
      >
        {/* The dialog is portalled out of .pgal, so it needs its own arrow keys. */}
        <div
          className="lightbox-keys"
          onKeyDown={e => {
            if (e.key === 'ArrowRight') goTo(safeIndex + 1, true);
            else if (e.key === 'ArrowLeft') goTo(safeIndex - 1, true);
          }}
        >
        <button type="button" onClick={() => setLightboxOpen(false)} className="lightbox-dismiss" aria-label="Close larger view" tabIndex={-1} />
        <button type="button" onClick={() => setLightboxOpen(false)} className="lightbox-close">Close</button>
        <div className={current.room ? 'lightbox-img-wrap lightbox-img-wrap--room' : 'lightbox-img-wrap'}>
          <Image src={current.src} alt={current.alt} fill sizes="100vw" style={{ objectFit: 'contain' }} />
        </div>
        {slides.length > 1 && (
          <div className="lightbox-nav">
            <button type="button" onClick={() => goTo(safeIndex - 1, true)}>Previous</button>
            <button type="button" onClick={() => goTo(safeIndex + 1, true)}>Next</button>
          </div>
        )}
        </div>
      </Modal>
    </>
  );
}
