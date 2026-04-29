import { Link } from 'react-router-dom';

export default function Header() {
  return (
    <header className="header">
      <div className="header-left">
        <Link to="/" className="brand-title">Heirloom Cribs</Link>
        <div className="nav-links" style={{ display: 'flex', gap: '1rem', marginLeft: '2rem' }}>
          <Link to="/" style={{ textDecoration: 'none', color: 'var(--on-surface-variant)' }}>Showroom</Link>
          <Link to="/gallery" style={{ textDecoration: 'none', color: 'var(--on-surface-variant)' }}>Gallery</Link>
        </div>
      </div>
      <div className="header-right">
        <button className="icon-btn">
          <span className="material-symbols-outlined">favorite</span>
        </button>
        <Link to="/checkout" className="icon-btn">
          <span className="material-symbols-outlined">shopping_bag</span>
        </Link>
      </div>
    </header>
  );
}
