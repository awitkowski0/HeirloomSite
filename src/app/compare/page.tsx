import type { Metadata } from 'next';
import CompareView from '@/components/compare/CompareView';
import { getBrowsableProducts } from '@/lib/content';
import { toShopItems } from '@/lib/shop';

export const metadata: Metadata = {
  title: 'Side by Side',
  description: 'Compare up to three pieces side by side.',
  alternates: { canonical: '/compare' },
  robots: { index: false, follow: true },
};

export default function ComparePage() {
  return <CompareView catalog={toShopItems(getBrowsableProducts())} />;
}
