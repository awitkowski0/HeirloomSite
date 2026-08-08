'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { InventoryItem, ShowroomSlide } from '@/types';

const ADVANCE_MS = 5000;

interface Props {
  slides: ShowroomSlide[];
  inventory: InventoryItem[];
}

export default function ShowroomSlideshow({ slides, inventory }: Props) {
  const [slideIndex, setSlideIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Resolve each slide's product once, so the CTA always points at a real slug.
  // The old code linked "Shop this room" to
  // /product/${encodeURIComponent(slide.productId)} - the raw product NAME -
  // while the slide's own click handler correctly looked up the slug. That link
  // would soft-404 the moment any slide gained a productId.
  const slugFor = (productId: string | undefined) =>
    productId ? inventory.find(i => i.productName === productId)?.slug ?? null : null;

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (slides.length <= 1 || paused) return;
    // Honour the OS reduced-motion setting: do not auto-advance.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    intervalRef.current = setInterval(() => {
      setSlideIndex(i => (i + 1) % slides.length);
    }, ADVANCE_MS);
    return stop;
  }, [slides.length, paused, slideIndex, stop]);

  const goToSlide = (index: number) => {
    setSlideIndex(((index % slides.length) + slides.length) % slides.length);
  };

  if (slides.length === 0) return null;

  return (
    <section
      className="showroom-slideshow"
      aria-roledescription="carousel"
      aria-label="Featured rooms"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      {slides.map((slide, i) => {
        const isActive = i === slideIndex;
        const slug = slugFor(slide.productId);
        return (
          <div
            key={slide.image}
            className={`showroom-slide ${isActive ? 'active' : ''}`}
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${slides.length}`}
            /*
              Inactive slides are hidden with opacity: 0 only. Without inert,
              every off-screen slide keeps its two links in the tab order and in
              the accessibility tree, so a keyboard user tabbed through 2N
              invisible links and a screen reader read N copies of the same
              content.
            */
            inert={!isActive}
          >
            <picture>
              {slide.imageMobile && <source media="(max-width: 767px)" srcSet={slide.imageMobile} />}
              <Image
                src={slide.image}
                alt=""
                fill
                sizes="100vw"
                priority={i === 0}
                style={{ objectFit: 'cover' }}
              />
            </picture>
            <div className="showroom-slide-overlay" />
            {slide.productId && (
              <div className="showroom-slide-info">
                <p className="label-caps">Featured collection</p>
                <h2>{slide.productId}</h2>
              </div>
            )}
            <div className="showroom-slide-actions">
              {slug && (
                <Link href={`/product/${slug}`} className="showroom-action-primary">
                  Shop this room
                </Link>
              )}
              <Link href="/products" className="showroom-action-secondary">
                See our cribs
              </Link>
            </div>
          </div>
        );
      })}

      {slides.length > 1 && (
        <>
          <button
            type="button"
            className="showroom-slideshow-arrow prev"
            aria-label="Previous slide"
            onClick={() => goToSlide(slideIndex - 1)}
          >
            <span className="material-symbols-outlined" aria-hidden="true">chevron_left</span>
          </button>
          <button
            type="button"
            className="showroom-slideshow-arrow next"
            aria-label="Next slide"
            onClick={() => goToSlide(slideIndex + 1)}
          >
            <span className="material-symbols-outlined" aria-hidden="true">chevron_right</span>
          </button>
          <div className="showroom-slideshow-dots" role="tablist" aria-label="Slideshow pagination">
            {slides.map((slide, i) => (
              <button
                key={slide.image}
                type="button"
                role="tab"
                aria-selected={i === slideIndex}
                aria-label={`Go to slide ${i + 1}`}
                className={i === slideIndex ? 'active' : ''}
                onClick={() => goToSlide(i)}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
