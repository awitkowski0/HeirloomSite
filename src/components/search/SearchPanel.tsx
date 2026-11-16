'use client';

import { formatPriceApprox } from '@/lib/format';
import type { useProductSearch } from './useProductSearch';
import SearchResultItem from './SearchResultItem';

/* What was understood, what wasn't, suggested tags and the results. Used by both search surfaces. */
export default function SearchPanel({
  listboxId,
  search: state,
  compact,
}: {
  listboxId: string;
  search: ReturnType<typeof useProductSearch>;
  compact?: boolean;
}) {
  const { search, options, query, activeIndex, setActiveIndex, addTag, removeTag, selectResult, submitQuery } = state;
  const typed = query.trim().length > 0;
  const notes: string[] = [];
  if (search.relaxed.length > 0) notes.push(`Nothing matched ${search.relaxed.map(t => `“${t.label}”`).join(', ')} too, so we left it out.`);
  if (search.unknown.length > 0) notes.push(`We don’t know ${search.unknown.map(w => `“${w}”`).join(', ')}. Here’s the closest we have.`);
  if (search.refused.length > 0) notes.push(`Search can’t look for ${search.refused.map(w => `“${w}”`).join(', ')}.`);

  return (
    <>
      {search.tags.length > 0 && (
        <div className="search-chips" role="group" aria-label="What we understood">
          {search.tags.map(tag => (
            <button key={tag.key} type="button" className="search-chip" aria-label={`Remove ${tag.label}`} onMouseDown={e => e.preventDefault()} onClick={() => removeTag(tag)}>
              {tag.label} <span aria-hidden="true">×</span>
            </button>
          ))}
        </div>
      )}
      {typed && (
        <p className="search-count">
          {search.loading ? 'Searching' : `${search.total} ${search.total === 1 ? 'piece' : 'pieces'}`}
          {notes.length > 0 ? <span className="search-note"> {notes.join(' ')}</span> : null}
        </p>
      )}

      <div id={listboxId} role="listbox" aria-label="Search results">
        {options.map((option, i) =>
          option.kind === 'tag' ? (
            <button
              key={option.suggestion.tag.key}
              type="button"
              id={`${listboxId}-opt-${i}`}
              role="option"
              aria-selected={i === activeIndex}
              className={i === activeIndex ? 'search-suggest is-active' : 'search-suggest'}
              onMouseDown={e => e.preventDefault()}
              onMouseEnter={() => setActiveIndex(i)}
              onClick={() => addTag(option.suggestion.tag)}
            >
              {option.suggestion.image ? (
                // eslint-disable-next-line @next/next/no-img-element -- A 36px thumbnail; not worth an optimizer round trip.
                <img src={option.suggestion.image} alt="" loading="lazy" />
              ) : (
                <span className="search-suggest-empty" />
              )}
              <span className="search-suggest-label">{option.suggestion.tag.label}</span>
              <span className="search-suggest-meta">
                {option.suggestion.count} {option.suggestion.count === 1 ? 'piece' : 'pieces'} · from {formatPriceApprox(option.suggestion.price)}
              </span>
            </button>
          ) : (
            <SearchResultItem
              key={option.result.slug}
              id={`${listboxId}-opt-${i}`}
              result={option.result}
              onSelect={selectResult}
              active={i === activeIndex}
              onMouseEnter={() => setActiveIndex(i)}
              compact={compact}
            />
          ),
        )}
      </div>

      {typed && search.total > 0 && (
        <button type="button" onClick={submitQuery} onMouseDown={e => e.preventDefault()} className="search-see-all">
          See all {search.total} {search.total === 1 ? 'result' : 'results'}
          <span className="material-symbols-outlined" aria-hidden="true">arrow_forward</span>
        </button>
      )}
    </>
  );
}
