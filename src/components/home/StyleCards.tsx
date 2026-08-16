import Link from 'next/link';
import Image from 'next/image';
import { formatPriceApprox } from '@/lib/format';
import { PRODUCT_IMAGE_SIZES } from '@/lib/images';
import { resolveFeature, indexByProductName } from '@/lib/showroom';
import type { InventoryItem } from '@/types';

/*
 * "Start with the style" - three named crib styles, priced from real data.
 *
 * The brief specified "STARTING AT $1,295". No crib in the catalogue is under
 * $1,889 and the Style line runs $2,050-$3,150, so the figure is computed from
 * the resolved configuration rather than written in. A hard-coded price on a
 * page that takes card payments is not a design detail.
 */

/*
 * The names here MUST match `productName` in the catalogue exactly - this is a
 * Map lookup, not a search. They read "Mission Style", "Hudson Style" and
 * "Darlington Style" while the products are "Mission", "Hudson" and
 * "Darlington", so every card resolved to null and this whole section rendered
 * nothing at all. resolveFeature now warns at build time when a name misses.
 */
const STYLES: { productName: string; descriptor: string }[] = [
  { productName: 'Mission', descriptor: 'Straight slats, square posts, no ornament.' },
  { productName: 'Hudson', descriptor: 'A low arched headboard with a flat top rail.' },
  { productName: 'Darlington', descriptor: 'Panelled ends and a gently curved crest.' },
];

export default function StyleCards({ inventory }: { inventory: InventoryItem[] }) {
  const byName = indexByProductName(inventory);

  const cards = STYLES.map(s => {
    const resolved = resolveFeature({ productName: s.productName }, byName);
    return resolved ? { ...resolved, descriptor: s.descriptor } : null;
  }).filter((c): c is NonNullable<typeof c> => c !== null);

  if (cards.length === 0) return null;

  return (
    <section className="home-styles">
      <div className="home-styles-intro">
        <h2 className="home-styles-heading">Start with the style</h2>
        <p className="home-styles-copy">
          Every style is offered in three hardwoods and up to eleven finishes, so the shape is
          the decision that matters. Pick the silhouette first; the wood and the stain follow.
        </p>
        <p className="home-styles-copy">
          All of them convert through the same four stages, and all of them take the same guard
          rails.
        </p>
        <Link href="/products/cribs" className="home-styles-link">
          Explore all styles &rarr;
        </Link>
      </div>

      <ul className="home-styles-grid">
        {cards.map(card => (
          <li key={card.slug} className="home-style-card">
            <Link href={`/product/${card.slug}`} className="home-style-link">
              <span className="home-style-img">
                {card.image ? (
                  <Image
                    src={card.image}
                    alt={card.productName}
                    fill
                    sizes={PRODUCT_IMAGE_SIZES}
                    style={{ objectFit: 'contain' }}
                  />
                ) : null}
              </span>
              <span className="label-caps home-style-name">{card.productName}</span>
              <span className="home-style-desc">{card.descriptor}</span>
              <span className="home-style-price">
                <span className="label-caps home-style-from">Starting at</span>
                <span className="home-style-figure">{formatPriceApprox(card.price)}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
