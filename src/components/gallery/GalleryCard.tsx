import { useNavigate } from 'react-router-dom';
import posthog from 'posthog-js';

interface ProductInfo {
  id: string;
  name: string;
  minPrice: number;
  woods: string[];
  woodStains: Record<string, Array<{ name: string; image?: string; priceAddition: number; inStock: boolean }>>;
  displayImage: string;
  displayPrice: number;
  displayWood: string;
  hasActiveSelection: boolean;
}

interface Props {
  product: ProductInfo;
  isExpanded: boolean;
  onExpand: () => void;
  onCarouselOpen: () => void;
}

export default function GalleryCard({ product, isExpanded, onExpand, onCarouselOpen }: Props) {
  const navigate = useNavigate();

  const handleClick = () => {
    const isMobile = window.innerWidth < 768;
    if (isMobile) {
      if (!isExpanded) {
        onExpand();
        return;
      }
      onExpand();
      onCarouselOpen();
      return;
    }
    posthog.capture('product_click', { productName: product.name, source: 'card' });
    navigate(`/product/${product.id}`);
  };

  return (
    <div className="product-card-wrapper" onClick={handleClick} style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column' }}>
      <div className="product-card">
        <div className="product-card-img-wrap">
          {product.displayImage ? (
            <img key={product.displayWood + (product.hasActiveSelection ? 'active' : 'all')} src={product.displayImage} alt={product.name}
              style={{ width: '100%', height: '100%', objectFit: 'contain', filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.1))' }} />
          ) : (
            <div style={{ color: 'var(--outline-variant)' }}>Image Unavailable</div>
          )}
        </div>

        <div className={`product-info-overlay ${isExpanded ? 'visible' : ''}`}>
          <h3 className="headline-md" style={{ color: 'var(--primary)', marginBottom: '4px' }}>{product.name}</h3>
          <p className="body-md" style={{ color: 'var(--on-surface-variant)', fontWeight: '500' }}>
            {product.hasActiveSelection ? `$${product.displayPrice.toLocaleString()}` : `From $${product.minPrice.toLocaleString()}`}
          </p>
          {isExpanded && (
            <div className="gallery-card-details" style={{ marginTop: '8px' }}>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {product.woods.slice(0, 4).map(w => (
                  <span key={w} style={{ fontSize: '9px', fontFamily: 'var(--font-label)', letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--on-surface-variant)', padding: '2px 8px', border: '1px solid var(--outline-variant)', borderRadius: '4px' }}>
                    {w.replace(/([A-Z])/g, ' $1').trim()}
                  </span>
                ))}
                {product.woods.length > 4 && <span style={{ fontSize: '9px', color: 'var(--outline)' }}>+{product.woods.length - 4}</span>}
              </div>
            </div>
          )}
        </div>

        <div className="view-details-btn" onClick={e => {
          e.stopPropagation();
          posthog.capture('product_click', { productName: product.name, source: 'view_details' });
          navigate(`/product/${product.id}`);
        }}>
          <span className="label-caps" style={{ color: 'var(--primary)', letterSpacing: '0.1em' }}>View Details</span>
          <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--primary)' }}>arrow_forward</span>
        </div>
      </div>

      <div className="product-card-text" style={{ padding: '24px 8px 0' }}>
        <h3 className="headline-lg text-primary" style={{ fontSize: '28px', marginBottom: '8px' }}>{product.name}</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ height: '1px', width: '24px', backgroundColor: 'var(--primary)', opacity: 0.2 }} />
          <p className="body-lg" style={{ color: 'var(--primary)', fontWeight: '500' }}>
            {product.hasActiveSelection ? `$${product.displayPrice.toLocaleString()}` : `From $${product.minPrice.toLocaleString()}`}
          </p>
          <div style={{ height: '1px', width: '24px', backgroundColor: 'var(--primary)', opacity: 0.2 }} />
        </div>
      </div>
    </div>
  );
}
