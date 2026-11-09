import Link from 'next/link';
import { getTaxonomy } from '@/lib/content';
import { getCollections } from '@/lib/collections';
import NavLink from './NavLink';

/**
 * The second header bar: the browse taxonomy, two levels deep.
 *
 * Built from src/lib/taxonomy.ts rather than counted out of the catalogue, so
 * the shop can declare a category before it stocks one. Nodes with nothing in
 * them are pruned by getTaxonomy() before they reach here - see the note there.
 *
 * The sub-menu is CSS-only: a nested <ul> revealed on hover and on
 * focus-within. No client component, no state, no JavaScript - this bar is
 * rendered on the server and must stay that way, because it appears on every
 * statically prerendered page on the site.
 *
 * Desktop only. Phones keep the fixed bottom nav, which already carries this
 * ground - these labels cannot share a 390px bar, and stacking a second
 * scrolling strip under a 52px header would eat a third of the screen before
 * any product appeared.
 */
export default function CategoryBar() {
  const categories = getTaxonomy();
  const collections = getCollections();

  return (
    <nav className="category-bar" aria-label="Product categories">
      <ul className="category-bar-inner">
        {/*
          "All" is not a category, but without it /products has no route from
          the desktop header at all: the bar lists only categories, and it was
          otherwise reachable from the footer and from nowhere else.
        */}
        <li className="category-bar-item">
          <NavLink href="/products" className="category-bar-link category-bar-link--all" exact>
            All
          </NavLink>
        </li>

        {categories.map(category => (
          <li key={category.slug} className="category-bar-item">
            <NavLink href={`/products/${category.slug}`} className="category-bar-link">
              {category.name}
            </NavLink>
            {category.children && category.children.length > 0 && (
              <ul className="category-submenu">
                {category.children.map(child => (
                  <li key={child.slug}>
                    <Link href={`/products/${child.slug}`} className="category-submenu-link">
                      {child.name}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}

        {/*
          Collections are a second axis, not a category: the same products cut
          by the range they belong to rather than by what they are. It sits at
          the end of the bar because someone who already knows they want the
          Addison range is the minority of visitors.
        */}
        {collections.length > 0 && (
          <li className="category-bar-item">
            <NavLink href="/collections" className="category-bar-link">
              Shop by Collection
            </NavLink>
            <ul className="category-submenu">
              {collections.map(collection => (
                <li key={collection.slug}>
                  <Link
                    href={`/collections/${collection.slug}`}
                    className="category-submenu-link"
                  >
                    {collection.name}
                  </Link>
                </li>
              ))}
            </ul>
          </li>
        )}
      </ul>
    </nav>
  );
}
