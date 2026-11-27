import { useEffect, useRef } from 'react';

/** Quiet time after the last scroll event that counts as "settled" where
    `scrollend` does not exist (Safari before 26.2). */
const SETTLE_MS = 120;

/** Longest a scripted scroll is trusted to still be in flight. */
const PENDING_MS = 1000;

/**
 * One horizontal scroll-snap track of full-width slides, shared by the page
 * carousel and the lightbox.
 *
 * The browser does the moving - swipe momentum, snapping, trackpad gestures.
 * This only keeps `index` and the scroll position telling the same story:
 *
 *  - `goTo` reports the new index straight away, so thumbnails and the counter
 *    change when the visitor decides rather than after the slide arrives, then
 *    scrolls the track there.
 *  - A swipe is followed live, one read per animation frame, and confirmed
 *    when the scroll settles (`scrollend`, or a debounce where that is
 *    missing).
 *  - While a scripted scroll is in flight nothing is read back. The track
 *    passes over the slides in between, and reporting those would walk the
 *    thumbnails through every photo on the way to the one that was asked for.
 *
 * Put `trackRef`, `onScroll` and `onScrollEnd` on the scroller; its children
 * must be the slides.
 */
export function useSlideTrack(count: number, index: number, onIndexChange: (index: number) => void) {
  const trackRef = useRef<HTMLDivElement>(null);
  const pending = useRef(false);
  const frame = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const report = () => {
    const track = trackRef.current;
    // Zero width is a closed dialog: there is no position to read.
    if (!track || track.clientWidth === 0) return;
    const nearest = Math.round(track.scrollLeft / track.clientWidth);
    const i = Math.max(0, Math.min(nearest, count - 1));
    if (i !== index) onIndexChange(i);
  };
  const settle = () => {
    clearTimeout(timer.current);
    pending.current = false;
    report();
  };

  // The frame and timer callbacks outlive the render that scheduled them, so
  // they call through refs to whichever closure is current when they fire.
  const latest = useRef({ report, settle });
  useEffect(() => {
    latest.current = { report, settle };
  });
  useEffect(
    () => () => {
      cancelAnimationFrame(frame.current);
      clearTimeout(timer.current);
    },
    [],
  );

  const goTo = (i: number, behavior: ScrollBehavior = 'smooth') => {
    const target = Math.max(0, Math.min(i, count - 1));
    if (target !== index) onIndexChange(target);
    const track = trackRef.current;
    const slide = track?.children[target] as HTMLElement | undefined;
    if (!track || !slide) return;
    const left = slide.offsetLeft;
    if (Math.abs(track.scrollLeft - left) < 1) return;

    pending.current = true;
    // Never stay deaf: a scroll that is interrupted, or that a browser
    // declines to perform, may not report an end.
    clearTimeout(timer.current);
    timer.current = setTimeout(() => latest.current.settle(), PENDING_MS);
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    track.scrollTo({ left, behavior: reduceMotion ? 'instant' : behavior });
  };

  const onScroll = () => {
    if (!('onscrollend' in window)) {
      clearTimeout(timer.current);
      timer.current = setTimeout(() => latest.current.settle(), SETTLE_MS);
    }
    if (pending.current || frame.current) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = 0;
      if (!pending.current) latest.current.report();
    });
  };

  return { trackRef, goTo, onScroll, onScrollEnd: settle };
}
