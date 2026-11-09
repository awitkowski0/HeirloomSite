import type { ShopItem } from '@/lib/shop';
import type { CartItem } from '@/types';
import { cartItemId } from '@/context/cartStore';

export type NurseryStep = 'crib' | 'mattress' | 'dresser' | 'nightstand' | 'kits';

export const NURSERY_STEPS: readonly { id: NurseryStep; label: string }[] = [
  { id: 'crib', label: 'Crib' },
  { id: 'mattress', label: 'Mattress' },
  { id: 'dresser', label: 'Dresser' },
  { id: 'nightstand', label: 'Nightstand' },
  { id: 'kits', label: 'Kits' },
];

/* Cart lines carry a name and no category. */
export function stepFor(name: string): NurseryStep {
  if (name === 'Crib Mattress') return 'mattress';
  if (/rail|guard|toddler bed/i.test(name)) return 'kits';
  if (/dresser|chest|changing/i.test(name)) return 'dresser';
  if (/nightstand/i.test(name)) return 'nightstand';
  return 'crib';
}

/** A line for one exact finish of a piece, or null if that finish can't be bought. */
export function cartLineFor(item: ShopItem, finishName: string | null): CartItem | null {
  const finish = (finishName && item.finishImages.find(f => f.name === finishName)) || item.finishImages[0];
  if (!finish || !finish.wood || !finish.stainName || typeof finish.price !== 'number') return null;
  const base = { productName: item.name, wood: finish.wood, stainName: finish.stainName };
  return { ...base, id: cartItemId(base), slug: item.slug, price: finish.price, image: finish.image, quantity: 1 };
}

/** Bundle-priced kits whose crib has left the cart, so they are back at list price. */
export function orphanedKits(lines: readonly CartItem[]): CartItem[] {
  return lines.filter(
    line => line.bundledWith && !lines.some(p => p.productName === line.bundledWith?.productName && p.wood === line.bundledWith?.wood),
  );
}
