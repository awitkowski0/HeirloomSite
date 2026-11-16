import Link from 'next/link';
import SearchBar from '@/components/search/SearchBar';
import MobileSearchTrigger from '@/components/search/MobileSearchTrigger';
import HelpMenu from './HelpMenu';

export default function Header() {
  return (
    <header className="site-head">
      <Link href="/" className="wordmark">
        <picture>
          <source media="(min-width: 760px)" srcSet="/brand/logo-wide.png" width={562} height={128} />
          <img src="/brand/logo-text.png" alt="Heirloom Cribs & More" width={452} height={128} />
        </picture>
      </Link>
      <nav className="site-nav" aria-label="Main">
        <Link href="/products">Shop</Link>
        <Link href="/pick">Help me pick</Link>
      </nav>
      <div className="header-search">
        <SearchBar />
      </div>
      <MobileSearchTrigger />
      <HelpMenu />
    </header>
  );
}
