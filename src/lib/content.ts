import 'server-only';
import { cache } from 'react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { InventoryItem, ImageRecord, ShowroomData } from '@/types';
import { type CategorySummary } from './categories';
import {
  TAXONOMY,
  isUnlistedCategory,
  knownCategories,
  sourcesFor,
  type TaxonomyNode,
} from './taxonomy';

/**
 * Server-side content accessors. These replace the old client-side
 * ContentProvider, which fetched five JSON files on mount and left every page
 * showing a spinner until they resolved -- which is exactly what Googlebot saw.
 *
 * Every page that consumes these is statically prerendered, so these reads only
 * ever happen during `next build`, where process.cwd() is the project root.
 * There is no runtime filesystem dependency for pages.
 *
 * `import 'server-only'` turns an accidental import from a client component
 * into a build error rather than a 525 KB bundle regression.
 *
 * readFileSync rather than a static `import`: a static import would inline the
 * full 525 KB inventory into whichever bundle references it. (Type-checking it
 * is not the problem -- measured at 0.4s -- but bundle inclusion is.)
 */

export interface ProductIndexItem {
  productName: string;
  slug: string;
  category: string | null;
  /** The range this piece belongs to (Addison, West Lake...), or null. */
  collection: string | null;
  minPrice: number;
  defaultImage: string | null;
}

function readData<T>(name: string): T {
  const path = join(process.cwd(), 'public', 'data', `${name}.json`);
  try {
    return JSON.parse(readFileSync(path, 'utf-8')) as T;
  } catch (err) {
    // Do not degrade to an empty list. An empty inventory would build a site
    // where every product page 404s; failing the build is the correct outcome.
    throw new Error(
      `Failed to read required data file ${path}. Run \`npm run data:build\` first.`,
      { cause: err }
    );
  }
}

export const getInventory = cache((): InventoryItem[] => readData<InventoryItem[]>('inventory'));
export const getProductIndex = cache((): ProductIndexItem[] => readData<ProductIndexItem[]>('products'));
export const getImages = cache((): ImageRecord[] => readData<ImageRecord[]>('images'));
export const getShowroom = cache((): ShowroomData => readData<ShowroomData>('showroom'));

export interface ProductDetail {
  productName: string;
  slug: string;
  configurations: InventoryItem[];
}

export const getProductBySlug = cache((slug: string): ProductDetail | null => {
  const configurations = getInventory().filter(i => i.slug === slug);
  if (configurations.length === 0) return null;
  return { productName: configurations[0].productName, slug, configurations };
});

export const getAllProductSlugs = cache((): string[] =>
  getProductIndex()
    .map(p => p.slug)
    .filter((s): s is string => Boolean(s))
);

/**
 * Products that may appear in a grid, a category or the nav.
 *
 * getProductIndex() stays the COMPLETE set on purpose: product routes,
 * pricing.json and the bundle builder all read from it, and an unlisted rail
 * kit still has a page, still has a price and is still what a crib bundle adds
 * to the cart. Only browsing is narrowed. See src/lib/taxonomy.ts.
 */
export const getBrowsableProducts = cache((): ProductIndexItem[] =>
  getProductIndex().filter(p => !isUnlistedCategory(p.category))
);

/**
 * A taxonomy node with its live product count, children first.
 *
 * `count` includes everything beneath the node, so a parent reports the whole
 * branch rather than only the products mapped directly to it.
 */
export interface TaxonomyEntry extends Omit<TaxonomyNode, 'children'> {
  count: number;
  children?: TaxonomyEntry[];
}

const countsByCategory = cache((): Map<string, number> => {
  const counts = new Map<string, number>();
  for (const p of getBrowsableProducts()) {
    if (p.category) counts.set(p.category, (counts.get(p.category) ?? 0) + 1);
  }
  return counts;
});

/**
 * The nav tree, with empty branches pruned.
 *
 * A declared category the shop has not stocked yet - Clothing, Bath, Toys - is
 * dropped here rather than rendered as an empty page. It reappears on its own
 * the moment a product declares that category, with no change to
 * src/lib/taxonomy.ts. A parent survives only if something under it did.
 */
export const getTaxonomy = cache((): TaxonomyEntry[] => {
  const counts = countsByCategory();

  const build = (node: TaxonomyNode): TaxonomyEntry | null => {
    const children = (node.children ?? [])
      .map(build)
      .filter((c): c is TaxonomyEntry => c !== null);
    const count = sourcesFor(node).reduce((sum, src) => sum + (counts.get(src) ?? 0), 0);
    if (count === 0) return null;
    // `children` is stripped before the spread: the declared node carries a
    // readonly TaxonomyNode[], and what we hand back is the pruned, counted
    // TaxonomyEntry[] built above.
    const { children: _declared, ...rest } = node;
    void _declared;
    return children.length > 0 ? { ...rest, count, children } : { ...rest, count };
  };

  return TAXONOMY.map(build).filter((n): n is TaxonomyEntry => n !== null);
});

/** Flat list of every live node, for routes and the sitemap. */
export const getTaxonomyNodes = cache((): TaxonomyEntry[] => {
  const walk = (nodes: TaxonomyEntry[]): TaxonomyEntry[] =>
    nodes.flatMap(n => [n, ...walk(n.children ?? [])]);
  return walk(getTaxonomy());
});

export const getTaxonomyNodeBySlug = cache(
  (slug: string): TaxonomyEntry | null => getTaxonomyNodes().find(n => n.slug === slug) ?? null
);

/** Everything under a node, including its children's products. */
export const getProductsForNode = cache((slug: string): ProductIndexItem[] => {
  const node = getTaxonomyNodeBySlug(slug);
  if (!node) return [];
  const sources = new Set(sourcesFor(node));
  return getBrowsableProducts().filter(p => p.category && sources.has(p.category));
});

/**
 * Top-level nodes only, for the pill row and the header bar.
 *
 * Still a CategorySummary so the existing pill markup keeps working; the tree
 * itself is what the header bar consumes.
 */
export const getCategories = cache((): CategorySummary[] =>
  getTaxonomy().map(n => ({ name: n.name, slug: n.slug, count: n.count }))
);

export const getCategoryBySlug = cache(
  (slug: string): CategorySummary | null => {
    const node = getTaxonomyNodeBySlug(slug);
    return node ? { name: node.name, slug: node.slug, count: node.count } : null;
  }
);

/**
 * Every product whose category has no home in the tree.
 *
 * Called at build time by the pages below. A product in a category that is
 * neither mapped nor deliberately unlisted is one nobody can browse to, and it
 * would otherwise just quietly vanish from the site - the same class of silent
 * data failure build-data.mjs already refuses to ship.
 */
export const getOrphanedProducts = cache((): ProductIndexItem[] => {
  const known = knownCategories();
  return getProductIndex().filter(p => p.category && !known.has(p.category));
});

export function assertNoOrphanedCategories(): void {
  const orphans = getOrphanedProducts();
  if (orphans.length === 0) return;
  const categories = [...new Set(orphans.map(p => p.category))].sort();
  throw new Error(
    `Refusing to build: ${orphans.length} product(s) are in categories that no ` +
      `taxonomy node claims and that are not marked unlisted: ${categories.join(', ')}. ` +
      'Add a node in src/lib/taxonomy.ts (or list the category in UNLISTED_CATEGORIES).'
  );
}

/** Images for a product, grouped so the gallery can show one strip per stain. */
export const getProductImages = cache((productName: string): ImageRecord[] =>
  getImages().filter(i => i.productName === productName)
);
