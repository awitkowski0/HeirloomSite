import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  assertNoOrphanedCategories,
  getCategories,
  getTaxonomyNodes,
  getTaxonomyNodeBySlug,
  getProductsForNode,
} from '@/lib/content';
import ShopBrowser from '@/components/shop/ShopBrowser';
import { toShopItems } from '@/lib/shop';
import { itemListJsonLd, breadcrumbJsonLd, jsonLdScript } from '@/lib/seo';
import { TAXONOMY } from '@/lib/taxonomy';
import CategoryPills from '@/components/products/CategoryPills';
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
  const categories = getCategories();
  const parent = parentOf(slug);

  const crumbs = [
    { name: 'Home', path: '/' },
    { name: 'Products', path: '/products' },
    ...(parent ? [{ name: parent.name, path: `/products/${parent.slug}` }] : []),
    { name: node.name, path: `/products/${slug}` },
  ];

  return (
    <div className="container products-page">
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

      <header className="page-header">
        {parent && (
          <p className="label-caps text-on-surface-variant">
            <Link href={`/products/${parent.slug}`}>{parent.name}</Link>
          </p>
        )}
        <h1 className="headline-lg text-primary">{node.name}</h1>
        <p className="body-lg text-on-surface-variant">{node.description}</p>
      </header>

      <CategoryPills categories={categories} activeSlug={parent?.slug ?? slug} />

      {/*
        A parent offers its children before its products. Someone landing on
        "Cribs" is choosing between the full range and the minis, and the grid
        below still shows the whole branch for anyone who would rather just
        look.

        Wide screens only: on a phone the cribs page is just the gallery (see
        .subcategory-nav--desktop-only in globals.css).
      */}
      {node.children && node.children.length > 0 && (
        <nav
          className="subcategory-nav subcategory-nav--desktop-only"
          aria-label={`${node.name} subcategories`}
        >
          {node.children.map(child => (
            <Link key={child.slug} href={`/products/${child.slug}`} className="subcategory-card">
              <span className="body-lg">{child.name}</span>
              <span className="label-caps text-on-surface-variant">
                {child.count} {child.count === 1 ? 'piece' : 'pieces'}
              </span>
            </Link>
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
