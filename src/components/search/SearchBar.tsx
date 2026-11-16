'use client';

import { useEffect, useId, useRef, useState } from 'react';
import SearchPanel from './SearchPanel';
import { useProductSearch } from './useProductSearch';

/**
 * The header search, read in from the live site: a wide always-visible field
 * with its results floating directly beneath it. Combobox semantics, focus stays
 * in the input and the active row is announced with aria-activedescendant.
 */
export default function SearchBar() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();
  const state = useProductSearch('desktop', () => setOpen(false));
  const { query, setQuery, search, options, submitQuery, activeIndex, handleKeyDown, start } = state;

  const showDropdown = open && (query.trim().length > 0 || options.length > 0);

  useEffect(() => {
    function handlePointerDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, []);

  return (
    <div
      ref={containerRef}
      className="search-bar"
      onBlur={e => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <form
        role="search"
        className="search-bar-form"
        onSubmit={e => {
          e.preventDefault();
          submitQuery();
        }}
      >
        <svg className="search-bar-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
          <circle cx="8.75" cy="8.75" r="5.5" />
          <path d="M13 13l4.25 4.25" strokeLinecap="round" />
        </svg>
        <input
          type="search"
          value={query}
          onChange={e => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            start();
            setOpen(true);
          }}
          onKeyDown={e => {
            if (handleKeyDown(e) === 'close') setOpen(false);
          }}
          placeholder="Search cribs, finishes, dressers"
          aria-label="Search products"
          role="combobox"
          aria-expanded={showDropdown}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={activeIndex >= 0 && options[activeIndex] ? `${listboxId}-opt-${activeIndex}` : undefined}
          autoComplete="off"
          className="search-bar-input"
        />
        {query.length > 0 && (
          <button
            type="button"
            className="search-bar-clear"
            aria-label="Clear search"
            onMouseDown={e => e.preventDefault()}
            onClick={() => setQuery('')}
          >
            ×
          </button>
        )}
      </form>

      <p role="status" aria-live="polite" className="visually-hidden">
        {query.trim() ? `${search.total} ${search.total === 1 ? 'result' : 'results'} for ${query.trim()}` : ''}
      </p>

      {showDropdown && (
        <div className="search-dropdown">
          <SearchPanel listboxId={listboxId} search={state} compact />
        </div>
      )}
    </div>
  );
}
