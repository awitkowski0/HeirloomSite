import type { Metadata } from 'next';
import { Suspense } from 'react';
import SearchResults from '@/components/search/SearchResults';

export const metadata: Metadata = {
  title: 'Search',
  // Search result pages are classic thin/duplicate content; keep them out of
  // the index but let crawlers follow through to the products.
  robots: { index: false, follow: true },
  // Do not inherit the layout's homepage canonical (Pricing App #55 a4).
  alternates: { canonical: null },
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
