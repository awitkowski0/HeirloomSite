'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchAll } from '@/lib/search';
import { formatPriceApprox } from '@/lib/format';
import TalkToPerson from '@/components/layout/TalkToPerson';

export default function SearchResults() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';
  const { results, loading } = useSearchAll(query);

  return (
    <div className="page">
      <header className="page-intro">
        <h1>{query ? `Search: “${query}”` : 'Search'}</h1>
        <form className="ask" action="/search">
          <input name="q" defaultValue={query} aria-label="Search the catalog" placeholder="A crib, a finish, a dresser" autoComplete="off" />
          <button type="submit">Search</button>
        </form>
        <p role="status" aria-live="polite" className="small">
          {!query ? '' : loading ? 'Searching…' : `${results.length} ${results.length === 1 ? 'result' : 'results'}`}
        </p>
      </header>

      {query && !loading && results.length === 0 && (
        <p className="page-note">
          Nothing matched that search. <Link href="/products">Browse all products</Link>, or ask us.
          {' '}<TalkToPerson />
        </p>
      )}

      {results.length > 0 && (
        <div className="grid">
          {results.map(r => (
            <Link key={r.slug} href={`/product/${r.slug}`} className="piece-link">
              <span className="piece-photo">
                {r.image ? <Image src={r.image} alt={r.productName} fill sizes="(max-width: 859px) 46vw, 260px" /> : null}
              </span>
              <span className="piece-name">{r.productName}</span>
              <span className="piece-meta">{formatPriceApprox(r.basePrice)}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
