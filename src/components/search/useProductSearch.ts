'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSearch, type SearchResult } from '@/lib/search';
import { variantHref } from '@/lib/variants';
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
      // A finish that matched the query gets its own URL, so searching
      // "driftwood" lands on that finish rather than the default one.
      router.push(
        result.matchedStain
          ? variantHref(result.slug, result.wood, result.matchedStain)
          : `/product/${result.slug}`
      );
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

  /*
   * Arrow-key navigation.
   *
   * The input already declared role="combobox" with aria-expanded and
   * aria-controls, but only Escape was handled - so it announced a listbox
   * that could not be reached from the keyboard at all. Focus stays in the
   * input throughout and the active option is pointed at with
   * aria-activedescendant, which is the pattern screen readers expect.
   */
  /*
   * The highlight is stored WITH the query it belongs to, and derived during
   * render, rather than reset from an effect. A new query invalidates it -
   * otherwise Enter would act on whatever now sits at that position - and
   * doing it in state means there is no frame where a stale row is still
   * highlighted against new results.
   */
  const [active, setActive] = useState<{ q: string; i: number }>({ q: '', i: -1 });
  const activeIndex = active.q === query ? active.i : -1;
  const setActiveIndex = useCallback((i: number) => setActive({ q: query, i }), [query]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>): 'close' | undefined => {
      if (e.key === 'Escape') return 'close';
      if (results.length === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((activeIndex + 1) % results.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex(activeIndex <= 0 ? results.length - 1 : activeIndex - 1);
      } else if (e.key === 'Home') {
        e.preventDefault();
        setActiveIndex(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        setActiveIndex(results.length - 1);
      } else if (e.key === 'Enter' && activeIndex >= 0) {
        // Only intercept Enter when something is highlighted; otherwise the
        // form submits and takes the visitor to the full results page.
        e.preventDefault();
        selectResult(results[activeIndex]);
      }
    },
    [results, activeIndex, selectResult, setActiveIndex]
  );

  return {
    query,
    setQuery,
    results,
    selectResult,
    submitQuery,
    activeIndex,
    setActiveIndex,
    handleKeyDown,
  };
}
