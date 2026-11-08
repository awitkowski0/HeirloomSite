import Link from 'next/link';
import Image from 'next/image';
import { formatPriceApprox } from '@/lib/format';
import { PRODUCT_IMAGE_SIZES } from '@/lib/images';
import { resolveFeature, indexByProductName } from '@/lib/showroom';
import { getBuilder, type BuilderId } from '@/lib/builders';
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
const STYLES: { productName: string; descriptor: string; builderId: BuilderId }[] = [
  { productName: 'Mission', descriptor: 'Straight slats, square posts, no ornament.', builderId: 'fishers-quality-products' },
  { productName: 'West Lake Crib', descriptor: 'Arched headboard panels and a rope-carved rail.', builderId: 'old-town-oak' },
  { productName: 'French Country Crib (Slat Style Front)', descriptor: 'A panelled headboard, scalloped base, and curved legs.', builderId: 'old-town-oak' },
];

export default function StyleCards({ inventory }: { inventory: InventoryItem[] }) {
  const byName = indexByProductName(inventory);

  const cards = STYLES.map(s => {
    const resolved = resolveFeature({ productName: s.productName }, byName);
    return resolved ? { ...resolved, descriptor: s.descriptor, builder: getBuilder(s.builderId).name } : null;
  }).filter((c): c is NonNullable<typeof c> => c !== null);

  if (cards.length === 0) return null;

  return (
    <section className="home-styles">
      <div className="home-styles-intro">
        <h2 className="home-styles-heading">Shop by look</h2>
        <p className="home-styles-copy">
          Different shops have different hands. Find the shape you love, see who builds it, then
          choose from that builder&rsquo;s finishes.
        </p>
        <p className="home-styles-copy">
          Convertible styles move from a crib to a toddler bed and then a full-size bed, with the
          kits listed on each product page.
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
              <span className="home-style-desc">By {card.builder}</span>
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
