import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Page not found',
  robots: { index: false, follow: true },
};

/**
 * Real 404. Previously every unknown path - and every bad product slug -
 * returned HTTP 200 with an empty <main>, which Google indexes as a thin page.
 */
export default function NotFound() {
  return (
    <div className="container narrow-page">
      <h1 className="headline-lg">Page not found</h1>
      <p className="body-lg text-on-surface-variant">
        We couldn&rsquo;t find that page. It may have moved, or the link may be out of date.
      </p>
      <div className="not-found-actions">
        <Link href="/products" className="button-primary">Browse all products</Link>
        <Link href="/" className="button-secondary">Back to the showroom</Link>
      </div>
    </div>
  );
}
