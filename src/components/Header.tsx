import { Link, NavLink } from 'react-router-dom';
import { useCart } from '../context/useCart';
import SearchBar from './SearchBar';

export default function Header() {
  const { totalItems } = useCart();

  return (
    <header className="app-header">
      <div className="header-left">
        <Link to="/" className="brand-title">
          <img src="/logo-wide.png" alt="Heirloom Cribs and More" style={{ height: '36px', width: 'auto', display: 'block' }} />
        </Link>
        <nav className="nav-links" aria-label="Main navigation">
          <NavLink to="/" end className="nav-link">Showroom</NavLink>
          <NavLink to="/gallery" className="nav-link">Gallery</NavLink>
          <NavLink to="/products" className="nav-link">Products</NavLink>
          <NavLink to="/contact" className="nav-link">Contact</NavLink>
        </nav>
      </div>
      <div className="header-right" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <SearchBar />
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
