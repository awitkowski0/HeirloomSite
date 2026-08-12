'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSearch, type SearchResult } from '@/lib/search';
import { productSelected, searchSubmitted } from '@/lib/analytics';

/**
 * All search behaviour, shared by the header bar and the mobile overlay.
 *
 * These were previously two components duplicating handleSelect/handleSubmit
 * verbatim, and they had already drifted apart: the mobile one sliced to 10 on
 * a list that can never exceed 8, had no "see all results" affordance, and
 * submitted via onKeyDown on a bare input instead of a form (so it got no
 * role="search" landmark and no iOS "Go" key). One hook, one behaviour.
 *
 * Analytics lives here too, for the same reason: instrumenting the two call
 * sites separately is how they drifted in the first place. `surface` is the
 * only thing that differs between them.
 */
export function useProductSearch(
  surface: 'desktop' | 'mobile',
  onNavigate?: () => void
) {
  const [query, setQuery] = useState('');
  const router = useRouter();
  const results = useSearch(query);

  const selectResult = useCallback(
    (result: SearchResult) => {
      productSelected({
        product_name: result.productName,
        product_category: result.category,
        source: surface === 'mobile' ? 'mobile_search_result' : 'desktop_search_result',
      });
      setQuery('');
      onNavigate?.();
      const params = new URLSearchParams();
      if (result.matchedStain) params.set('stain', result.matchedStain);
      const qs = params.toString();
      router.push(`/product/${result.slug}${qs ? `?${qs}` : ''}`);
    },
    [router, onNavigate, surface]
  );

  const submitQuery = useCallback(() => {
    const trimmed = query.trim();
    if (!trimmed) return;
    searchSubmitted({ result_count: results.length, search_surface: surface });
    setQuery('');
    onNavigate?.();
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  }, [query, router, onNavigate, results.length, surface]);

  return { query, setQuery, results, selectResult, submitQuery };
}
