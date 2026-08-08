import 'server-only';
import { cache } from 'react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { InventoryItem, ImageRecord, ShowroomData } from '@/types';
import { categoryToSlug, type CategorySummary } from './categories';

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
      `Failed to read required data file ${path}. Run \`npm run data:build\` first. ` +
        `Cause: ${(err as Error).message}`
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

export const getCategories = cache((): CategorySummary[] => {
  const counts = new Map<string, number>();
  for (const p of getProductIndex()) {
    if (p.category) counts.set(p.category, (counts.get(p.category) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, slug: categoryToSlug(name), count }))
    .sort((a, b) => a.name.localeCompare(b.name));
});

export const getCategoryBySlug = cache(
  (slug: string): CategorySummary | null => getCategories().find(c => c.slug === slug) ?? null
);

export const getProductsInCategory = cache((categoryName: string): ProductIndexItem[] =>
  getProductIndex().filter(p => p.category === categoryName)
);

/** Images for a product, grouped so the gallery can show one strip per stain. */
export const getProductImages = cache((productName: string): ImageRecord[] =>
  getImages().filter(i => i.productName === productName)
);
