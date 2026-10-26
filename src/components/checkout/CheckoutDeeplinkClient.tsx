'use client';

import { useEffect, useRef } from 'react';
import CheckoutClient from './CheckoutClient';
import type { Recommendation } from './AlsoLike';
import { useCart } from '@/context/useCart';
import { cartItemId } from '@/context/cartStore';
import { formatPrice } from '@/lib/format';
import type { CheckoutDeeplinkProduct } from '@/lib/checkout-deeplink';

interface Props {
  product: CheckoutDeeplinkProduct;
  quantity: number;
  recommendations: Record<string, Recommendation[]>;
}

/**
 * Lands the Merchant Center `/checkout/{id}:{qty}` link on the normal checkout.
 *
 * The product name, price and image are server-rendered from props (this
 * component is prerendered on the server), so Google's checker sees the right
 * product in the raw HTML even before any script runs. On the client it adds
 * the item to the existing localStorage cart once, then the unchanged
 * CheckoutClient below drives the same draft-invoice flow as always. The price
 * is the server-side feed price; nothing here trusts the URL for it.
 */
export default function CheckoutDeeplinkClient({ product, quantity, recommendations }: Props) {
  const { addToCart } = useCart();
  const added = useRef(false);

  useEffect(() => {
    // Guard against adding twice: once for React's double-invoke in dev
    // (added ref), and once for a reload of the same deep link in the same tab
    // (sessionStorage key), so refreshing /checkout/{id}:{qty} does not keep
    // inflating the quantity. A genuinely new visit (new tab/session) still adds.
    if (added.current) return;
    added.current = true;
    const onceKey = `heirloom_deeplink_added:${product.id}:${quantity}`;
    try {
      if (sessionStorage.getItem(onceKey)) return;
      sessionStorage.setItem(onceKey, '1');
    } catch {
      // sessionStorage unavailable (private mode / blocked) — fall through and add.
    }
    const base = {
      productName: product.productName,
      wood: product.wood,
      stainName: product.stainName,
    };
    addToCart({
      ...base,
      id: cartItemId(base),
      price: product.priceDollars,
      image: product.image,
      quantity,
    });
  }, [addToCart, product, quantity]);

  return (
    <>
      {/*
        Server-rendered summary of the exact product this link resolves to.
        Present in the initial HTML (no sign-in, no client fetch) so a crawler
        reading the raw response sees the product, price and image. It is
        `visually-hidden` (clipped, but still in the DOM and the accessibility
        tree) rather than removed: shoppers land on the normal checkout and must
        not see a bare unstyled block, but the product name and price have to
        stay in the raw HTML for Google’s checkout crawler.
      */}
      <section
        className="deeplink-summary visually-hidden"
        aria-label="Selected product"
        data-feed-id={product.id}
      >
        {product.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.image}
            alt={product.productName}
            width={96}
            height={96}
            className="deeplink-summary-image"
          />
        ) : null}
        <div>
          <p className="deeplink-summary-name">{product.productName}</p>
          <p className="deeplink-summary-price">
            <span data-checkout-price={product.priceDollars.toFixed(2)}>
              {formatPrice(product.priceDollars)}
            </span>
            {' · Qty '}
            {quantity}
          </p>
        </div>
      </section>
      <CheckoutClient recommendations={recommendations} />
    </>
  );
}
