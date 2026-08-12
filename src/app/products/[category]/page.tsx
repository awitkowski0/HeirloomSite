import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getCategories, getCategoryBySlug, getProductsInCategory } from '@/lib/content';
import { itemListJsonLd, breadcrumbJsonLd } from '@/lib/seo';
import CategoryPills from '@/components/products/CategoryPills';
import ProductCard from '@/components/products/ProductCard';
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

  return (
    <div className="container products-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(itemListJsonLd(products, `/products/${slug}`)),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
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

      <section aria-label={`${category.name} products`}>
        <div className="featured-grid">
          {products.map((p, i) => (
            <ProductCard
              key={p.slug}
              slug={p.slug}
              name={p.productName}
              category={p.category}
              minPrice={p.minPrice}
              img={p.defaultImage}
              priority={i < 4}
            />
          ))}
        </div>
        <ListingAnalytics />
      </section>
    </div>
  );
}
