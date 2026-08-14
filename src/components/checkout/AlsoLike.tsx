'use client';

import { useCart } from '@/context/useCart';
import { cartItemId } from '@/context/CartContext';
import { formatPrice } from '@/lib/format';
import { productAddedToCart } from '@/lib/analytics';
import { useDelistedProducts } from '@/lib/useDelistedProducts';

/**
 * "You may also like" -- the conversion kits and mattress for whatever crib is
 * in the cart, minus whatever is already in it.
 *
 * Everything offered here is a single-configuration product, which is what
 * makes a one-click Add honest: there is no finish to choose, so the button
 * cannot put the wrong thing in the cart. Products that DO have choices are
 * deliberately not recommended at this point -- they would have to bounce the
 * buyer out of the checkout to pick a finish.
 *
 * Prices shown come from the build-time catalogue and are indicative, like
 * every other price in the browser. src/lib/pricing.ts re-prices every line
 * server-side, so nothing here can change what is actually charged.
 */

export interface Recommendation {
  slug: string;
  productName: string;
  price: number;
  image: string | null;
  wood: string | null;
  stainName: string | null;
}

interface Props {
  /** productName -> its bundle, from src/data/recommendations.json. */
  recommendations: Record<string, Recommendation[]>;
  disabled?: boolean;
}

const MAX_SHOWN = 3;

export default function AlsoLike({ recommendations, disabled }: Props) {
  const { cart, addToCart } = useCart();
  const { isDelisted } = useDelistedProducts();

  const inCart = new Set(cart.map(i => i.productName));

  /*
   * Deduped across cart lines: two cribs in one cart both recommend a mattress
   * and a 3/4 guard rail, and offering the same mattress twice reads as a bug.
   */
  const seen = new Set<string>();
  const items: Recommendation[] = [];
  for (const line of cart) {
    for (const rec of recommendations[line.productName] || []) {
      if (inCart.has(rec.productName) || seen.has(rec.slug)) continue;
      // Never recommend something that has been de-listed: an Add button is
      // the one place where offering a withdrawn product is worse than
      // merely showing it.
      if (isDelisted(rec.slug)) continue;
      if (!rec.wood || !rec.stainName) continue;
      seen.add(rec.slug);
      items.push(rec);
    }
  }

  if (items.length === 0) return null;

  return (
    <section className="also-like" aria-labelledby="also-like-heading">
      <h2 id="also-like-heading" className="label-caps also-like-head">
        You may also like
      </h2>
      <ul className="also-like-list">
        {items.slice(0, MAX_SHOWN).map(rec => (
          <li key={rec.slug} className="also-like-row">
            <span className="also-like-thumb">
              {/* eslint-disable-next-line @next/next/no-img-element -- 48px thumbnail. */}
              {rec.image ? <img src={rec.image} alt="" /> : null}
            </span>
            <span className="also-like-name body-md">{rec.productName}</span>
            <span className="also-like-price body-md">{formatPrice(rec.price)}</span>
            <button
              type="button"
              className="button-secondary also-like-add"
              disabled={disabled}
              aria-label={`Add ${rec.productName} to your order`}
              onClick={() => {
                const line = {
                  productName: rec.productName,
                  wood: rec.wood as string,
                  stainName: rec.stainName as string,
                };
                productAddedToCart({
                  product_name: line.productName,
                  wood: line.wood,
                  stain: line.stainName,
                  price: rec.price,
                  quantity: 1,
                });
                addToCart({
                  ...line,
                  id: cartItemId(line),
                  price: rec.price,
                  image: rec.image || '',
                  quantity: 1,
                });
              }}
            >
              Add
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
