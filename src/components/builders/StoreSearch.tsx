'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatPriceApprox } from '@/lib/format';
import { useSearch, type SearchResult } from '@/lib/search';
import { variantHref } from '@/lib/variants';

const hrefFor = (r: SearchResult) =>
  r.matchedStain ? variantHref(r.slug, r.wood, r.matchedStain) : `/product/${r.slug}`;

/* The site's own search index, limited to this builder's pieces. */
export default function StoreSearch({ builderName, slugs }: { builderName: string; slugs: readonly string[] }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const only = useMemo(() => new Set(slugs), [slugs]);
  const results = useSearch(query, only);
  const router = useRouter();
  const showing = open && query.trim() !== '';

  const close = () => {
    setOpen(false);
    setQuery('');
  };

  return (
    <form
      role="search"
      aria-label={`Search ${builderName}`}
      className="store-search"
      onSubmit={e => {
        e.preventDefault();
        if (results[0]) {
          router.push(hrefFor(results[0]));
          close();
        }
      }}
      onBlur={e => {
        if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false);
      }}
      onKeyDown={e => {
        if (e.key === 'Escape') setOpen(false);
      }}
    >
      <input
        type="search"
        value={query}
        placeholder="Search store"
        aria-label={`Search ${builderName}`}
        enterKeyHint="search"
        autoComplete="off"
        onChange={e => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
      />
      {showing && (
        // Keep focus in the input while a result is pressed, so its blur cannot close the list first.
        <div className="store-search__panel" onMouseDown={e => e.preventDefault()}>
          {results.length > 0 ? (
            <ul>
              {results.map(r => (
                <li key={r.id}>
                  <Link href={hrefFor(r)} onClick={close}>
                    {r.image ? (
                      // eslint-disable-next-line @next/next/no-img-element -- 44px thumbnail, as in the site search.
                      <img src={r.image} alt="" loading="lazy" />
                    ) : (
                      <span className="store-search__thumb" />
                    )}
                    <span className="store-search__name">{r.productName}</span>
                    <span className="store-search__price">{formatPriceApprox(r.basePrice)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="small">No {builderName} piece matches that.</p>
          )}
        </div>
      )}
    </form>
  );
}
