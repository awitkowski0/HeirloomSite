import Link from 'next/link';
import { formatPrice } from '@/lib/format';
import type { RelatedProduct } from '@/types';

/**
 * The rest of the matching family -- the dressers, nightstands and chests that
 * complete the nursery.
 *
 * Links, not add-to-cart controls. Unlike a bundle item, a related product can
 * have its own finish to choose, so the only honest thing a compact row can do
 * is take you to the page where you choose it.
 *
 * This exists as much for layout as for merchandising. At >=1024px the product
 * page is a 12-column grid with the photo spanning 7 and the configuration
 * panel 5. On the 43 `variantType: "none"` products -- every dresser,
 * nightstand, chest and rail kit -- that panel holds a price and two buttons,
 * about 200px of content against a ~910px photo. Two thirds of the catalogue
 * rendered most of a screen of blank column.
 *
 * Carries no 'use client' directive, but ProductConfigurator imports it, so it
 * ships in the client bundle regardless - that is how the boundary works. It
 * holds no state and no handlers, so the cost is the markup and nothing else.
 */

interface Props {
  items: RelatedProduct[];
  /** Heading. Differs by context: a crib completes a nursery, a dresser matches one. */
  heading?: string;
}

export default function RelatedProducts({ items, heading = 'Completes the collection' }: Props) {
  if (items.length === 0) return null;

  return (
    <section className="related" aria-labelledby="related-heading">
      <h2 id="related-heading" className="label-caps related-head">
        {heading}
      </h2>
      <ul className="related-list">
        {items.map(item => (
          <li key={item.slug}>
            <Link href={`/product/${item.slug}`} className="related-row">
              <span className="related-thumb">
                {/* eslint-disable-next-line @next/next/no-img-element -- 48px thumbnail. */}
                {item.image ? <img src={item.image} alt="" /> : null}
              </span>
              <span className="related-name body-md">{item.productName}</span>
              {/* "From": these targets have variants, so this is the lowest of
                  them, not the price of any one configuration. */}
              <span className="related-price body-md">From {formatPrice(item.price)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
