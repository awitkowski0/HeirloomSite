import { getInventory, type ProductIndexItem } from '@/lib/content';
import { toneOf, type Tone } from '@/lib/finish-tones';
import { builderByCode } from '@/lib/builders';
import { skuBuilderCode } from '@/lib/seo';
import type { InventoryItem } from '@/types';

/*
 * One flat, serialisable row per product for the listing grid
 * (src/components/shop/ShopBrowser.tsx), built on the server at prerender so
 * the client only filters data it already has.
 */
export interface ShopItem {
  slug: string;
  productName: string;
  category: string | null;
  /** The lowest buyable price, in dollars. */
  minPrice: number;
  defaultImage: string | null;
  /** True when finishes cost different amounts, so the price needs a "From". */
  priceVaries: boolean;
  builder: { name: string; href: string } | null;
  /** The builder's usual lead time (src/lib/builders.ts), for Compare. */
  leadTime: string | null;
  /** What a crib converts to, from its own kit list; null for anything else. */
  converts: string | null;
  dimensions: string | null;
  /** Every buyable finish, with its photo and measured tone. */
  finishes: { name: string; image: string; tone: Tone | null; wood: string; stainName: string }[];
}

/* What the catalogue's own kit lists say this crib becomes. */
function convertsFor(category: string | null, rows: InventoryItem[]): string | null {
  if (category !== 'Cribs') return null;
  const names = [...(rows[0]?.bundle ?? []), ...(rows[0]?.includes ?? [])].map(k => k.productName);
  const toddler = names.some(n => /toddler/i.test(n));
  const full = names.some(n => /full bed/i.test(n));
  if (toddler && full) return 'Toddler bed, then full bed';
  if (toddler) return 'Toddler bed';
  return null;
}

function finishesFor(rows: InventoryItem[]): ShopItem['finishes'] {
  const first = rows[0];
  if (!first) return [];
  // A finish-variant product has one row per finish; the others list stains on one row.
  const raw =
    first.variantType === 'finish'
      ? rows.flatMap(r => {
          const stain = r.stains.find(st => st.inStock && st.image);
          return stain?.image ? [{ name: r.wood, image: stain.image, wood: r.wood, stainName: stain.name }] : [];
        })
      : first.stains.flatMap(st =>
          st.inStock && st.image ? [{ name: st.name, image: st.image, wood: first.wood, stainName: st.name }] : [],
        );
  return raw.map(f => ({ ...f, tone: toneOf(f.name) }));
}

function pricesFor(rows: InventoryItem[]): number[] {
  return rows.flatMap(r =>
    r.stains.filter(st => st.inStock).map(st => (Number(r.basePrice) || 0) + (Number(st.priceAddition) || 0)),
  );
}

export function toShopItems(products: ProductIndexItem[]): ShopItem[] {
  const inventory = getInventory();
  return products.map(p => {
    const rows = inventory.filter(i => i.slug === p.slug);
    // The builder tag under each card: SKU prefix -> src/lib/builders.ts.
    const builder = builderByCode(skuBuilderCode(rows.find(r => r.sku)?.sku));
    return {
      slug: p.slug,
      productName: p.productName,
      category: p.category,
      minPrice: p.minPrice,
      defaultImage: p.defaultImage,
      priceVaries: new Set(pricesFor(rows)).size > 1,
      builder: builder ? { name: builder.tag, href: builder.href } : null,
      leadTime: builder?.leadTime ?? null,
      converts: convertsFor(p.category, rows),
      dimensions: rows.find(r => r.dimensions)?.dimensions ?? null,
      finishes: finishesFor(rows),
    };
  });
}
