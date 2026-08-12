'use client';

import type { SearchResult } from '@/lib/search';
import { formatPrice } from '@/lib/format';
import { humanizeWood } from '@/lib/labels';

interface SearchResultItemProps {
  result: SearchResult;
  onSelect: (result: SearchResult) => void;
  compact?: boolean;
  id?: string;
}

export default function SearchResultItem({
  result: r,
  onSelect,
  compact = false,
  id,
}: SearchResultItemProps) {
  return (
    <button
      type="button"
      id={id}
      role="option"
      aria-selected={false}
      onClick={() => onSelect(r)}
      className={compact ? 'search-result search-result--compact' : 'search-result'}
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
        <span className="search-result-meta">
          {humanizeWood(r.wood)}
          {r.matchedStain ? <> &bull; {r.matchedStain}</> : null}
          {r.category ? <> &bull; {r.category}</> : null}
        </span>
        <span className="search-result-price">{formatPrice(r.basePrice)}</span>
      </span>
    </button>
  );
}
