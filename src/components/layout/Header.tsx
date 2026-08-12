import Link from 'next/link';
import Image from 'next/image';
import SearchBar from '@/components/search/SearchBar';
import CartBadge from './CartBadge';
import NavLink from './NavLink';

/**
 * Server component. Only the search field and the cart badge need client JS.
 */
export default function Header() {
  return (
    <header className="app-header">
      <div className="header-left">
        <Link href="/" className="brand-title" aria-label="Heirloom Cribs and More, home">
          <Image
            src="/logo-wide.png"
            alt=""
            width={180}
            height={36}
            priority
            style={{ height: '36px', width: 'auto', display: 'block' }}
          />
        </Link>
        <nav className="nav-links" aria-label="Main navigation">
          <NavLink href="/">Showroom</NavLink>
          <NavLink href="/gallery">Gallery</NavLink>
          <NavLink href="/products">Products</NavLink>
          <NavLink href="/contact">Contact</NavLink>
        </nav>
      </div>
      <div className="header-right">
        <SearchBar />
        <CartBadge />
      </div>
    </header>
  );
}
