import Link from 'next/link';
import SearchBar from '@/components/search/SearchBar';
import CartBadge from './CartBadge';
import NavLink from './NavLink';

/**
 * Server component. Only the search field and the cart badge need client JS.
 *
 * Three-cell grid rather than flex space-between: the wordmark has to sit at
 * the optical centre of the bar, and space-between centres it only when the
 * two side clusters happen to be the same width. They are not, and the label
 * lengths change per viewport, so under flex the mark visibly drifts.
 *
 * The mark is text, not the logo PNG it replaced. That removes an image
 * request from every page in the site and lets the mark inherit colour;
 * logo-wide.png is still the og:image and stays in place.
 */
export default function Header() {
  return (
    <header className="app-header">
      <nav className="header-nav header-nav--start" aria-label="Shop">
        <NavLink href="/products">Shop</NavLink>
        <NavLink href="/gallery">Collections</NavLink>
      </nav>

      <Link href="/" className="wordmark" aria-label="Heirloom Cribs and More, home">
        Heirloom
      </Link>

      <div className="header-end">
        <nav className="header-nav header-nav--end" aria-label="Support">
          <NavLink href="/safety">Safety</NavLink>
          <NavLink href="/care">Care</NavLink>
          <NavLink href="/contact">Help</NavLink>
        </nav>
        <SearchBar />
        <CartBadge />
      </div>
    </header>
  );
}
