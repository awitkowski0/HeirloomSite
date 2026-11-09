'use client';

import { formatPrice } from '@/lib/format';
import type { RelatedProduct } from '@/types';

/*
 * What comes with the crib and what can be added, directly above the one
 * add button, which carries the live total. Included rows ship inside the crib's
 * price and are display only; each ticked add-on becomes its own cart line, so
 * src/lib/pricing.ts stays authoritative and an invoice itemises correctly.
 */
interface Props {
  included: RelatedProduct[];
  items: RelatedProduct[];
  selected: ReadonlySet<string>;
  onToggle: (slug: string) => void;
}

export default function BundleBuilder({ included, items, selected, onToggle }: Props) {
  return (
    <section className="bundle" aria-label="Kits and add-ons">
      {included.length > 0 && (
        <>
          <p className="bundle-group label-caps">Included with your crib</p>
          <ul className="bundle-list">
            {included.map(item => (
              <li key={item.slug} className="bundle-row bundle-row--included">
                <span className="bundle-thumb">
                  {/* eslint-disable-next-line @next/next/no-img-element -- 48px thumbnail. */}
                  {item.image ? <img src={item.image} alt="" /> : null}
                </span>
                <span className="bundle-name body-md">{item.productName}</span>
                <span className="bundle-included label-caps">Included</span>
              </li>
            ))}
          </ul>
        </>
      )}

      {items.length > 0 && (
        <>
          <p className="bundle-group label-caps">Add to your order</p>
          <ul className="bundle-list">
            {items.map(item => {
              const isOn = selected.has(item.slug);
              return (
                <li key={item.slug}>
                  <label className="bundle-row bundle-option" htmlFor={`bundle-${item.slug}`} data-checked={isOn ? 'true' : 'false'}>
                    <input
                      type="checkbox"
                      id={`bundle-${item.slug}`}
                      className="bundle-check"
                      checked={isOn}
                      onChange={() => onToggle(item.slug)}
                    />
                    <span className="bundle-thumb">
                      {/* eslint-disable-next-line @next/next/no-img-element -- 48px thumbnail. */}
                      {item.image ? <img src={item.image} alt="" /> : null}
                    </span>
                    <span className="bundle-name body-md">{item.productName}</span>
                    <span className="bundle-price body-md">{formatPrice(item.price)}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}
