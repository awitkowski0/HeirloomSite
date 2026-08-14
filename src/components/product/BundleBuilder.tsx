'use client';

import { formatPrice } from '@/lib/format';
import type { RelatedProduct } from '@/types';

/**
 * "Build Your Bundle" -- the conversion kits and mattress that make a crib the
 * 4-in-1 it is advertised as.
 *
 * Every row is a real product with its own page, SKU and price, so ticking one
 * adds its OWN cart line rather than inflating the crib's. That keeps
 * src/lib/pricing.ts authoritative with no new pricing concept to validate, and
 * means an invoice itemises what was actually bought instead of one opaque
 * total. The "Bundle Total" here is presentation only; the server re-prices
 * every line from the catalogue regardless of what the browser says.
 *
 * Everything starts ticked, matching the shop's other storefront: the crib is
 * sold on converting through four stages, and a buyer who has to discover the
 * rail kits separately finds out at the toddler bed stage that they are missing
 * a part.
 */

interface Props {
  productName: string;
  basePrice: number;
  baseImage: string;
  items: RelatedProduct[];
  selected: ReadonlySet<string>;
  onToggle: (slug: string) => void;
}

export default function BundleBuilder({
  productName,
  basePrice,
  baseImage,
  items,
  selected,
  onToggle,
}: Props) {
  if (items.length === 0) return null;

  const total =
    basePrice + items.reduce((sum, i) => (selected.has(i.slug) ? sum + i.price : sum), 0);
  /*
   * Counted from the rows on screen, not from the size of the selection.
   *
   * The selection is seeded once at mount and a row can leave `items` later -
   * a PostHog de-listing arrives after flags load - which left the selection
   * holding a slug with no row and the header reading "4 of 3 added".
   */
  const selectedCount = items.filter(i => selected.has(i.slug)).length;

  return (
    <section className="bundle" aria-labelledby="bundle-heading">
      <div className="bundle-head">
        <h2 id="bundle-heading" className="label-caps">
          Build Your Bundle
        </h2>
        <span className="body-md text-on-surface-variant">
          {selectedCount} of {items.length} added
        </span>
      </div>

      {/* The crib itself: shown for context, never a choice - you cannot buy
          the bundle without it. A disabled checkbox would imply otherwise. */}
      <div className="bundle-row bundle-row--base">
        <span className="bundle-thumb">
          {/* eslint-disable-next-line @next/next/no-img-element -- 48px thumbnail. */}
          {baseImage ? <img src={baseImage} alt="" /> : null}
        </span>
        <span className="bundle-name body-md">{productName}</span>
        <span className="bundle-price body-md">{formatPrice(basePrice)}</span>
      </div>

      <ul className="bundle-list">
        {items.map(item => {
          const isOn = selected.has(item.slug);
          return (
            <li key={item.slug} className="bundle-row">
              <span className="bundle-thumb">
                {/* eslint-disable-next-line @next/next/no-img-element -- 48px thumbnail. */}
                {item.image ? <img src={item.image} alt="" /> : null}
              </span>
              {/*
                The whole row is the label, so the tap target is the row rather
                than a 16px box - this is a phone-first checkout.
              */}
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
