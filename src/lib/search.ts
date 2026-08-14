'use client';

import MiniSearch from 'minisearch';
import { useEffect, useMemo, useState } from 'react';
import { useDelistedProducts } from './useDelistedProducts';

export interface SearchResult {
  id: string;
  productName: string;
  slug: string;
  wood: string;
  category: string;
  /** Lowest base price across the product's matching variants. */
  basePrice: number;
  image: string;
  matchedStain?: string;
  /** True when the finish the query matched is currently withdrawn. */
  matchedStainUnavailable?: boolean;
  /** How many variants of this product matched, for a "6 finishes" hint. */
  variantCount: number;
}

interface SearchDoc {
  id: string;
  productName: string;
  slug: string | null;
  wood: string;
  category: string;
  stainNames: string;
  unavailableStains: string[];
  description: string;
  basePrice: number;
  stainImages: Record<string, string>;
}

const MAX_RESULTS = 8;

function createIndex() {
  return new MiniSearch<SearchDoc>({
    fields: ['productName', 'wood', 'category', 'stainNames', 'description'],
    storeFields: [
      'productName',
      'slug',
      'wood',
      'category',
      'basePrice',
      'stainImages',
      'stainNames',
      'unavailableStains',
    ],
    searchOptions: {
      boost: { productName: 3, wood: 2, stainNames: 2, category: 2, description: 1 },
      prefix: true,
      fuzzy: 0.2,
    },
  });
}

/**
 * The search corpus is a build-time artifact (src/data/search-docs.json, ~18 KB
 * gzipped) loaded via dynamic import, so:
 *   - it contributes zero bytes to the initial bundle,
 *   - it becomes a content-hashed chunk, so caching is immutable and a deploy
 *     can never serve a stale index,
 *   - both search surfaces share one promise, so it downloads at most once.
 */
let indexPromise: Promise<MiniSearch<SearchDoc>> | null = null;

export function loadSearchIndex(): Promise<MiniSearch<SearchDoc>> {
  indexPromise ??= import('@/data/search-docs.json').then(mod => {
    const ms = createIndex();
    ms.addAll(mod.default as unknown as SearchDoc[]);
    return ms;
  });
  return indexPromise;
}

/**
 * Resolve which stain the query referred to, so the result row can show that
 * stain's photo.
 *
 * The previous implementation returned the matching *query word* rather than
 * the stain name, then looked that up in stainImages -- so a query for "ebony"
 * produced the key "ebony" while the map is keyed "Ebony", and the image
 * silently fell back to the first stain. This returns the real stain name.
 */
function findMatchedStain(stainNames: string, query: string): string | undefined {
  if (!stainNames) return undefined;
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return undefined;
  const stains = stainNames.split(' ').filter(Boolean);
  return stains.find(stain => {
    const s = stain.toLowerCase();
    return words.some(w => s.includes(w) || w.includes(s));
  });
}

function toResults(
  ms: MiniSearch<SearchDoc>,
  query: string,
  limit = MAX_RESULTS
): SearchResult[] {
  const raw = ms.search(query, { prefix: true, fuzzy: 0.2 });

  /*
   * One row per PRODUCT, not per variant.
   *
   * The key used to be `productName||wood`, so searching "hudson" returned
   * eight rows for two actual products: Hudson in three woods and Hudson Style
   * in five finishes, every row carrying the same name and the same price. The
   * list looked broken and pushed the second real product off the end of an
   * eight-row cap.
   *
   * Hits arrive in descending relevance, so the first hit for a name is the
   * best representative; the rest only contribute a variant count and the
   * lowest price.
   */
  const byProduct = new Map<string, SearchResult>();

  for (const hit of raw) {
    const doc = hit as unknown as SearchDoc;
    const existing = byProduct.get(doc.productName);

    if (existing) {
      existing.variantCount += 1;
      if (doc.basePrice < existing.basePrice) existing.basePrice = doc.basePrice;
      // A later variant may be the one that actually matched the stain term.
      if (!existing.matchedStain) {
        existing.matchedStain = findMatchedStain(doc.stainNames, query);
        existing.matchedStainUnavailable =
          !!existing.matchedStain && (doc.unavailableStains || []).includes(existing.matchedStain);
      }
      continue;
    }

    if (byProduct.size >= limit) continue;

    const matchedStain = findMatchedStain(doc.stainNames, query);
    const stainImages = doc.stainImages || {};
    const fallbackKey = Object.keys(stainImages)[0] || '';
    const image = (matchedStain && stainImages[matchedStain]) || stainImages[fallbackKey] || '';

    byProduct.set(doc.productName, {
      id: doc.id,
      productName: doc.productName,
      slug: doc.slug || '',
      wood: doc.wood,
      category: doc.category,
      basePrice: doc.basePrice,
      image,
      matchedStain,
      matchedStainUnavailable:
        !!matchedStain && (doc.unavailableStains || []).includes(matchedStain),
      variantCount: 1,
    });
  }

  return [...byProduct.values()];
}

/**
 * Previously this hook ran the full MiniSearch query plus a per-hit
 * lowercase/split on *every parent render*, not just when the query changed.
 * Index construction now happens once in an effect and the query result is
 * memoised.
 */
export function useSearch(query: string): SearchResult[] {
  const [index, setIndex] = useState<MiniSearch<SearchDoc> | null>(null);
  const trimmed = query.trim();
  const { isDelisted } = useDelistedProducts();

  useEffect(() => {
    if (!trimmed || index) return;
    let cancelled = false;
    loadSearchIndex().then(
      ms => {
        if (!cancelled) setIndex(ms);
      },
      err => {
        if (!cancelled) console.error('Failed to load search index:', err);
      }
    );
    return () => {
      cancelled = true;
    };
  }, [trimmed, index]);

  // Filtered in both search hooks rather than at each render site: the
  // dropdown and the /search page are the two consumers, and a de-listed
  // product surfacing in either would be the most direct route to it.
  return useMemo(() => {
    if (!index || !trimmed) return [];
    return toResults(index, trimmed).filter(r => !isDelisted(r.slug));
  }, [index, trimmed, isDelisted]);
}

/** Full result list (no MAX_RESULTS cap) for the dedicated /search page. */
export function useSearchAll(query: string): { results: SearchResult[]; loading: boolean } {
  const [index, setIndex] = useState<MiniSearch<SearchDoc> | null>(null);
  const trimmed = query.trim();
  const { isDelisted } = useDelistedProducts();

  useEffect(() => {
    let cancelled = false;
    loadSearchIndex().then(
      ms => {
        if (!cancelled) setIndex(ms);
      },
      err => {
        if (!cancelled) console.error('Failed to load search index:', err);
      }
    );
    return () => {
      cancelled = true;
    };
  }, []);

  // Same grouping as the dropdown, uncapped. This used to be a third,
  // hand-rolled copy of the result-building logic that deduplicated by slug
  // instead of product name and produced a different shape.
  const results = useMemo(
    () =>
      index && trimmed
        ? toResults(index, trimmed, Number.MAX_SAFE_INTEGER).filter(r => !isDelisted(r.slug))
        : [],
    [index, trimmed, isDelisted]
  );

  return { results, loading: !index && Boolean(trimmed) };
}
