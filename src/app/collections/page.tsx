import type { Metadata } from 'next';
import Link from 'next/link';
import { getCollections } from '@/lib/collections';
import { breadcrumbJsonLd, jsonLdScript } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Shop by Collection',
  description:
    'Browse each Heirloom collection as a range — crib, dresser, nightstand and chest designed together in one design language.',
  alternates: { canonical: '/collections' },
};

/**
 * The collection index.
 *
 * A category answers "what is this piece"; a collection answers "what matches
 * my crib". This page exists because the header sub-menu needs somewhere to
 * land for anyone who arrives without a range already in mind.
 */
export default function CollectionsPage() {
  const collections = getCollections();

  return (
    <div className="container products-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript(
            breadcrumbJsonLd([
              { name: 'Home', path: '/' },
              { name: 'Collections', path: '/collections' },
            ])
          ),
        }}
      />

      <header className="page-header">
        <h1 className="headline-lg text-primary">Shop by Collection</h1>
        <p className="body-lg text-on-surface-variant">
          Each collection is a full range in one design language — crib, dresser, nightstand
          and chest, built to sit together in the same room.
        </p>
      </header>

      <nav className="subcategory-nav" aria-label="Collections">
        {collections.map(collection => (
          <Link
            key={collection.slug}
            href={`/collections/${collection.slug}`}
            className="subcategory-card"
          >
            <span className="body-lg">{collection.name}</span>
            <span className="label-caps text-on-surface-variant">
              {collection.count} {collection.count === 1 ? 'piece' : 'pieces'}
            </span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
