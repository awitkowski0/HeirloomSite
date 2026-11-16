'use client';

import { useEffect, useId, useRef, useState } from 'react';
import Modal from '@/components/ui/Modal';
import SearchPanel from './SearchPanel';
import { useProductSearch } from './useProductSearch';

/**
 * The phone search entry and its full-screen panel, read in from the live site.
 * Same hook as the header field; the panel is a real dialog with a focus trap,
 * Escape, a scroll lock and an accessible name.
 */
export default function MobileSearchTrigger() {
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxId = useId();
  const state = useProductSearch('mobile', () => setOpen(false));
  const { query, setQuery, search, options, submitQuery, activeIndex, handleKeyDown, start } = state;

  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => inputRef.current?.focus(), 50);
    return () => window.clearTimeout(id);
  }, [open]);

  return (
    <>
      <button
        type="button"
        className="mobile-search-trigger"
        aria-label="Search products"
        onClick={() => {
          start();
          setOpen(true);
        }}
      >
        <span className="material-symbols-outlined" aria-hidden="true">search</span>
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Search products" overlayClassName="mobile-search-overlay" className="mobile-search-panel">
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
            onKeyDown={e => {
              if (handleKeyDown(e) === 'close') setOpen(false);
            }}
            placeholder="Search cribs, finishes, dressers"
            aria-label="Search products"
            role="combobox"
            aria-expanded={options.length > 0}
            aria-controls={listboxId}
            aria-autocomplete="list"
            aria-activedescendant={activeIndex >= 0 && options[activeIndex] ? `${listboxId}-opt-${activeIndex}` : undefined}
            autoComplete="off"
            className="mobile-search-input"
          />
          <button type="button" className="icon-btn" onClick={() => setOpen(false)} aria-label="Close search">
            <span className="material-symbols-outlined" aria-hidden="true">close</span>
          </button>
        </form>

        <p role="status" aria-live="polite" className="visually-hidden">
          {query.trim() ? `${search.total} ${search.total === 1 ? 'result' : 'results'} for ${query.trim()}` : ''}
        </p>

        <SearchPanel listboxId={listboxId} search={state} />
      </Modal>
    </>
  );
}
