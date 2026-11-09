import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { getBrowsableProducts } from '@/lib/content';
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
  const photoOf = (name: string) =>
    getBrowsableProducts().filter(p => p.collection === name && p.defaultImage).sort((a, b) => Number(b.category === 'Cribs') - Number(a.category === 'Cribs'))[0]?.defaultImage ?? null;

  return (
    <div className="page">
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

      <header className="page-intro">
        <h1>Shop by collection</h1>
        <p>Each collection is a full range in one design, so the pieces sit well together.</p>
      </header>

      <div className="grid">
        {collections.map(collection => {
          const photo = photoOf(collection.name);
          return (
            <Link key={collection.slug} href={`/collections/${collection.slug}`} className="piece-link">
              <span className="piece-photo">{photo ? <Image src={photo} alt="" fill sizes="(max-width: 859px) 46vw, 260px" /> : null}</span>
              <span className="piece-name">{collection.name}</span>
              <span className="piece-meta">{collection.count} {collection.count === 1 ? 'piece' : 'pieces'}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
