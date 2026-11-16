import 'server-only';
import { builderByCode, type Builder } from '@/lib/builders';
import { collectionToSlug } from '@/lib/collections';
import { getBrowsableProducts, getInventory, type ProductIndexItem } from '@/lib/content';
import { skuBuilderCode } from '@/lib/seo';

/*
 * What a builder's store sells, grouped the way its store menu reads.
 *
 * Everything comes from the catalogue: a new product gets its place in a store
 * with no code. A piece goes in its collection when it has one, otherwise in
 * its piece type, so Old Town Oak reads as Addison, French Country and so on,
 * and Fisher's, which has no collections, as Cribs, Changing tables,
 * Nightstands.
 *
 * Browsable products only, the same set /products lists: the conversion kits
 * and the crib mattress are sold through a crib's bundle, not a store shelf.
 * Prices are the catalogue's own `minPrice`; nothing here computes a price.
 */

const TYPE_ORDER = ['Cribs', 'Mini Cribs', 'Dressers', 'Chests', 'Changing Tables', 'Nightstands'];
const typeRank = (category: string | null) => {
  const i = TYPE_ORDER.indexOf(category ?? '');
  return i === -1 ? TYPE_ORDER.length : i;
};

/* A section's cover photo: case goods first, since a crib's styling is a crib's bedding. */
const PHOTO_PREFERENCE = ['Dressers', 'Chests', 'Changing Tables', 'Nightstands', 'Cribs', 'Mini Cribs'];
const photoPreference = (category: string | null) => {
  const i = PHOTO_PREFERENCE.indexOf(category ?? '');
  return i === -1 ? PHOTO_PREFERENCE.length : i;
};

export interface StoreSection {
  slug: string;
  name: string;
  kind: 'collection' | 'type';
  count: number;
  /** Lowest catalogue price in the section, in dollars. */
  fromPrice: number;
  image: string | null;
  products: ProductIndexItem[];
}

/** "Changing Tables" reads as "Changing tables" in a store menu. */
const typeLabel = (category: string) => category.charAt(0) + category.slice(1).toLowerCase();

/** The builder of a product, from the SKU prefix on any of its rows. */
export function builderForSlug(slug: string): Builder | null {
  const sku = getInventory().find(i => i.slug === slug && i.sku)?.sku;
  return builderByCode(skuBuilderCode(sku));
}

export function storeProducts(builder: Builder): ProductIndexItem[] {
  return getBrowsableProducts()
    .filter(p => builderForSlug(p.slug)?.id === builder.id)
    .sort((a, b) => typeRank(a.category) - typeRank(b.category));
}

export function storeSections(builder: Builder): StoreSection[] {
  const groups = new Map<string, { slug: string; name: string; kind: StoreSection['kind']; products: ProductIndexItem[] }>();
  for (const product of storeProducts(builder)) {
    const collection = product.collection?.trim() || null;
    const name = collection ?? typeLabel(product.category ?? 'Other');
    const slug = collectionToSlug(name);
    const group = groups.get(slug) ?? { slug, name, kind: collection ? 'collection' : 'type', products: [] };
    group.products.push(product);
    groups.set(slug, group);
  }
  const kindRank = (s: { kind: StoreSection['kind'] }) => (s.kind === 'collection' ? 0 : 1);
  return [...groups.values()]
    .sort(
      (a, b) =>
        kindRank(a) - kindRank(b) ||
        (a.kind === 'collection'
          ? a.name.localeCompare(b.name)
          : typeRank(a.products[0].category) - typeRank(b.products[0].category)),
    )
    .map(group => ({
      ...group,
      count: group.products.length,
      fromPrice: Math.min(...group.products.map(p => p.minPrice)),
      image:
        [...group.products]
          .filter(p => p.defaultImage)
          .sort((a, b) => photoPreference(a.category) - photoPreference(b.category))[0]?.defaultImage ?? null,
    }));
}

export function storeSection(builder: Builder, slug: string): StoreSection | null {
  return storeSections(builder).find(s => s.slug === slug) ?? null;
}
