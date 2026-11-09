import Link from 'next/link';
import CookieSettingsLink from '@/components/consent/CookieSettingsLink';
import { HOURS_LABEL, PHONE_DISPLAY, PHONE_HREF } from '@/lib/hours';

const COLUMNS: readonly { heading: string; links: readonly { href: string; label: string }[] }[] = [
  {
    heading: 'Shop',
    links: [
      { href: '/products', label: 'Everything' },
      { href: '/products/cribs', label: 'Cribs' },
      { href: '/products/dressers-changing-tables', label: 'Dressers' },
      { href: '/products/nightstands-storage', label: 'Nightstands' },
      { href: '/collections', label: 'Collections' },
      { href: '/pick', label: 'Help me pick' },
      { href: '/gifts', label: 'Gifts' },
    ],
  },
  {
    heading: 'Learn',
    links: [
      { href: '/how-conversion-works', label: 'How conversion works' },
      { href: '/why-hardwood', label: 'Why solid hardwood' },
      { href: '/woods-and-finishes', label: 'Woods and stains' },
      { href: '/safe-sleep', label: 'Safe sleep' },
      { href: '/timeline', label: 'Timeline' },
      { href: '/faq', label: 'FAQ' },
    ],
  },
  {
    heading: 'About',
    links: [
      { href: '/about-heirloom', label: 'About Heirloom' },
      { href: '/builders', label: 'Our builders' },
      { href: '/safety', label: 'Safety' },
      { href: '/your-taste', label: 'What we’ve learned' },
    ],
  },
  {
    heading: 'Help',
    links: [
      { href: '/care', label: 'Care' },
      { href: '/shipping', label: 'Delivery' },
      { href: '/returns', label: 'Returns and cancellations' },
      { href: '/terms', label: 'Terms' },
      { href: '/privacy', label: 'Privacy' },
      { href: '/contact', label: 'Contact us' },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="site-foot">
      <div className="foot-grid">
        {COLUMNS.map(col => (
          <div key={col.heading}>
            <h2>{col.heading}</h2>
            <ul>
              {col.links.map(l => <li key={l.href}><Link href={l.href}>{l.label}</Link></li>)}
            </ul>
          </div>
        ))}
      </div>
      <p className="foot-note">
        <a href={PHONE_HREF}>{PHONE_DISPLAY}</a> · {HOURS_LABEL} · <CookieSettingsLink />
      </p>
      <p className="foot-note">© {new Date().getFullYear()} Heirloom Cribs &amp; More. We don’t build the furniture. We take the order, answer the phone, and handle delivery.</p>
    </footer>
  );
}
