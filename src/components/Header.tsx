import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useCart } from '../context/CartContext';

export default function Header() {
  const { totalItems } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
    setSearchQuery('');
    setSearchOpen(false);
  };

  return (
    <header className={`app-header${location.pathname.startsWith('/product/') ? ' app-header--product' : ''}`}>
      <div className="header-left">
        <Link to="/" className="brand-title">
          <img src="/logo-wide.png" alt="Heirloom Cribs and More" style={{ height: '36px', width: 'auto', display: 'block' }} />
        </Link>
        <nav className="nav-links" style={{ display: 'flex', gap: '1rem', marginLeft: '2rem' }} aria-label="Main navigation">
          <Link to="/" style={{ textDecoration: 'none', color: 'var(--on-surface-variant)', fontSize: '13px' }}>Showroom</Link>
          <Link to="/gallery" style={{ textDecoration: 'none', color: 'var(--on-surface-variant)', fontSize: '13px' }}>Gallery</Link>
          <Link to="/products" style={{ textDecoration: 'none', color: 'var(--on-surface-variant)', fontSize: '13px' }}>Products</Link>
          <Link to="/registry/new" style={{ textDecoration: 'none', color: 'var(--on-surface-variant)', fontSize: '13px' }}>Registry</Link>
          <Link to="/contact" style={{ textDecoration: 'none', color: 'var(--on-surface-variant)', fontSize: '13px' }}>Contact</Link>
        </nav>
      </div>
      <div className="header-right" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <form onSubmit={handleSearch} role="search" style={{ display: 'flex', alignItems: 'center' }}>
          {searchOpen && (
            <input type="search" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search products..." autoFocus
              style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--outline-variant)', fontSize: '13px', width: '200px', outline: 'none' }}
              onBlur={() => { if (!searchQuery) setSearchOpen(false); }} />
          )}
          <button type={searchOpen ? 'submit' : 'button'} onClick={() => { if (!searchOpen) setSearchOpen(true); }}
            className="icon-btn" aria-label="Search" style={{ padding: '6px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>{searchOpen ? 'search' : 'search'}</span>
          </button>
        </form>
        <Link to="/checkout" className="icon-btn" style={{ position: 'relative' }} aria-label="Shopping cart">
          <span className="material-symbols-outlined">shopping_bag</span>
          {totalItems > 0 && (
            <span style={{ 
              position: 'absolute', top: '-4px', right: '-4px', backgroundColor: 'var(--primary)', color: 'white',
              borderRadius: '50%', width: '18px', height: '18px', fontSize: '10px', display: 'flex',
              alignItems: 'center', justifyContent: 'center', fontWeight: 'bold'
            }}>
              {totalItems}
            </span>
          )}
        </Link>
      </div>
    </header>
  );
}
