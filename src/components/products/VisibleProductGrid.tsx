'use client';

import ProductCard from './ProductCard';
import { useDelistedProducts } from '@/lib/useDelistedProducts';

/**
 * The product grid, minus anything de-listed by a PostHog flag.
 *
 * A client component wrapping a server-rendered list: the products come from
 * the build, so the grid is in the prerendered HTML and only shrinks once
 * flags arrive. See src/lib/useDelistedProducts for what this can and cannot
 * promise - in particular, that a de-listed product is still reachable and
 * still sellable, and that `"hidden": true` is the mechanism for when it must
 * not be.
 */

export interface GridProduct {
  slug: string;
  productName: string;
  category: string | null;
  minPrice: number;
  defaultImage: string | null;
}

export default function VisibleProductGrid({ products }: { products: GridProduct[] }) {
  const { isDelisted } = useDelistedProducts();
  const visible = products.filter(p => !isDelisted(p.slug));

  return (
    <div className="featured-grid">
      {visible.map((p, i) => (
        <ProductCard
          key={p.slug}
          slug={p.slug}
          name={p.productName}
          category={p.category}
          minPrice={p.minPrice}
          img={p.defaultImage}
          /* Index within the VISIBLE list, so the priority hint follows what is
             actually painted rather than what the build happened to order. */
          priority={i < 4}
        />
      ))}
    </div>
  );
}
