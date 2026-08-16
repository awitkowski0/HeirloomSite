import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import {
  getCollections,
  getCollectionBySlug,
  getProductsInCollection,
} from '@/lib/collections';
import { itemListJsonLd, breadcrumbJsonLd, jsonLdScript } from '@/lib/seo';
import VisibleProductGrid from '@/components/products/VisibleProductGrid';
import ListingAnalytics from '@/components/products/ListingAnalytics';

export const dynamicParams = false;

export function generateStaticParams() {
  return getCollections().map(c => ({ collection: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ collection: string }>;
}): Promise<Metadata> {
  const { collection: slug } = await params;
  const collection = getCollectionBySlug(slug);
  if (!collection) return { title: 'Collection not found', robots: { index: false } };

  const description =
    `The ${collection.name} collection: ${collection.count} handcrafted pieces built in ` +
    'solid American hardwood, designed to furnish a nursery as one range.';

  return {
    title: `${collection.name} Collection`,
    description,
    alternates: { canonical: `/collections/${slug}` },
    openGraph: {
      title: `${collection.name} Collection`,
      description,
      url: `/collections/${slug}`,
    },
  };
}

export default async function CollectionPage({
  params,
}: {
  params: Promise<{ collection: string }>;
}) {
  const { collection: slug } = await params;
  const collection = getCollectionBySlug(slug);
  if (!collection) notFound();

  const products = getProductsInCollection(collection.name);

  return (
    <div className="container products-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript(itemListJsonLd(products, `/collections/${slug}`)),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript(
            breadcrumbJsonLd([
              { name: 'Home', path: '/' },
              { name: 'Collections', path: '/collections' },
              { name: collection.name, path: `/collections/${slug}` },
            ])
          ),
        }}
      />

      <header className="page-header">
        <h1 className="headline-lg text-primary">{collection.name}</h1>
        <p className="body-lg text-on-surface-variant">
          The full {collection.name} range — {collection.count} pieces designed to sit
          together in one room.
        </p>
      </header>

      <section aria-label={`${collection.name} products`}>
        <VisibleProductGrid products={products} />
        <ListingAnalytics />
      </section>
    </div>
  );
}
