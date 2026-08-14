'use client';

import { formatPrice } from '@/lib/format';
import type { RelatedProduct } from '@/types';

/**
 * What comes with the crib, and what can be added to it.
 *
 * Two groups, because they are two different things and conflating them was a
 * pricing bug, not a presentation one. The conversion rails and the guard rail
 * already ship with the crib and are already inside its price; they are listed
 * because "4-in-1 convertible" is a claim a buyer should be able to check, not
 * because they are for sale. The mattress is genuinely extra.
 *
 * Every row used to be a ticked checkbox that added its own priced cart line,
 * which billed $4,088 for an Addison that costs $3,178 - the three included
 * kits charged for a second time.
 *
 * The add-on rows are still real products with their own pages and prices, so
 * ticking one adds its own cart line rather than inflating the crib's. That
 * keeps src/lib/pricing.ts authoritative and makes an invoice itemise
 * correctly. The total here is presentation only; the server re-prices every
 * line from the catalogue regardless of what the browser says.
 */

interface Props {
  productName: string;
  basePrice: number;
  baseImage: string;
  /** Ships with the crib, already paid for. Display only. */
  included: RelatedProduct[];
  /** Optional paid extras. */
  items: RelatedProduct[];
  selected: ReadonlySet<string>;
  onToggle: (slug: string) => void;
}

export default function BundleBuilder({
  productName,
  basePrice,
  baseImage,
  included,
  items,
  selected,
  onToggle,
}: Props) {
  if (included.length === 0 && items.length === 0) return null;

  const total =
    basePrice + items.reduce((sum, i) => (selected.has(i.slug) ? sum + i.price : sum), 0);
  /*
   * Counted from the rows on screen, not from the size of the selection: the
   * selection is seeded once at mount and a row can leave `items` later - a
   * PostHog de-listing arrives after flags load - which left the header
   * reading "1 of 0 added".
   */
  const selectedCount = items.filter(i => selected.has(i.slug)).length;

  return (
    <section className="bundle" aria-labelledby="bundle-heading">
      <div className="bundle-head">
        <h2 id="bundle-heading" className="label-caps">
          Build Your Bundle
        </h2>
        {items.length > 0 && (
          <span className="body-md text-on-surface-variant">
            {selectedCount} of {items.length} added
          </span>
        )}
      </div>

      {/* The crib itself: context, never a choice - you cannot buy the bundle
          without it, and a disabled checkbox would imply otherwise. */}
      <div className="bundle-row bundle-row--base">
        <span className="bundle-thumb">
          {/* eslint-disable-next-line @next/next/no-img-element -- 48px thumbnail. */}
          {baseImage ? <img src={baseImage} alt="" /> : null}
        </span>
        <span className="bundle-name body-md">{productName}</span>
        <span className="bundle-price body-md">{formatPrice(basePrice)}</span>
      </div>

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
                <li key={item.slug} className="bundle-row">
                  <span className="bundle-thumb">
                    {/* eslint-disable-next-line @next/next/no-img-element -- 48px thumbnail. */}
                    {item.image ? <img src={item.image} alt="" /> : null}
                  </span>
                  {/* The whole row is the label, so the tap target is the row
                      rather than a 16px box - this is a phone-first checkout. */}
                  <label className="bundle-name body-md" htmlFor={`bundle-${item.slug}`}>
                    {item.productName}
                  </label>
                  <input
                    type="checkbox"
                    id={`bundle-${item.slug}`}
                    className="bundle-check"
                    checked={isOn}
                    onChange={() => onToggle(item.slug)}
                  />
                  <span className="bundle-price body-md">+{formatPrice(item.price)}</span>
                </li>
              );
            })}
          </ul>
        </>
      )}

      <div className="bundle-total">
        <span className="body-lg">Bundle Total</span>
        {/* Announced, because ticking a row changes a number further down the
            page than the control that changed it. */}
        <span className="headline-md" role="status" aria-live="polite">
          {formatPrice(total)}
        </span>
      </div>
    </section>
  );
}
