'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { useProductSearch } from './useProductSearch';
import SearchResultItem from './SearchResultItem';

/**
 * Header search with an inline results dropdown.
 *
 * Combobox semantics are new: previously the dropdown had no role, the input
 * had no aria-expanded/aria-controls, and there was no live region, so a
 * screen-reader user typing here got complete silence whether 8 results
 * appeared or none did.
 */
export default function SearchBar() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();
  const { query, setQuery, results, selectResult, submitQuery, activeIndex, setActiveIndex, handleKeyDown } =
    useProductSearch('desktop', () => setOpen(false));

  const showDropdown = open && query.trim().length > 0 && results.length > 0;

  useEffect(() => {
    function handlePointerDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, []);

  return (
    <div ref={containerRef} className="search-bar">
      <form
        role="search"
        className="search-bar-form"
        onSubmit={e => {
          e.preventDefault();
          submitQuery();
        }}
      >
        <input
          type="search"
          value={query}
          onChange={e => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={e => {
            if (handleKeyDown(e) === 'close') setOpen(false);
          }}
          placeholder="Search products, stains, woods..."
          aria-label="Search products"
          role="combobox"
          aria-expanded={showDropdown}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={
            activeIndex >= 0 && results[activeIndex]
              ? `${listboxId}-opt-${activeIndex}`
              : undefined
          }
          className="search-bar-input"
        />
        <button type="submit" className="icon-btn" aria-label="Submit search">
          <span className="material-symbols-outlined" aria-hidden="true">
            search
          </span>
        </button>
      </form>

      {/* Announces result counts to screen readers as the user types. */}
      <p role="status" aria-live="polite" className="visually-hidden">
        {query.trim()
          ? `${results.length} ${results.length === 1 ? 'result' : 'results'} for ${query.trim()}`
          : ''}
      </p>

      {showDropdown && (
        <div className="search-dropdown">
          <div id={listboxId} role="listbox" aria-label="Search results">
            {results.map((r, i) => (
              <SearchResultItem
                key={r.id}
                id={`${listboxId}-opt-${i}`}
                result={r}
                onSelect={selectResult}
                active={i === activeIndex}
                onMouseEnter={() => setActiveIndex(i)}
                compact
              />
            ))}
          </div>
          <button type="button" onClick={submitQuery} className="search-see-all">
            See all {results.length} results
            <span className="material-symbols-outlined" aria-hidden="true">
              arrow_forward
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
