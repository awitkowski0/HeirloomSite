import type { Metadata } from 'next';
import CompareView from '@/components/compare/CompareView';
import { getBrowsableProducts } from '@/lib/content';
import { toShopItems } from '@/lib/shop';

/*
 * What is compared lives in the shopper's browser (src/context/selectionsStore.ts),
 * so the page is the same static shell for everyone and is kept out of the
 * index: there is nothing on it until someone has picked pieces.
 */
export const metadata: Metadata = {
  title: 'Compare',
  description: 'Up to three pieces side by side: price, builder, lead time, what each becomes and size.',
  alternates: { canonical: '/compare' },
  robots: { index: false, follow: true },
};

export default function ComparePage() {
  return (
    <div className="container products-page">
      <CompareView catalog={toShopItems(getBrowsableProducts())} />
    </div>
  );
}
