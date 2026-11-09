import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  assertNoOrphanedCategories,
  getTaxonomyNodes,
  getTaxonomyNodeBySlug,
  getProductsForNode,
} from '@/lib/content';
import ShopBrowser from '@/components/shop/ShopBrowser';
import { toShopItems } from '@/lib/shop';
import { itemListJsonLd, breadcrumbJsonLd, jsonLdScript } from '@/lib/seo';
import { TAXONOMY } from '@/lib/taxonomy';
import ListingAnalytics from '@/components/products/ListingAnalytics';

export const dynamicParams = false;

export function generateStaticParams() {
  /*
   * Every LIVE node, parent and child alike, at a flat URL.
   *
   * A declared category with nothing in it is pruned by getTaxonomy(), so an
   * unstocked Clothing or Toys never becomes a route, a sitemap entry or an
   * empty page for a crawler to find. It starts existing the day something
   * declares that category.
   */
  assertNoOrphanedCategories();
  return getTaxonomyNodes().map(n => ({ category: n.slug }));
}

/** The declared parent of a node, for breadcrumbs. Null for a top-level one. */
function parentOf(slug: string) {
  return TAXONOMY.find(top => (top.children ?? []).some(c => c.slug === slug)) ?? null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category: slug } = await params;
  const node = getTaxonomyNodeBySlug(slug);
  if (!node) return { title: 'Category not found', robots: { index: false } };

  return {
    title: node.name,
    description: node.description,
    alternates: { canonical: `/products/${slug}` },
    openGraph: { title: node.name, description: node.description, url: `/products/${slug}` },
  };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category: slug } = await params;
  const node = getTaxonomyNodeBySlug(slug);
  if (!node) notFound();

  const products = getProductsForNode(slug);
  const parent = parentOf(slug);

  const crumbs = [
    { name: 'Home', path: '/' },
    { name: 'Products', path: '/products' },
    ...(parent ? [{ name: parent.name, path: `/products/${parent.slug}` }] : []),
    { name: node.name, path: `/products/${slug}` },
  ];

  return (
    <div className="page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript(itemListJsonLd(products, `/products/${slug}`)),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(breadcrumbJsonLd(crumbs)) }}
      />

      <header className="page-intro">
        <h1>{node.name}</h1>
        {node.description ? <p>{node.description}</p> : null}
      </header>

      {node.children && node.children.length > 0 && (
        <nav className="subnav" aria-label={`${node.name} subcategories`}>
          {node.children.map(child => (
            <Link key={child.slug} href={`/products/${child.slug}`} className="link link--quiet">{child.name}</Link>
          ))}
        </nav>
      )}

      <section aria-label={`${node.name} products`}>
        <ShopBrowser items={toShopItems(products)} priorityCount={3} />
        <ListingAnalytics />
      </section>
    </div>
  );
}
