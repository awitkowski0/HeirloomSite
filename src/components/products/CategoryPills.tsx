import Link from 'next/link';
import type { CategorySummary } from '@/lib/categories';

interface Props {
  categories: CategorySummary[];
  /** Slug of the active category, or null on /products. */
  activeSlug: string | null;
}

/**
 * Category filter.
 *
 * Replaces CategoryFilter, which was a client component of buttons driving
 * useState. That had two problems: the selection lived only in component state
 * (so /products/cribs rendered the unfiltered list - the state initialiser read
 * `categories`, which derives from `inventory`, which is empty on first render
 * and never re-initialises), and the categories were not crawlable.
 *
 * As links they are real, indexable, shareable URLs resolved on the server.
 */
export default function CategoryPills({ categories, activeSlug }: Props) {
  return (
    <nav aria-label="Product categories" className="category-pills">
      <Link
        href="/products"
        className={`category-pill${activeSlug === null ? ' active' : ''}`}
        aria-current={activeSlug === null ? 'page' : undefined}
      >
        All
      </Link>
      {categories.map(cat => (
        <Link
          key={cat.slug}
          href={`/products/${cat.slug}`}
          className={`category-pill${activeSlug === cat.slug ? ' active' : ''}`}
          aria-current={activeSlug === cat.slug ? 'page' : undefined}
        >
          {cat.name}
        </Link>
      ))}
    </nav>
  );
}
