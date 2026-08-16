import type { Metadata } from 'next';
import { assertNoOrphanedCategories, getBrowsableProducts, getCategories } from '@/lib/content';
import { itemListJsonLd,
  jsonLdScript,
} from '@/lib/seo';
import CategoryPills from '@/components/products/CategoryPills';
import VisibleProductGrid from '@/components/products/VisibleProductGrid';
import ListingAnalytics from '@/components/products/ListingAnalytics';

export const metadata: Metadata = {
  title: 'All Products',
  description:
    'Browse the full collection of handcrafted cribs, dressers, nightstands and nursery furniture, built from solid American hardwoods.',
  alternates: { canonical: '/products' },
};

export default function ProductsPage() {
  /*
   * Browsable, not everything. The conversion kits and the crib mattress are
   * sold through the bundle on a crib's own page; listing them here puts a
   * $40 rail kit in the same grid as a $3,000 crib. They keep their pages,
   * their prices and their place in every bundle - see src/lib/taxonomy.ts.
   */
  assertNoOrphanedCategories();
  const products = getBrowsableProducts();
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
        <VisibleProductGrid products={products} />
        <ListingAnalytics />
      </section>
    </div>
  );
}
