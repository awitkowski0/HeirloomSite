'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useSearchAll } from '@/lib/search';
import { formatPriceApprox } from '@/lib/format';
import { humanizeWood } from './SearchResultItem';

export default function SearchResults() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';
  const { results, loading } = useSearchAll(query);

  return (
    <>
      <header className="page-header">
        <h1 className="headline-lg text-primary">
          {query ? `Search: “${query}”` : 'Search'}
        </h1>
        <p role="status" aria-live="polite" className="body-lg text-on-surface-variant">
          {!query
            ? 'Enter a search term to find products.'
            : loading
              ? 'Searching…'
              : `${results.length} ${results.length === 1 ? 'result' : 'results'}`}
        </p>
      </header>

      {query && !loading && results.length === 0 && (
        <p className="body-lg gallery-empty">
          Nothing matched that search. <Link href="/products">Browse all products</Link> instead.
        </p>
      )}

      {results.length > 0 && (
        <div className="featured-grid">
          {results.map(r => (
            <Link key={r.slug} href={`/product/${r.slug}`} className="featured-card product-card-link">
              <article>
                <div className="featured-card-img">
                  {r.image ? (
                    /* eslint-disable-next-line @next/next/no-img-element -- result
                       thumbnails are transient; not worth an optimizer round-trip. */
                    <img src={r.image} alt={r.productName} loading="lazy" />
                  ) : (
                    <span className="material-symbols-outlined product-card-placeholder" aria-hidden="true">crib</span>
                  )}
                </div>
                <div className="featured-card-body">
                  <span className="product-card-category">{r.category || 'Crib'}</span>
                  <h2>{r.productName}</h2>
                  <p className="price">
                    {formatPriceApprox(r.basePrice)}
                    <span className="search-result-wood"> · {humanizeWood(r.wood)}</span>
                  </p>
                </div>
              </article>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
