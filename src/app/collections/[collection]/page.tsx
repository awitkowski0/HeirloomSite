import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';
import {
  getCollections,
  getCollectionBySlug,
  getProductsInCollection,
  resolveLegacyCollectionSlug,
} from '@/lib/collections';
import { getCollectionIntro } from '@/lib/collection-intros';
import { itemListJsonLd, breadcrumbJsonLd, jsonLdScript } from '@/lib/seo';
import VisibleProductGrid from '@/components/products/VisibleProductGrid';
import ListingAnalytics from '@/components/products/ListingAnalytics';

// Not false: a slug outside generateStaticParams still needs to run through
// the page component below, which tries resolveLegacyCollectionSlug() before
// giving up and calling notFound(). See src/lib/collections.ts.
export const dynamicParams = true;

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

  const intro = getCollectionIntro(slug);
  if (intro) {
    return {
      title: { absolute: intro.title },
      description: intro.metaDescription,
      alternates: { canonical: `/collections/${slug}` },
      openGraph: {
        title: intro.title,
        description: intro.metaDescription,
        url: `/collections/${slug}`,
      },
    };
  }

  const description =
    `The ${collection.name} collection: ${collection.count} pieces made to order by independent builders, ` +
    'designed to furnish a nursery as one range.';

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
  if (!collection) {
    const productSlug = resolveLegacyCollectionSlug(slug);
    if (productSlug) permanentRedirect(`/product/${productSlug}`);
    notFound();
  }

  const products = getProductsInCollection(collection.name);
  const intro = getCollectionIntro(slug);

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
        <h1 className="headline-lg text-primary">{intro ? intro.h1 : collection.name}</h1>
        {intro ? (
          <div className="collection-intro">
            {intro.introParagraphs.map(paragraph => (
              <p key={paragraph.slice(0, 48)} className="body-lg text-on-surface-variant">
                {paragraph}
              </p>
            ))}
            <p className="body-md text-on-surface-variant collection-intro-links">
              {intro.links.map((link, index) => (
                <span key={link.href}>
                  {index > 0 ? ' · ' : null}
                  <Link href={link.href} className="doc-link">
                    {link.label}
                  </Link>
                </span>
              ))}
            </p>
          </div>
        ) : (
          <p className="body-lg text-on-surface-variant">
            The full {collection.name} range — {collection.count} pieces designed to sit
            together in one room.
          </p>
        )}
      </header>

      <section aria-label={`${collection.name} products`}>
        <VisibleProductGrid products={products} />
        <ListingAnalytics />
      </section>
    </div>
  );
}
