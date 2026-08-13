import type { Metadata } from 'next';
import { getProductIndex, getCategories } from '@/lib/content';
import { itemListJsonLd,
  jsonLdScript,
} from '@/lib/seo';
import CategoryPills from '@/components/products/CategoryPills';
import ProductCard from '@/components/products/ProductCard';
import ListingAnalytics from '@/components/products/ListingAnalytics';

export const metadata: Metadata = {
  title: 'All Products',
  description:
    'Browse the full collection of handcrafted cribs, dressers, nightstands and nursery furniture, built from solid American hardwoods.',
  alternates: { canonical: '/products' },
};

export default function ProductsPage() {
  const products = getProductIndex();
  const categories = getCategories();

  return (
    <div className="container products-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(itemListJsonLd(products, '/products')) }}
      />

      <header className="page-header">
        {/* "Shop All", matching the nav label that leads here. This said "Our
            Collections" while the nav item labelled "Collections" pointed at
            /gallery instead - so the one word named two different pages. */}
        <h1 className="headline-lg text-primary">Shop All</h1>
        <p className="body-lg text-on-surface-variant">
          {products.length} handcrafted pieces across {categories.length} categories.
        </p>
      </header>

      <CategoryPills categories={categories} activeSlug={null} />

      <section aria-label="Product grid">
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
