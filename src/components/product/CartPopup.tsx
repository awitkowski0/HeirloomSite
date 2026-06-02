import { Link } from 'react-router-dom';

interface Props {
  productName: string;
  wood: string;
  stain: string;
  onClose: () => void;
}

export default function CartPopup({ productName, wood, stain, onClose }: Props) {
  return (
    <div className="cart-popup-overlay" onClick={onClose}>
      <div className="cart-popup-content" onClick={e => e.stopPropagation()}>
        <span className="material-symbols-outlined" style={{ fontSize: '48px', color: 'var(--primary)', marginBottom: '16px' }}>check_circle</span>
        <h2 className="headline-md" style={{ marginBottom: '8px' }}>Added to Cart!</h2>
        <p className="body-md text-on-surface-variant" style={{ marginBottom: '32px' }}>
          {productName} — {wood.replace(/([A-Z])/g, ' $1').trim()} / {stain}
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <Link to="/checkout" className="add-to-cart" style={{ width: '100%', padding: '14px 0', textAlign: 'center', textDecoration: 'none' }}>
            Go to Cart
          </Link>
          <button onClick={onClose} style={{ background: 'none', border: '1px solid var(--outline-variant)', borderRadius: '8px', padding: '14px', cursor: 'pointer', color: 'var(--on-surface)', fontSize: '14px', fontWeight: 600, letterSpacing: '0.08em' }}>
            Continue Shopping
          </button>
        </div>
      </div>
    </div>
  );
}
