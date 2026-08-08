'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSearch, type SearchResult } from '@/lib/search';

/**
 * All search behaviour, shared by the header bar and the mobile overlay.
 *
 * These were previously two components duplicating handleSelect/handleSubmit
 * verbatim, and they had already drifted apart: the mobile one sliced to 10 on
 * a list that can never exceed 8, had no "see all results" affordance, and
 * submitted via onKeyDown on a bare input instead of a form (so it got no
 * role="search" landmark and no iOS "Go" key). One hook, one behaviour.
 */
export function useProductSearch(onNavigate?: () => void) {
  const [query, setQuery] = useState('');
  const router = useRouter();
  const results = useSearch(query);

  const selectResult = useCallback(
    (result: SearchResult) => {
      setQuery('');
      onNavigate?.();
      const params = new URLSearchParams();
      if (result.matchedStain) params.set('stain', result.matchedStain);
      const qs = params.toString();
      router.push(`/product/${result.slug}${qs ? `?${qs}` : ''}`);
    },
    [router, onNavigate]
  );

  const submitQuery = useCallback(() => {
    const trimmed = query.trim();
    if (!trimmed) return;
    setQuery('');
    onNavigate?.();
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  }, [query, router, onNavigate]);

  return { query, setQuery, results, selectResult, submitQuery };
}
