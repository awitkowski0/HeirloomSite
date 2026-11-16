import type { Metadata } from 'next';
import PickRun from '@/components/pick/PickRun';
import { getBrowsableProducts } from '@/lib/content';
import { PICK_CRIBS, PICK_STORAGE } from '@/lib/pick-run';
import { toShopItems } from '@/lib/shop';

export const metadata: Metadata = {
  title: 'Help Me Pick',
  description: 'Seven quick picks between two photos, and a short list of real pieces that match what you chose.',
  alternates: { canonical: '/pick' },
  openGraph: { url: '/pick' },
};

/* Only the pieces the picker can show or suggest, so the page ships a small catalogue. */
export default function PickPage() {
  const wanted = new Set([...Object.keys(PICK_CRIBS), ...PICK_STORAGE]);
  const products = getBrowsableProducts().filter(p => wanted.has(p.slug));
  return (
    <div className="container products-page">
      <PickRun items={toShopItems(products)} />
    </div>
  );
}
