import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  assertNoOrphanedCategories,
  getCategories,
  getTaxonomyNodes,
  getTaxonomyNodeBySlug,
  getProductsForNode,
  getInventory,
} from '@/lib/content';
import { buildGalleryProducts } from '@/lib/gallery';
import GalleryBrowser from '@/components/gallery/GalleryBrowser';
import { itemListJsonLd, breadcrumbJsonLd, jsonLdScript } from '@/lib/seo';
import { TAXONOMY, sourcesFor } from '@/lib/taxonomy';
import CategoryPills from '@/components/products/CategoryPills';
import VisibleProductGrid from '@/components/products/VisibleProductGrid';
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

  /*
   * The finish browser, on any node whose products are cribs.
   *
   * It used to be keyed on the literal slug 'cribs'. That breaks the moment
   * cribs live under a parent and a Mini Cribs child, so it now asks what the
   * node actually contains. Only cribs, because only cribs have a finish worth
   * filtering on - the products with `variantType: "none"` have a single
   * "Default" finish, and a filter with one option that matches everything is
   * furniture.
   */
  const nodeSources = new Set(sourcesFor(node));
  const showFinishBrowser = nodeSources.has('Cribs');
  // Built from the node's OWN sources, not the literal 'Cribs' category, so the
  // Cribs parent browses all sixteen and does not advertise a count its grid
  // then contradicts by one. Mini Cribs alone falls through to the plain grid:
  // one product with a single finish is not something to filter.
  const cribFinishes = showFinishBrowser
    ? buildGalleryProducts(getInventory().filter(i => i.category && nodeSources.has(i.category)))
    : [];

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
      */}
      {node.children && node.children.length > 0 && (
        <nav className="subcategory-nav" aria-label={`${node.name} subcategories`}>
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
        {showFinishBrowser ? (
          <GalleryBrowser products={cribFinishes} />
        ) : (
          <VisibleProductGrid products={products} />
        )}
        <ListingAnalytics />
      </section>
    </div>
  );
}
