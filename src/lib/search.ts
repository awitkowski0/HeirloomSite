'use client';

import MiniSearch from 'minisearch';
import { useEffect, useMemo, useState } from 'react';

export interface SearchResult {
  id: string;
  productName: string;
  slug: string;
  wood: string;
  category: string;
  basePrice: number;
  image: string;
  matchedStain?: string;
}

interface SearchDoc {
  id: string;
  productName: string;
  slug: string | null;
  wood: string;
  category: string;
  stainNames: string;
  description: string;
  basePrice: number;
  stainImages: Record<string, string>;
}

const MAX_RESULTS = 8;

function createIndex() {
  return new MiniSearch<SearchDoc>({
    fields: ['productName', 'wood', 'category', 'stainNames', 'description'],
    storeFields: ['productName', 'slug', 'wood', 'category', 'basePrice', 'stainImages', 'stainNames'],
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

function toResults(ms: MiniSearch<SearchDoc>, query: string): SearchResult[] {
  const raw = ms.search(query, { prefix: true, fuzzy: 0.2 });
  const results: SearchResult[] = [];
  const seen = new Set<string>();

  for (const hit of raw) {
    const doc = hit as unknown as SearchDoc;
    const key = `${doc.productName}||${doc.wood}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const matchedStain = findMatchedStain(doc.stainNames, query);
    const stainImages = doc.stainImages || {};
    const fallbackKey = Object.keys(stainImages)[0] || '';
    const image = (matchedStain && stainImages[matchedStain]) || stainImages[fallbackKey] || '';

    results.push({
      id: doc.id,
      productName: doc.productName,
      slug: doc.slug || '',
      wood: doc.wood,
      category: doc.category,
      basePrice: doc.basePrice,
      image,
      matchedStain,
    });

    if (results.length >= MAX_RESULTS) break;
  }
  return results;
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

  return useMemo(() => {
    if (!index || !trimmed) return [];
    return toResults(index, trimmed);
  }, [index, trimmed]);
}

/** Full result list (no MAX_RESULTS cap) for the dedicated /search page. */
export function useSearchAll(query: string): { results: SearchResult[]; loading: boolean } {
  const [index, setIndex] = useState<MiniSearch<SearchDoc> | null>(null);
  const trimmed = query.trim();

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

  const results = useMemo(() => {
    if (!index || !trimmed) return [];
    const raw = index.search(trimmed, { prefix: true, fuzzy: 0.2 });
    const seen = new Set<string>();
    const out: SearchResult[] = [];
    for (const hit of raw) {
      const doc = hit as unknown as SearchDoc;
      // The dedicated search page lists products, not wood variants.
      if (!doc.slug || seen.has(doc.slug)) continue;
      seen.add(doc.slug);
      const stainImages = doc.stainImages || {};
      const matchedStain = findMatchedStain(doc.stainNames, trimmed);
      const fallbackKey = Object.keys(stainImages)[0] || '';
      out.push({
        id: doc.id,
        productName: doc.productName,
        slug: doc.slug,
        wood: doc.wood,
        category: doc.category,
        basePrice: doc.basePrice,
        image: (matchedStain && stainImages[matchedStain]) || stainImages[fallbackKey] || '',
        matchedStain,
      });
    }
    return out;
  }, [index, trimmed]);

  return { results, loading: !index && Boolean(trimmed) };
}
