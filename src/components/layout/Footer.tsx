import Link from 'next/link';
import CookieSettingsLink from '@/components/consent/CookieSettingsLink';

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-grid">
          <div>
            <span className="footer-brand">Heirloom</span>
            <p className="body-md text-on-surface-variant footer-tagline">
              Solid hardwood nursery furniture, crafted forest-to-family with white-glove care.
            </p>
          </div>
          <div>
            <h2 className="label-caps text-primary footer-heading">Shop</h2>
            <ul className="footer-links">
              <li>
                <Link href="/products">All Products</Link>
              </li>
              <li>
                <Link href="/products/cribs">Cribs</Link>
              </li>
            </ul>
          </div>
          <div className="footer-support">
            <h2 className="label-caps text-primary footer-heading">Support</h2>
            <ul className="footer-links">
              <li>
                <Link href="/safety">Safety</Link>
              </li>
              <li>
                <Link href="/care">Care &amp; Finishes</Link>
              </li>
              <li>
                <Link href="/contact">Contact Us</Link>
              </li>
              <li>
                <Link href="/privacy">Privacy</Link>
              </li>
              <li>
                <CookieSettingsLink />
              </li>
            </ul>
            <p className="body-md text-on-surface-variant footer-copyright">
              © {new Date().getFullYear()} Heirloom Cribs and More. All Rights Reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
