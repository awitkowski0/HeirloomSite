import { BED_STAGES } from '@/lib/uses';
import { registryTitle } from '@/lib/babylist';
import { toneOf, type Tone } from '@/lib/finish-tones';
import { variantLabel } from '@/lib/labels';
import { variantHref } from '@/lib/variants';
import type { InventoryItem } from '@/types';
import { builderForProduct, featuresFor, safetyAnswerFor } from '@/lib/builders';
import { getInventory, type ProductIndexItem } from '@/lib/content';
import { CRIB_STYLES, type CribStyleId } from '@/lib/crib-styles';

/*
 * One flat, serialisable row per product for the shop browser, built on the
 * server at prerender so the client filters data it already has.
 */
export interface ShopItem {
  slug: string;
  name: string;
  category: string | null;
  price: number;
  image: string | null;
  builderId: string | null;
  builder: string | null;
  state: string | null;
  builderHref: string | null;
  leadTime: string | null;
  leadWeeksMax: number | null;
  top: 'Arched' | 'Flat' | null;
  front: 'Slatted' | 'Panel' | null;
  style: CribStyleId | null;
  finishes: number;
  dimensions: string | null;
  safetyFeatures: string[];
  buildFeatures: string[];
  safetyOnFile: boolean;
  uses: string[];
  usesNote: string | null;
  converts: string | null;
  buildStatement: { text: string; source: string } | null;
  safetyStatement: { text: string; source: string } | null;
  finishImages: { name: string; image: string; tone: Tone | null }[];
  /** The lowest-priced configuration, so a registry item names one real thing. */
  registry: { title: string; image: string; href: string; price: number } | null;
}

function finishImagesFor(rows: InventoryItem[]): ShopItem['finishImages'] {
  const finishes =
    rows[0]?.variantType === 'finish'
      ? rows.flatMap(r => {
          const stain = r.stains.find(s => s.inStock && s.image);
          return stain?.image ? [{ name: r.wood, image: stain.image }] : [];
        })
      : (rows[0]?.stains ?? []).flatMap(s => (s.inStock && s.image ? [{ name: s.name, image: s.image }] : []));
  return finishes.map(f => ({ ...f, tone: toneOf(f.name) }));
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

function usesNoteFor(p: ProductIndexItem): string | null {
  if (p.usesCredit) return p.usesCredit;
  return (p.uses ?? []).some(tag => BED_STAGES.includes(tag)) ? 'Conversion kits sold separately.' : null;
}

function registryFor(name: string, slug: string, rows: InventoryItem[]): ShopItem['registry'] {
  let best: ShopItem['registry'] = null;
  for (const row of rows) {
    for (const stain of row.stains) {
      if (!stain.inStock || !stain.image) continue;
      const price = Number(row.basePrice) + (Number(stain.priceAddition) || 0);
      if (!best || price < best.price) {
        best = {
          title: registryTitle(name, variantLabel(row.wood, stain.name) || null),
          image: stain.image,
          href: variantLabel(row.wood, stain.name) ? variantHref(slug, row.wood, stain.name) : `/product/${slug}`,
          price,
        };
      }
    }
  }
  return best;
}

export function toShopItems(products: ProductIndexItem[]): ShopItem[] {
  const inventory = getInventory();
  return products.map(p => {
    const rows = inventory.filter(i => i.slug === p.slug);
    const builder = builderForProduct(p);
    const features = builder ? featuresFor(builder, p.category) : { safety: [], build: [] };
    const style = CRIB_STYLES.find(s => s.id === p.style);
    const safety = builder ? safetyAnswerFor(builder, p.category) : null;
    const safetyQuote = safety?.kind === 'statement' ? { text: safety.quote.text, source: safety.quote.source } : null;
    return {
      slug: p.slug,
      name: p.productName,
      category: p.category,
      price: p.minPrice,
      image: p.defaultImage,
      builderId: builder?.id ?? null,
      builder: builder?.name ?? null,
      state: builder ? builder.based.split(', ')[1] : null,
      builderHref: builder?.href ?? null,
      leadTime: builder?.leadTime ?? null,
      leadWeeksMax: builder?.leadWeeksMax ?? null,
      top: style?.top ?? null,
      front: style?.front ?? null,
      style: style?.id ?? null,
      // A finish-variant product has one row per finish; a wood-variant one lists stains on the row.
      finishes: Math.max(rows[0]?.variantType === 'finish' ? rows.length : 0, ...rows.map(r => r.stains?.length ?? 0)),
      dimensions: rows.find(r => r.dimensions)?.dimensions ?? null,
      safetyFeatures: features.safety,
      buildFeatures: features.build,
      safetyOnFile: builder ? safetyAnswerFor(builder, p.category).kind === 'statement' : false,
      uses: p.uses ?? [],
      usesNote: usesNoteFor(p),
      converts: convertsFor(p.category, rows),
      buildStatement: builder?.construction ? { text: builder.construction.text, source: builder.construction.source } : null,
      safetyStatement: safetyQuote,
      finishImages: finishImagesFor(rows),
      registry: registryFor(p.productName, p.slug, rows),
    };
  });
}
