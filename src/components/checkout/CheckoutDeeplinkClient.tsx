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
 * component is rendered on the server), so Google's checker sees the right
 * product in the raw HTML even before any script runs. On the client it adds
 * the item to the existing localStorage cart once, then the unchanged
 * CheckoutClient below drives the same draft-invoice flow as always. The price
 * is the server-side feed price; nothing here trusts the URL for it.
 */
export default function CheckoutDeeplinkClient({ product, quantity, recommendations }: Props) {
  const { addToCart, cart, hydrated } = useCart();
  const added = useRef(false);

  useEffect(() => {
    // Add once per page load (the ref covers React's dev double-invoke), and
    // only once the stored cart has loaded. If the cart already holds this
    // line - a reload of the same deep link - leave it alone rather than
    // inflating the quantity. Keyed on the cart rather than a session flag, so
    // a shopper who removed the line or finished an order and follows the link
    // again still lands with the product in the cart.
    if (!hydrated || added.current) return;
    added.current = true;
    const base = {
      productName: product.productName,
      wood: product.wood,
      stainName: product.stainName,
    };
    const id = cartItemId(base);
    if (cart.some(line => line.id === id)) return;
    addToCart({
      ...base,
      id,
      price: product.priceDollars,
      image: product.image,
      quantity,
    });
  }, [addToCart, cart, hydrated, product, quantity]);

  return (
    <>
      {/*
        Server-rendered summary of the exact product this link resolves to, in
        the initial HTML (no sign-in, no client fetch) so Google's checkout
        crawler reads the same name, price and image a shopper sees. It stays
        visible: hiding it from shoppers while showing it to the crawler is
        exactly what Merchant Center's landing-page checks penalise.
      */}
      <section
        className="container deeplink-summary"
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
