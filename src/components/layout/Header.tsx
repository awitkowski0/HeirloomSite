import Link from 'next/link';
import { PHONE_DISPLAY, PHONE_HREF } from '@/lib/hours';

export default function Header() {
  return (
    <header className="site-head">
      <Link href="/" className="wordmark" aria-label="Heirloom Cribs & More, home">Heirloom</Link>
      <nav className="site-nav" aria-label="Main">
        <Link href="/products">Shop</Link>
        <Link href="/pick">Help me pick</Link>
        <Link href="/gifts">Gifts</Link>
      </nav>
      <Link href="/search" className="head-link">Search</Link>
      <a href={PHONE_HREF} className="head-link" aria-label={`Call ${PHONE_DISPLAY}`}>Call</a>
    </header>
  );
}
