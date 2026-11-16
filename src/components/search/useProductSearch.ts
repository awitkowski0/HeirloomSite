'use client';

import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCatalogSearch, type SearchResult } from '@/lib/search';
import { addTagToQuery, removeTagFromQuery, type QueryTag, type SuggestedTag } from '@/lib/search-intent';
import { variantHref } from '@/lib/variants';
import { productSelected, searchSubmitted } from '@/lib/analytics';

const RESULT_ROWS = 6;

export type SearchOption = { kind: 'tag'; suggestion: SuggestedTag } | { kind: 'result'; result: SearchResult };

/**
 * All search behaviour, shared by the header field and the phone panel: one hook,
 * one index, one behaviour. Analytics lives here too, so the two surfaces cannot
 * drift apart. `surface` is the only thing that differs between them.
 *
 * Arrow keys walk the suggested tags and then the results as one list. Focus
 * stays in the input and the active row is pointed at with aria-activedescendant.
 */
export function useProductSearch(surface: 'desktop' | 'mobile', onNavigate?: () => void) {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState<{ q: string; i: number }>({ q: '', i: -1 });
  const [started, setStarted] = useState(false);
  const router = useRouter();
  const search = useCatalogSearch(query, { enabled: started, limit: RESULT_ROWS });

  const options = useMemo<SearchOption[]>(
    () => [
      ...search.suggestions.map(suggestion => ({ kind: 'tag' as const, suggestion })),
      ...search.results.map(result => ({ kind: 'result' as const, result })),
    ],
    [search.suggestions, search.results],
  );
  const activeIndex = active.q === query ? active.i : -1;
  const setActiveIndex = useCallback((i: number) => setActive({ q: query, i }), [query]);

  const selectResult = useCallback(
    (result: SearchResult) => {
      productSelected({
        product_name: result.productName,
        product_category: result.category,
        source: surface === 'mobile' ? 'mobile_search_result' : 'desktop_search_result',
      });
      setQuery('');
      onNavigate?.();
      router.push(result.matchedStain ? variantHref(result.slug, result.wood, result.matchedStain) : `/product/${result.slug}`);
    },
    [router, onNavigate, surface],
  );

  const addTag = useCallback((tag: QueryTag) => setQuery(q => addTagToQuery(q, tag)), []);
  const removeTag = useCallback((tag: QueryTag) => setQuery(q => removeTagFromQuery(q, tag)), []);

  const submitQuery = useCallback(() => {
    const trimmed = query.trim();
    if (!trimmed) return;
    searchSubmitted({ result_count: search.total, search_surface: surface });
    setQuery('');
    onNavigate?.();
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  }, [query, router, onNavigate, search.total, surface]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>): 'close' | undefined => {
      if (e.key === 'Escape') {
        // Otherwise a search input clears itself and fires onChange.
        e.preventDefault();
        return 'close';
      }
      if (options.length === 0) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((activeIndex + 1) % options.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex(activeIndex <= 0 ? options.length - 1 : activeIndex - 1);
      } else if (e.key === 'Enter' && activeIndex >= 0) {
        // Only intercept Enter on a highlighted row; otherwise the form submits.
        e.preventDefault();
        const option = options[activeIndex];
        if (option.kind === 'tag') {
          addTag(option.suggestion.tag);
          setActive({ q: '', i: -1 });
        } else {
          selectResult(option.result);
        }
      }
    },
    [options, activeIndex, selectResult, setActiveIndex, addTag],
  );

  return {
    query,
    setQuery,
    search,
    options,
    selectResult,
    addTag,
    removeTag,
    submitQuery,
    activeIndex,
    setActiveIndex,
    handleKeyDown,
    start: useCallback(() => setStarted(true), []),
  };
}
