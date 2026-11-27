'use client';

import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from 'react';
import Image from 'next/image';
import PhotoThumbs from './PhotoThumbs';
import ProductLightbox from './ProductLightbox';
import { useSlideTrack } from './useSlideTrack';

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
  /*
   * The slide index belongs to one photo list. Choosing another finish swaps
   * the list and remounts the carousel at its first photo (it is keyed on
   * imagesKey below), so the index has to start over with it - tracked here
   * by key rather than reset in an effect, which would render one frame
   * pointing at the old position.
   */
  const imagesKey = images.join('|');
  const [position, setPosition] = useState({ key: imagesKey, index: 0 });
  const index = position.key === imagesKey ? position.index : 0;
  const setIndex = (i: number) => setPosition({ key: imagesKey, index: i });
  const count = images.length;
  const safeIndex = Math.min(index, Math.max(0, count - 1));
  /*
   * The carousel is a native scroll-snap track; useSlideTrack keeps the index
   * and its scroll position in step. Lightbox moves pass 'instant' - the
   * carousel is behind the lightbox then, and nobody is there to watch it
   * glide.
   */
  const { trackRef: slidesRef, goTo, onScroll, onScrollEnd } = useSlideTrack(count, safeIndex, setIndex);
  const prevRef = useRef<HTMLButtonElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
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
  const [pastPreview, setPastPreview] = useState(false);
  // The finish photographs are only mounted once the photograph is near the
  // viewport on a phone, so nobody on a desktop - or who never scrolls this
  // far - downloads eleven extra images.
  const [nearby, setNearby] = useState(false);
  // True while the page glides past the preview after "Choose this finish".
  const jumpingRef = useRef(false);

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
      const inZone = step >= 0 && step < itemCount && !jumpingRef.current;
      setScrubIndex(inZone ? step : null);
      setPastPreview(step >= itemCount);
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
   * After "Choose this finish", carry the visitor past the rest of the
   * preview to where the photograph lets go - the chosen finish in the photo,
   * the bundle and price directly under it. That is the next decision, and
   * otherwise they would have to scroll through every remaining finish to get
   * there. The preview is frozen for the glide, or the finishes still ahead
   * would flash past on the way.
   */
  const scrollPastPreview = () => {
    const track = trackRef.current;
    const pin = track?.firstElementChild as HTMLElement | null;
    if (!track || !pin) return;
    const pinTop = parseFloat(getComputedStyle(pin).top) || 0;
    const zone = (itemCount + 1) * SCRUB_STEP_PX;
    // +2: landing a fraction short of the zone's end would leave it one step
    // inside, still frozen, with nothing left to scroll and un-freeze it.
    const target = window.scrollY + track.getBoundingClientRect().top - pinTop + zone + 2;

    jumpingRef.current = true;
    setScrubIndex(null);
    const release = () => {
      jumpingRef.current = false;
      window.removeEventListener('scrollend', release);
    };
    window.addEventListener('scrollend', release);
    // scrollend is not everywhere yet (older Safari); never stay frozen.
    setTimeout(release, 1500);

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: target, behavior: reduceMotion ? 'instant' : 'smooth' });
  };

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

  /*
   * An arrow at the end of its run is disabled, and a disabled button drops
   * focus onto <body> - which would send a keyboard back to the top of the
   * page. Hand focus to the arrow that still works instead.
   */
  const stepTo = (target: number) => {
    goTo(target);
    if (target <= 0) nextRef.current?.focus();
    else if (target >= count - 1) prevRef.current?.focus();
  };

  /*
   * The dialog hands focus back to whichever slide opened it, but the visitor
   * may have moved on since and that slide is now off screen and out of the
   * tab order. Put focus on the photo they are looking at, without letting the
   * focus scroll the carousel.
   */
  const closeLightbox = () => {
    setLightboxOpen(false);
    (slidesRef.current?.children[safeIndex] as HTMLElement | undefined)?.focus({ preventScroll: true });
  };

  /*
   * The photograph is a carousel: every photo is a slide in one horizontal
   * scroll-snap track. Swipe on a phone, arrows on a pointer device, and the
   * thumbnails below jump. It is one DOM tree in every viewport - CSS hides
   * the arrows where there is no hover - and only the first slide is a
   * priority (LCP) image; the rest load lazily as they near the viewport.
   *
   * The old single photo had no arrows on purpose: they duplicated the
   * thumbnails while only ever showing one image at a time. A carousel is the
   * other way round - swiping is the main way through it on a phone, where
   * the thumbnails are below the fold during the finish preview.
   */
  const photo = (
    <div className={`image-container product-image${preview !== null ? ' is-previewing' : ''}`}>
      {count > 1 && (
        <>
          <button
            ref={prevRef}
            type="button"
            className="slide-nav slide-nav-prev"
            onClick={() => stepTo(safeIndex - 1)}
            disabled={safeIndex === 0}
            aria-label="Previous photo"
          >
            <span className="material-symbols-outlined" aria-hidden="true">chevron_left</span>
          </button>
          <button
            ref={nextRef}
            type="button"
            className="slide-nav slide-nav-next"
            onClick={() => stepTo(safeIndex + 1)}
            disabled={safeIndex === count - 1}
            aria-label="Next photo"
          >
            <span className="material-symbols-outlined" aria-hidden="true">chevron_right</span>
          </button>
        </>
      )}
      <div
        key={imagesKey}
        ref={slidesRef}
        onScroll={onScroll}
        onScrollEnd={onScrollEnd}
        className="slide-track product-slides"
        role={count > 1 ? 'region' : undefined}
        aria-roledescription={count > 1 ? 'carousel' : undefined}
        aria-label={count > 1 ? `${productName} photos` : undefined}
      >
        {images.map((src, i) => (
          <button
            key={src}
            type="button"
            onClick={() => {
              setIndex(i);
              setLightboxOpen(true);
            }}
            aria-label={
              count > 1
                ? `Open fullscreen view of ${productName}, photo ${i + 1} of ${count}`
                : `Open fullscreen view of ${productName}`
            }
            // Only the visible slide is in the tab order; the arrows and
            // thumbnails are how a keyboard moves between them.
            tabIndex={i === safeIndex ? 0 : -1}
            className="product-slide"
          >
            <Image
              src={src}
              alt={i === 0 ? productName : `${productName}, photo ${i + 1}`}
              fill
              /* The first photo is the page's LCP image: fetch it eagerly
                and at high priority. `priority` is deprecated in Next 16 and
                no longer raises the fetch priority; the rest stay lazy. */
              loading={priority && i === 0 ? 'eager' : undefined}
              fetchPriority={priority && i === 0 ? 'high' : undefined}
              /* The grid does not split until 1024px, but this claimed 55vw
                from 769px up - so every tablet was told to fetch roughly half
                the pixels it actually renders. */
              sizes="(max-width: 1023px) 100vw, 50vw"
              style={{ objectFit: 'contain' }}
            />
          </button>
        ))}
      </div>

      {count > 1 && (
        <div className="product-slides-status">
          <span className="product-slides-progress" aria-hidden="true">
            {images.map((src, i) => (
              <span key={src} className={i === safeIndex ? 'is-current' : undefined} />
            ))}
          </span>
          <span className="product-slides-count" aria-hidden="true">
            {safeIndex + 1} / {count}
          </span>
          <span className="visually-hidden" role="status">
            Photo {safeIndex + 1} of {count}
          </span>
        </div>
      )}

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
           sticks inside it. Both are inert from 768px.

           The length and the panel are in the server HTML rather than added
           once the phone query resolves: CSS only reads them at phone width,
           and adding ~900px of page under the photograph after hydration
           shoved the bundle and price down the screen (CLS 0.13-0.21). */
        <div
          ref={trackRef}
          className="stain-scrub"
          style={{ '--scrub-length': `${(itemCount + 1) * SCRUB_STEP_PX}px` } as CSSProperties}
        >
          <div className="stain-scrub-pin">
            {photo}
            {hasFeed && (
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
                      // Selects, and moves the address bar to this finish's
                      // URL (the configurator's syncUrl).
                      feed.onChoose(preview);
                      scrollPastPreview();
                    }}
                  >
                    Choose this finish
                  </button>
                ) : (
                  <p className="label-caps stain-scrub-hint">
                    {preview === null && !pastPreview ? 'Scroll to preview every finish' : 'Selected'}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        photo
      )}

      {count > 1 && (
        <PhotoThumbs
          images={images}
          index={safeIndex}
          onSelect={goTo}
          label={`${productName} photos`}
          className="gallery-thumbs"
        />
      )}

      <ProductLightbox
        open={lightboxOpen}
        onClose={closeLightbox}
        images={images}
        productName={productName}
        index={safeIndex}
        // Keep the page carousel on the same photo, so closing lands where
        // the visitor left off.
        onIndexChange={i => goTo(i, 'instant')}
      />
    </>
  );
}
