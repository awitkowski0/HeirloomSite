import { useEffect, useRef } from 'react';

interface Props {
  images: string[];
  index: number;
  onSelect: (index: number) => void;
  /** Accessible name for the group, e.g. "Addison Crib photos". */
  label: string;
  className?: string;
}

/**
 * The thumbnail strip under the page carousel and along the bottom of the
 * lightbox: one button per photo, the current one marked with an ink rule.
 *
 * Plain buttons with aria-current rather than a tablist - there are no tab
 * panels here, and a tablist promises arrow-key roving that these never had.
 */
export default function PhotoThumbs({ images, index, onSelect, label, className }: Props) {
  const railRef = useRef<HTMLDivElement>(null);

  // Keep the current thumbnail in view when the strip overflows. Scrolls the
  // strip itself rather than calling scrollIntoView, which is free to scroll
  // the page as well.
  useEffect(() => {
    const rail = railRef.current;
    const thumb = rail?.children[index] as HTMLElement | undefined;
    if (!rail || !thumb || rail.scrollWidth <= rail.clientWidth) return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    rail.scrollTo({
      left: thumb.offsetLeft - (rail.clientWidth - thumb.offsetWidth) / 2,
      behavior: reduceMotion ? 'instant' : 'smooth',
    });
  }, [index]);

  return (
    <div
      ref={railRef}
      className={className ? `photo-thumbs ${className}` : 'photo-thumbs'}
      role="group"
      aria-label={label}
    >
      {images.map((src, i) => (
        <button
          key={src}
          type="button"
          aria-current={i === index ? 'true' : undefined}
          aria-label={`Photo ${i + 1} of ${images.length}`}
          onClick={() => onSelect(i)}
          className="photo-thumb"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- 64px
              thumbnails; optimizing these would multiply Vercel image
              transformations by every image on every product. */}
          <img src={src} alt="" loading="lazy" />
        </button>
      ))}
    </div>
  );
}
