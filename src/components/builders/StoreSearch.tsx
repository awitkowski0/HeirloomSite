'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatPriceApprox } from '@/lib/format';
import { useSearchAll, type SearchResult } from '@/lib/search';
import { variantHref } from '@/lib/variants';

const MAX_RESULTS = 8;

const hrefFor = (r: SearchResult) =>
  r.matchedStain ? variantHref(r.slug, r.wood, r.matchedStain) : `/product/${r.slug}`;

/*
 * The site's own search index, limited to this builder's pieces.
 *
 * useSearchAll fetches the index when it MOUNTS, so it lives in
 * StoreSearchResults, which only mounts once someone has typed: a store page
 * nobody searches downloads nothing. It is the uncapped hook, filtered
 * afterwards, so a builder's match is never crowded out by other builders'
 * pieces before the filter runs.
 */
export default function StoreSearch({ builderName, slugs }: { builderName: string; slugs: readonly string[] }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const first = useRef<string | null>(null);
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
        if (first.current) {
          router.push(first.current);
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
        placeholder="Search this store"
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
        <StoreSearchResults
          query={query}
          slugs={slugs}
          builderName={builderName}
          onFirst={href => {
            first.current = href;
          }}
          onPick={close}
        />
      )}
    </form>
  );
}

function StoreSearchResults({
  query,
  slugs,
  builderName,
  onFirst,
  onPick,
}: {
  query: string;
  slugs: readonly string[];
  builderName: string;
  onFirst: (href: string | null) => void;
  onPick: () => void;
}) {
  const only = useMemo(() => new Set(slugs), [slugs]);
  const { results: all, loading } = useSearchAll(query);
  const results = useMemo(() => all.filter(r => only.has(r.slug)).slice(0, MAX_RESULTS), [all, only]);

  useEffect(() => {
    onFirst(results[0] ? hrefFor(results[0]) : null);
  }, [results, onFirst]);

  return (
    // Keep focus in the input while a result is pressed, so its blur cannot close the list first.
    <div className="store-search__panel" onMouseDown={e => e.preventDefault()}>
      {results.length > 0 ? (
        <ul>
          {results.map(r => (
            <li key={r.id}>
              <Link href={hrefFor(r)} onClick={onPick}>
                {r.image ? (
                  // eslint-disable-next-line @next/next/no-img-element -- 40px thumbnail, as in the site search.
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
        <p className="store-search__none">{loading ? 'Searching…' : `No ${builderName} piece matches that.`}</p>
      )}
    </div>
  );
}
