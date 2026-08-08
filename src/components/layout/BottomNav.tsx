import MobileSearchTrigger from '@/components/search/MobileSearchTrigger';
import NavLink from './NavLink';
import BottomNavCart from './BottomNavCart';

const ITEMS = [
  { href: '/', icon: 'store', label: 'Showroom' },
  { href: '/gallery', icon: 'photo_library', label: 'Gallery' },
  { href: '/products', icon: 'collections_bookmark', label: 'Products' },
] as const;

/**
 * Mobile bottom navigation.
 *
 * Labelled, unlike before: the page previously had two <nav> landmarks and only
 * the header one was named, so screen-reader users got an ambiguous
 * "navigation" landmark here.
 */
export default function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="Primary">
      {ITEMS.map(item => (
        <NavLink key={item.href} href={item.href} className="nav-item">
          <span className="material-symbols-outlined" aria-hidden="true">
            {item.icon}
          </span>
          <span className="nav-label">{item.label}</span>
        </NavLink>
      ))}
      <MobileSearchTrigger />
      <NavLink href="/contact" className="nav-item">
        <span className="material-symbols-outlined" aria-hidden="true">
          mail
        </span>
        <span className="nav-label">Contact</span>
      </NavLink>
      <BottomNavCart />
    </nav>
  );
}
