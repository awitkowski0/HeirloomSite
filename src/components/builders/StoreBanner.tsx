import Image from 'next/image';
import Link from 'next/link';
import type { Builder } from '@/lib/builders';

/* The store's front: a real catalog photo with the name and quote on linen. No photo on the record, the text stands alone. */
export default function StoreBanner({ builder }: { builder: Builder }) {
  const { banner, intro, name } = builder;
  return (
    <header className={banner ? 'store-banner' : 'store-banner store-banner--plain'}>
      {banner ? (
        <div className="store-banner__photo">
          <Image src={banner.image} alt={banner.alt} fill sizes="(max-width: 859px) 100vw, 680px" loading="eager" fetchPriority="high" />
        </div>
      ) : null}
      <div className="store-banner__text">
        <h1>{name}</h1>
        <blockquote>
          <p>&ldquo;{intro.text}&rdquo;</p>
          <cite>From {name}</cite>
        </blockquote>
      </div>
    </header>
  );
}

/* The banner inside a section: the name only, and the way back to the store. */
export function StoreBannerBar({ builder }: { builder: Builder }) {
  return (
    <p className="store-bar">
      <Link href={builder.href} className="builder-name">{builder.name}</Link>
    </p>
  );
}
