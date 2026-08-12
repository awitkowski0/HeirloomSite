'use client';

import type { SearchResult } from '@/lib/search';
import { formatPrice } from '@/lib/format';
import { humanizeWood } from '@/lib/labels';

interface SearchResultItemProps {
  result: SearchResult;
  onSelect: (result: SearchResult) => void;
  compact?: boolean;
  id?: string;
  /** Highlighted by arrow keys. Not focus - focus stays in the input. */
  active?: boolean;
  onMouseEnter?: () => void;
}

export default function SearchResultItem({
  result: r,
  onSelect,
  compact = false,
  id,
  active = false,
  onMouseEnter,
}: SearchResultItemProps) {
  return (
    <button
      type="button"
      id={id}
      role="option"
      aria-selected={active}
      // The input keeps DOM focus and points here with aria-activedescendant,
      // so this must not steal it on mousedown either.
      onMouseDown={e => e.preventDefault()}
      onMouseEnter={onMouseEnter}
      onClick={() => onSelect(r)}
      className={[
        compact ? 'search-result search-result--compact' : 'search-result',
        active ? 'is-active' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {r.image ? (
        // A 48px thumbnail: a /_next/image round-trip costs more than it saves
        // at this size, and would multiply transformations by every search hit.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={r.image} alt="" className="search-result-thumb" loading="lazy" />
      ) : (
        <div className="search-result-thumb search-result-thumb--empty" />
      )}
      <span className="search-result-body">
        <span className="search-result-name">{r.productName}</span>
        {/*
          One row per product, so the meta line describes the product rather
          than one variant: the finish that matched if the query named one,
          otherwise how many variants there are. Repeating the same wood and
          the same price down eight rows told the reader nothing.
        */}
        <span className="search-result-meta">
          {r.matchedStain
            ? r.matchedStain
            : r.variantCount > 1
              ? `${r.variantCount} finishes`
              : humanizeWood(r.wood)}
          {r.category ? <> &bull; {r.category}</> : null}
        </span>
        <span className="search-result-price">
          {r.variantCount > 1 ? `From ${formatPrice(r.basePrice)}` : formatPrice(r.basePrice)}
        </span>
      </span>
    </button>
  );
}
