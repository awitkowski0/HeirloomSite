import type { Metadata } from 'next';
import PickRun from '@/components/pick/PickRun';
import { getBrowsableProducts, getProductIndex } from '@/lib/content';
import { PICK_CRIBS } from '@/lib/photo-notes';
import { toShopItems } from '@/lib/shop';

export const metadata: Metadata = {
  title: 'Help Me Pick',
  description: 'Seven quick picks between two photos, and a short list of real pieces that match what you chose.',
  alternates: { canonical: '/pick' },
};

const PICK_STORAGE = ['newport-4-drawer-chest', 'mackenzie-chest', 'newport-7-drawer-dresser', 'mackenzie-6-drawer-dresser', 'newport-nightstand'];

export default function PickPage() {
  const browsable = getBrowsableProducts();
  const wanted = new Set([...Object.keys(PICK_CRIBS), ...PICK_STORAGE]);
  const products = getProductIndex().filter(p => wanted.has(p.slug) && browsable.some(b => b.slug === p.slug));
  return <PickRun items={toShopItems(products)} />;
}
