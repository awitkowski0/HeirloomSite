'use client';

import { useEffect, useRef, useState } from 'react';
import Modal from '@/components/ui/Modal';
import { useProductSearch } from './useProductSearch';
import SearchResultItem from './SearchResultItem';

/**
 * Bottom-nav search entry point plus its full-screen overlay.
 *
 * Shares all behaviour with SearchBar via useProductSearch; only the
 * presentation differs. The overlay is a real dialog now (focus trap, Escape,
 * scroll lock, accessible name) instead of a bare <div onClick>.
 */
export default function MobileSearchTrigger() {
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { query, setQuery, results, selectResult, submitQuery } = useProductSearch('mobile', () =>
    setOpen(false)
  );

  useEffect(() => {
    if (!open) return;
    // Modal moves focus to the first focusable element; put it in the field.
    const id = window.setTimeout(() => inputRef.current?.focus(), 50);
    return () => window.clearTimeout(id);
  }, [open]);

  return (
    <>
      <button type="button" className="nav-item" onClick={() => setOpen(true)}>
        <span className="material-symbols-outlined" aria-hidden="true">
          search
        </span>
        <span className="nav-label">Search</span>
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Search products"
        overlayClassName="mobile-search-overlay"
        className="mobile-search-panel"
      >
        <form
          role="search"
          className="mobile-search-form"
          onSubmit={e => {
            e.preventDefault();
            submitQuery();
          }}
        >
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search products..."
            aria-label="Search products"
            className="mobile-search-input"
          />
          <button type="submit" className="icon-btn" aria-label="Submit search">
            <span className="material-symbols-outlined" aria-hidden="true">
              search
            </span>
          </button>
          {/* Previously this close button had no accessible name at all - the
              only icon-only button missed by the earlier aria-label sweep. */}
          <button
            type="button"
            className="icon-btn"
            onClick={() => setOpen(false)}
            aria-label="Close search"
          >
            <span className="material-symbols-outlined" aria-hidden="true">
              close
            </span>
          </button>
        </form>

        <p role="status" aria-live="polite" className="visually-hidden">
          {query.trim()
            ? `${results.length} ${results.length === 1 ? 'result' : 'results'} for ${query.trim()}`
            : ''}
        </p>

        <div role="listbox" aria-label="Search results">
          {results.map(r => (
            <SearchResultItem key={r.id} result={r} onSelect={selectResult} />
          ))}
        </div>

        {query.trim() && results.length === 0 && (
          <p className="mobile-search-empty">No results for &ldquo;{query.trim()}&rdquo;</p>
        )}
      </Modal>
    </>
  );
}
