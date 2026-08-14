import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getCategories, getCategoryBySlug, getProductsInCategory, getInventory } from '@/lib/content';
import { buildGalleryProducts } from '@/lib/gallery';
import GalleryBrowser from '@/components/gallery/GalleryBrowser';
import { itemListJsonLd, breadcrumbJsonLd,
  jsonLdScript,
} from '@/lib/seo';
import CategoryPills from '@/components/products/CategoryPills';
import VisibleProductGrid from '@/components/products/VisibleProductGrid';
import ListingAnalytics from '@/components/products/ListingAnalytics';

export const dynamicParams = false;

export function generateStaticParams() {
  return getCategories().map(c => ({ category: c.slug }));
}

/** Descriptive copy per category, for meta descriptions and the page intro. */
const CATEGORY_BLURBS: Record<string, string> = {
  cribs: 'Handcrafted heirloom cribs built from solid American hardwoods with traditional joinery.',
  dressers: 'Solid hardwood dressers with dovetailed drawers, built to outlast the nursery.',
  nightstands: 'Bedside tables handcrafted to match your crib and dresser.',
  chests: 'Storage chests built with mortise-and-tenon joinery and hand-applied finishes.',
  'changing-tables': 'Changing tables that convert to lasting furniture as your child grows.',
  'guard-rails-and-conversions': 'Guard rails and conversion kits to take your crib from newborn to full bed.',
  'area-rugs': 'Washable, natural-fibre area rugs sized for nurseries and bedrooms.',
  accessories: 'Finishing touches for the nursery, made to the same standard as our furniture.',
  lamps: 'Lighting chosen to complement handcrafted nursery furniture.',
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category: slug } = await params;
  const category = getCategoryBySlug(slug);
  if (!category) return { title: 'Category not found', robots: { index: false } };

  const description =
    CATEGORY_BLURBS[slug] ?? `Browse our handcrafted ${category.name.toLowerCase()}.`;

  return {
    title: category.name,
    description,
    alternates: { canonical: `/products/${slug}` },
    openGraph: { title: category.name, description, url: `/products/${slug}` },
  };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category: slug } = await params;
  const category = getCategoryBySlug(slug);
  if (!category) notFound();

  const products = getProductsInCategory(category.name);
  const categories = getCategories();
  const blurb = CATEGORY_BLURBS[slug];

  const isCribs = slug === 'cribs';
  const cribFinishes = isCribs
    ? buildGalleryProducts(getInventory().filter(i => i.category === category.name))
    : [];

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
        dangerouslySetInnerHTML={{
          __html: jsonLdScript(
            breadcrumbJsonLd([
              { name: 'Home', path: '/' },
              { name: 'Products', path: '/products' },
              { name: category.name, path: `/products/${slug}` },
            ])
          ),
        }}
      />

      <header className="page-header">
        <h1 className="headline-lg text-primary">{category.name}</h1>
        {blurb && <p className="body-lg text-on-surface-variant">{blurb}</p>}
      </header>

      <CategoryPills categories={categories} activeSlug={slug} />

      {/*
        Cribs get the finish browser that used to live at /gallery, and every
        other category gets the plain grid.

        The gallery was a separate route showing six of the sixteen cribs -
        only the ones the supplier feed happened to encode as wood variants -
        under a nav label, "Collections", that also named /products. One page
        for cribs, showing all of them, with the finish filtering that was the
        gallery's actual value.

        Only cribs, because only cribs have a finish worth filtering on. The 43
        `variantType: "none"` products have a single "Default" finish, and a
        filter with one option that matches everything is furniture.
      */}
      {isCribs ? (
        <section aria-label={`${category.name} products`}>
          <GalleryBrowser products={cribFinishes} />
          <ListingAnalytics />
        </section>
      ) : (
        <section aria-label={`${category.name} products`}>
          <VisibleProductGrid products={products} />
          <ListingAnalytics />
        </section>
      )}
    </div>
  );
}
