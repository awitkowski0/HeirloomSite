'use client';

import PieceLink from './PieceLink';
import type { ShopItem } from '@/lib/shop';
import { useDelistedProducts } from '@/lib/useDelistedProducts';

/**
 * A fixed row of listing cards (the home page's), minus anything de-listed by
 * a PostHog `product-<slug>` flag, the same as the listing grid. The cards are
 * in the prerendered HTML and a de-listed one drops out once flags arrive; see
 * src/lib/useDelistedProducts.ts.
 */
export default function PieceRow({ items }: { items: ShopItem[] }) {
  const { isDelisted } = useDelistedProducts();
  return (
    <div className="piece-grid">
      {items
        .filter(i => !isDelisted(i.slug))
        .map(item => (
          <PieceLink key={item.slug} item={item} />
        ))}
    </div>
  );
}
