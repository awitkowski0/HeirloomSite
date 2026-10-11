'use client';

import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from 'react';
import Image from 'next/image';
import Modal from '@/components/ui/Modal';

/** One finish in the scroll preview: its key, what to call it, and its photograph. */
export interface FeedItem {
  key: string;
  label: string;
  image: string;
}

interface Props {
  images: string[];
  productName: string;
  /** True for the LCP image on a product page. */
  priority?: boolean;
  /**
   * The product's finishes, for the phone scroll preview. Omitted, or with
   * fewer than two items, the photograph is a plain image as before.
   */
  feed?: {
    items: FeedItem[];
    /** The selected finish's position in `items`, or -1. */
    activeIndex: number;
    /** A deliberate tap on "Choose this finish" - the only thing that selects. */
    onChoose: (index: number) => void;
  };
}

/** Page scroll, in px, that moves the preview on by one finish. */
const SCRUB_STEP_PX = 80;

const PHONE_QUERY = '(max-width: 767px)';
function subscribePhone(onChange: () => void) {
  const query = window.matchMedia(PHONE_QUERY);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

export default function ProductGallery({ images, productName, priority = false, feed }: Props) {
  const [index, setIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  /*
   * Phone scroll preview: scrolling the page past the photograph pins it and
   * rolls it through every finish, one per SCRUB_STEP_PX, then lets go and the
   * page carries on to the bundle and the price.
   *
   * It is ordinary page scroll the whole way - no nested scroller, no captured
   * gesture - so nobody can get stuck in the photograph. And it is a PREVIEW:
   * passing a finish does not select it. If it did, everyone who scrolled down
   * to the price would arrive with the last finish in the list selected, and
   * the cart would get whatever that was. Selecting takes a tap.
   *
   * Phone-only by media query, evaluated after hydration, so the server HTML
   * and desktop are the single photograph they always were.
   */
  const isPhone = useSyncExternalStore(
    subscribePhone,
    () => window.matchMedia(PHONE_QUERY).matches,
    () => false,
  );
  const hasFeed = !!feed && feed.items.length > 1;
  const scrubOn = hasFeed && isPhone;
  const itemCount = feed?.items.length ?? 0;
  const trackRef = useRef<HTMLDivElement>(null);
  const [scrubIndex, setScrubIndex] = useState<number | null>(null);
  // The finish photographs are only mounted once the photograph is near the
  // viewport on a phone, so nobody on a desktop - or who never scrolls this
  // far - downloads eleven extra images.
  const [nearby, setNearby] = useState(false);

  useEffect(() => {
    if (!scrubOn) return;
    const track = trackRef.current;
    const pin = track?.firstElementChild as HTMLElement | null;
    if (!track || !pin) return;

    let frame = 0;
    const update = () => {
      frame = 0;
      const pinTop = parseFloat(getComputedStyle(pin).top) || 0;
      const scrolled = pinTop - track.getBoundingClientRect().top;
      // One step of lead-in showing the selected finish, then one per finish.
      const step = Math.floor(scrolled / SCRUB_STEP_PX) - 1;
      setScrubIndex(step >= 0 && step < itemCount ? step : null);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    const observer = new IntersectionObserver(([entry]) => setNearby(entry.isIntersecting), {
      rootMargin: '600px 0px',
    });
    observer.observe(track);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [scrubOn, itemCount]);

  const preview = scrubOn ? scrubIndex : null;

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

  const photo = (
    <div className={`image-container product-image${preview !== null ? ' is-previewing' : ''}`}>
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

      {/* The preview's finish photographs, stacked over the selected one and
          faded in one at a time. Decorative: the swatch radiogroup above is
          the accessible way to see and pick a finish. */}
      {scrubOn && nearby && (
        <span className="stain-scrub-layers" aria-hidden="true">
          {feed.items.map((item, i) => (
            <Image
              key={item.key}
              src={item.image}
              alt=""
              fill
              sizes="100vw"
              className={i === preview ? 'is-visible' : undefined}
              style={{ objectFit: 'contain' }}
            />
          ))}
        </span>
      )}
    </div>
  );

  return (
    <>
      {hasFeed ? (
        /* The track is the scroll distance the preview runs over; the pin
           sticks inside it. Both are inert from 768px. */
        <div
          ref={trackRef}
          className="stain-scrub"
          style={
            scrubOn
              ? ({ '--scrub-length': `${(itemCount + 1) * SCRUB_STEP_PX}px` } as CSSProperties)
              : undefined
          }
        >
          <div className="stain-scrub-pin">
            {photo}
            {scrubOn && (
              <div className="stain-scrub-panel">
                <p className="stain-scrub-name">
                  {feed.items[preview ?? feed.activeIndex]?.label ?? ''}
                  {preview !== null && (
                    <span className="stain-scrub-count">
                      {preview + 1} / {itemCount}
                    </span>
                  )}
                </p>
                {preview !== null && preview !== feed.activeIndex ? (
                  <button
                    type="button"
                    className="button-secondary stain-scrub-choose"
                    onClick={() => {
                      setIndex(0);
                      feed.onChoose(preview);
                    }}
                  >
                    Choose this finish
                  </button>
                ) : (
                  <p className="label-caps stain-scrub-hint">
                    {preview === null ? 'Scroll to preview every finish' : 'Selected'}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        photo
      )}

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
