import { getCategories } from '@/lib/content';
import { sortCategories } from '@/lib/categories';
import NavLink from './NavLink';

/**
 * The second header bar: every category, in merchandising order.
 *
 * Built from the catalogue rather than a hardcoded list, so a new category
 * appears here the moment a product declares it. The order comes from
 * sortCategories(); see the note there for why it is neither alphabetical nor
 * by product count.
 *
 * Desktop only. Phones keep the fixed bottom nav, which already carries this
 * ground - nine tracked-caps labels cannot share a 390px bar, and stacking a
 * second scrolling strip under a 52px header would eat a third of the screen
 * before any product appeared.
 */
export default function CategoryBar() {
  const categories = sortCategories(getCategories());

  return (
    <nav className="category-bar" aria-label="Product categories">
      <div className="category-bar-inner">
        {/*
          "All" is not a category, but without it /products has no route from
          the desktop header at all: the redesign replaced the Shop link with
          this bar, and the bar lists only categories. It was reachable from
          the footer and from nowhere else.
        */}
        <NavLink href="/products" className="category-bar-link category-bar-link--all" exact>
          All
        </NavLink>
        {categories.map(category => (
          <NavLink
            key={category.slug}
            href={`/products/${category.slug}`}
            className="category-bar-link"
          >
            {category.name}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
