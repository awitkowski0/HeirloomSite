import { NavLink } from 'react-router-dom';
import { useCart } from '../context/useCart';
import MobileSearch from './MobileSearch';

export default function BottomNav() {
  const { totalItems } = useCart();

  return (
    <nav className="bottom-nav" aria-label="Primary">
      <NavLink to="/" end className="nav-item">
        <span className="material-symbols-outlined" aria-hidden="true">store</span>
        <span className="nav-label">Showroom</span>
      </NavLink>
      <NavLink to="/gallery" className="nav-item">
        <span className="material-symbols-outlined" aria-hidden="true">photo_library</span>
        <span className="nav-label">Gallery</span>
      </NavLink>
      <NavLink to="/products" className="nav-item">
        <span className="material-symbols-outlined" aria-hidden="true">collections_bookmark</span>
        <span className="nav-label">Products</span>
      </NavLink>
      <MobileSearch />
      <NavLink to="/contact" className="nav-item">
        <span className="material-symbols-outlined" aria-hidden="true">mail</span>
        <span className="nav-label">Contact</span>
      </NavLink>
      <NavLink
        to="/checkout"
        className="nav-item"
        aria-label={totalItems === 0 ? 'Cart, empty' : `Cart, ${totalItems} item${totalItems === 1 ? '' : 's'}`}
      >
        <span className="nav-item-icon">
          <span className="material-symbols-outlined" aria-hidden="true">shopping_bag</span>
          {totalItems > 0 && (
            <span className="nav-badge" aria-hidden="true">{totalItems > 99 ? '99+' : totalItems}</span>
          )}
        </span>
        <span className="nav-label">Cart</span>
      </NavLink>
    </nav>
  );
}
