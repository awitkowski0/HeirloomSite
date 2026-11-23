import Link from 'next/link';

/**
 * The updated logo (LOGO-1): crib and "Heirloom" from 768px up, the
 * wordmark alone below that. Transparent PNGs at 128px tall so they stay
 * sharp at 2x. /logo-wide.png (the older brown artwork) stays the og:image
 * and is not used here.
 */
export default function BrandLogo({ className }: { className?: string }) {
  return (
    <Link href="/" className={className} aria-label="Heirloom Cribs & More, home">
      {/* <picture> switches artwork by width, which next/image cannot do. */}
      <picture>
        <source media="(min-width: 768px)" srcSet="/brand/logo-wide.png" width={562} height={128} />
        <img src="/brand/logo-text.png" alt="" width={452} height={128} />
      </picture>
    </Link>
  );
}
