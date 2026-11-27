import { getInventory, type ProductIndexItem } from '@/lib/content';
import { toneOf, type Tone } from '@/lib/finish-tones';
import { skuBuilderCode, type BuilderCode } from '@/lib/seo';
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
  /** True when finishes cost different amounts, so the price still shows the lowest figure after "Starting at". */
  priceVaries: boolean;
  builder: { name: string; href: string } | null;
  /** Every buyable finish, with its photo and measured tone. */
  finishes: { name: string; image: string; tone: Tone | null; wood: string; stainName: string }[];
}

/*
 * The builder tag under each card. Keyed by SKU prefix, the same key the
 * merchant feed's g:brand reads (BUILDERS in src/lib/seo.ts); the label here
 * is the shop-facing one ("Fisher's", as the builder page calls itself), not
 * the feed brand.
 */
const BUILDER_TAGS: Readonly<Record<BuilderCode, { name: string; href: string }>> = {
  OTO: { name: 'Old Town Oak', href: '/builders/old-town-oak' },
  FQP: { name: "Fisher's", href: '/builders/fishers-quality-products' },
  KC: { name: 'Kids Comfort', href: '/builders/kids-comfort' },
};

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
    const code = skuBuilderCode(rows.find(r => r.sku)?.sku);
    return {
      slug: p.slug,
      productName: p.productName,
      category: p.category,
      minPrice: p.minPrice,
      defaultImage: p.defaultImage,
      priceVaries: new Set(pricesFor(rows)).size > 1,
      builder: code ? BUILDER_TAGS[code] : null,
      finishes: finishesFor(rows),
    };
  });
}
