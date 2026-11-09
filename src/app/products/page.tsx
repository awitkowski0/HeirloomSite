import type { Metadata } from 'next';
import { assertNoOrphanedCategories, getBrowsableProducts } from '@/lib/content';
import { itemListJsonLd,
  jsonLdScript,
} from '@/lib/seo';
import ShopBrowser from '@/components/shop/ShopBrowser';
import UsesNav from '@/components/uses/UsesNav';
import { toShopItems } from '@/lib/shop';
import ListingAnalytics from '@/components/products/ListingAnalytics';

export const metadata: Metadata = {
  title: 'All Products',
  description:
    'Browse the full collection of cribs, dressers, nightstands, and nursery furniture, made to order by independent builders.',
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

  return (
    <div className="page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(itemListJsonLd(products, '/products')) }}
      />

      <section aria-label="Product grid">
        <ShopBrowser items={toShopItems(products)} priorityCount={4} heading />
        <UsesNav />
        <ListingAnalytics />
      </section>
    </div>
  );
}
