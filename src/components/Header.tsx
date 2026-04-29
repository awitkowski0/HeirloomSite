import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';

export default function Header() {
  const { totalItems } = useCart();

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
        <Link to="/checkout" className="icon-btn" style={{ position: 'relative' }}>
          <span className="material-symbols-outlined">shopping_bag</span>
          {totalItems > 0 && (
            <span style={{ 
              position: 'absolute', 
              top: '-4px', 
              right: '-4px', 
              backgroundColor: 'var(--primary)', 
              color: 'white', 
              borderRadius: '50%', 
              width: '18px', 
              height: '18px', 
              fontSize: '10px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              fontWeight: 'bold'
            }}>
              {totalItems}
            </span>
          )}
        </Link>
      </div>
    </header>
  );
}
