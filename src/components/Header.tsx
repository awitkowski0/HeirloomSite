import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';

export default function Header() {
  const { totalItems } = useCart();
  const navigate = useNavigate();
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
    <header className="app-header">
      <div className="header-left">
        <Link to="/" className="brand-title">
          <img src="/logo-wide.png" alt="Heirloom Cribs and More" style={{ height: '36px', width: 'auto', display: 'block' }} />
        </Link>
        <nav className="nav-links" style={{ display: 'flex', gap: '1rem', marginLeft: '2rem' }} aria-label="Main navigation">
          <Link to="/" style={{ textDecoration: 'none', color: 'var(--on-surface-variant)', fontSize: '13px' }}>Showroom</Link>
          <Link to="/gallery" style={{ textDecoration: 'none', color: 'var(--on-surface-variant)', fontSize: '13px' }}>Gallery</Link>
          <Link to="/products" style={{ textDecoration: 'none', color: 'var(--on-surface-variant)', fontSize: '13px' }}>Products</Link>
          <Link to="/contact" style={{ textDecoration: 'none', color: 'var(--on-surface-variant)', fontSize: '13px' }}>Contact</Link>
        </nav>
      </div>
      <div className="header-right" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <form onSubmit={handleSearch} role="search" style={{ display: 'flex', alignItems: 'center' }}>
          {searchOpen && (
            <input type="search" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search products..." autoFocus
              aria-label="Search products"
              style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--outline-variant)', fontSize: '13px', width: '200px', outline: 'none' }}
              onBlur={() => { if (!searchQuery) setSearchOpen(false); }} />
          )}
          <button type={searchOpen ? 'submit' : 'button'} onClick={() => { if (!searchOpen) setSearchOpen(true); }}
            className="icon-btn" aria-label={searchOpen ? 'Submit search' : 'Open search'} style={{ padding: '6px' }}>
            <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: '20px' }}>search</span>
          </button>
        </form>
        <Link to="/checkout" className="icon-btn" style={{ position: 'relative' }} aria-label={totalItems === 0 ? "Shopping cart, empty" : `Shopping cart, ${totalItems} item${totalItems === 1 ? '' : 's'}`}>
          <span className="material-symbols-outlined" aria-hidden="true">shopping_bag</span>
          {totalItems > 0 && (
            <span style={{ 
              position: 'absolute', top: '-4px', right: '-4px', backgroundColor: 'var(--primary)', color: 'white',
              borderRadius: '50%', width: '18px', height: '18px', fontSize: '10px', display: 'flex',
              alignItems: 'center', justifyContent: 'center', fontWeight: 'bold'
            }} aria-hidden="true">
              {totalItems}
            </span>
          )}
        </Link>
      </div>
    </header>
  );
}
