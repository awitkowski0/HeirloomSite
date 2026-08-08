import type { Metadata } from 'next';
import { Suspense } from 'react';
import SearchResults from '@/components/search/SearchResults';

export const metadata: Metadata = {
  title: 'Search',
  // Search result pages are classic thin/duplicate content; keep them out of
  // the index but let crawlers follow through to the products.
  robots: { index: false, follow: true },
};

export default function SearchPage() {
  return (
    <div className="container products-page">
      <Suspense fallback={<p className="body-lg">Loading search…</p>}>
        <SearchResults />
      </Suspense>
    </div>
  );
}
