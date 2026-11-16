'use client';

import type MiniSearch from 'minisearch';
import { useEffect, useMemo, useState } from 'react';
import builderRecords from '@/data/builders.json';
import { createSearchEngine, type SearchDoc, type SearchEngine } from './search-engine';
import type { SearchOutcome, SuggestedTag, QueryTag, CatalogProduct } from './search-intent';
import { toneOf } from './finish-tones';
import { useDelistedProducts } from './useDelistedProducts';
import { isUnlistedCategory } from './taxonomy';

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

const MAX_RESULTS = 8;

/**
 * The search corpus is a build-time artifact (src/data/search-docs.json, ~18 KB
 * gzipped) loaded via dynamic import, so:
 *   - it contributes zero bytes to the initial bundle,
 *   - it becomes a content-hashed chunk, so caching is immutable and a deploy
 *     can never serve a stale index,
 *   - both search surfaces share one promise, so it downloads at most once.
 */
let enginePromise: Promise<SearchEngine> | null = null;

export function loadSearchEngine(): Promise<SearchEngine> {
  enginePromise ??= import('@/data/search-docs.json').then(mod =>
    createSearchEngine(mod.default as unknown as SearchDoc[], builderRecords as { id: string; name: string }[]),
  );
  return enginePromise;
}

export function loadSearchIndex(): Promise<MiniSearch<SearchDoc>> {
  return loadSearchEngine().then(e => e.index);
}

const WHOLE_STAINS = [
  'Antique Slate', 'Asbury Brown', 'Michaels Cherry', 'Almond', 'Carbon', 'Driftwood', 'Earthtone', 'Ebony', 'Frost',
  'Fruitwood', 'Harvest', 'Manchester', 'Mx', 'Natural', 'Provincial', 'Sandstone', 'Seely', 'Smoke', 'Washington',
];

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
  const q = words.join(' ');
  // Stain names can be two words ("Michaels Cherry"), so the query must match a
  // whole known name rather than one word of the joined list.
  return WHOLE_STAINS.find(stain => stainNames.includes(stain) && stain.toLowerCase().includes(q));
}

function toResults(
  ms: MiniSearch<SearchDoc>,
  query: string,
  limit = MAX_RESULTS,
  only?: ReadonlySet<string>
): SearchResult[] {
  /*
   * Unlisted categories never reach a result row.
   *
   * The conversion kits and the crib mattress are sold through a crib's bundle
   * builder, not browsed or searched for - see src/lib/taxonomy.ts. Filtered
   * here rather than left out of search-docs.json so the decision lives in one
   * place with the nav and the grids, and flipping it is one edit.
   */
  const raw = ms
    .search(query, { prefix: true, fuzzy: 0.2 })
    .filter(hit => !isUnlistedCategory((hit as unknown as SearchDoc).category))
    .filter(hit => !only || only.has((hit as unknown as SearchDoc).slug ?? ''));

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
export function useSearch(query: string, only?: ReadonlySet<string>): SearchResult[] {
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
    return toResults(index, trimmed, MAX_RESULTS, only).filter(r => !isDelisted(r.slug));
  }, [index, trimmed, isDelisted, only]);
}

export interface CatalogSearch {
  loading: boolean;
  tags: QueryTag[];
  relaxed: QueryTag[];
  unknown: string[];
  refused: string[];
  results: SearchResult[];
  total: number;
  suggestions: SuggestedTag[];
}

const EMPTY_SEARCH: CatalogSearch = { loading: false, tags: [], relaxed: [], unknown: [], refused: [], results: [], total: 0, suggestions: [] };

/** A catalogue row as a result row: a named stain or tone picks the photo shown. */
function toResultRow(product: CatalogProduct, outcome: SearchOutcome): SearchResult {
  const stainTag = outcome.tags.find(t => t.kind === 'stain');
  const toneTag = outcome.tags.find(t => t.kind === 'tone');
  const available = product.stains.filter(s => s.available && s.image);
  const stain =
    (stainTag && available.find(s => s.name === stainTag.value)) ||
    (toneTag && available.find(s => toneOf(s.name) === toneTag.value)) ||
    available[0] ||
    product.stains.find(s => s.image);
  const matched = stainTag && stain?.name === stainTag.value ? stain.name : undefined;
  return {
    id: product.name,
    productName: product.name,
    slug: product.slug,
    wood: stain?.wood ?? '',
    category: product.category,
    basePrice: product.price,
    image: stain?.image ?? '',
    matchedStain: matched,
    matchedStainUnavailable: false,
    variantCount: product.stains.length,
  };
}

/**
 * The header search: tags understood from the sentence, live counts, suggested
 * tags and results, all from the one lazily loaded index. `enabled` starts the
 * load on focus, so the starter tags have real counts before a key is pressed.
 */
export function useCatalogSearch(query: string, { enabled, limit }: { enabled: boolean; limit?: number }): CatalogSearch {
  const [engine, setEngine] = useState<SearchEngine | null>(null);
  const trimmed = query.trim();
  const { isDelisted } = useDelistedProducts();

  useEffect(() => {
    if (!enabled || engine) return;
    let cancelled = false;
    loadSearchEngine().then(
      e => {
        if (!cancelled) setEngine(e);
      },
      err => {
        if (!cancelled) console.error('Failed to load search index:', err);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [enabled, engine]);

  return useMemo(() => {
    if (!enabled) return EMPTY_SEARCH;
    if (!engine) return { ...EMPTY_SEARCH, loading: true };
    if (!trimmed) return { ...EMPTY_SEARCH, suggestions: engine.starters(isDelisted) };
    const outcome = engine.search(trimmed, { limit, exclude: isDelisted });
    return {
      loading: false,
      tags: outcome.tags,
      relaxed: outcome.relaxed,
      unknown: outcome.unknown,
      refused: outcome.refused,
      results: outcome.products.map(p => toResultRow(p, outcome)),
      total: outcome.total,
      suggestions: outcome.suggestions,
    };
  }, [enabled, engine, trimmed, limit, isDelisted]);
}
