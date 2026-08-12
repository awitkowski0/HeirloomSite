import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-grid">
          <div>
            <span className="brand-title footer-brand">Heirloom Cribs and More</span>
            <p className="body-md text-on-surface-variant footer-tagline">
              Handcrafted for generations.
            </p>
          </div>
          <div>
            <h2 className="label-caps text-primary footer-heading">Shop</h2>
            <ul className="footer-links">
              <li>
                <Link href="/products">All Products</Link>
              </li>
              <li>
                <Link href="/gallery">Gallery</Link>
              </li>
            </ul>
          </div>
          <div className="footer-support">
            <h2 className="label-caps text-primary footer-heading">Support</h2>
            <ul className="footer-links">
              <li>
                <Link href="/contact">Contact Us</Link>
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
