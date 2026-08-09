import { useNavigate } from 'react-router-dom';
import posthog from 'posthog-js';
import { getStainColor } from '../../utils/stainColors';

interface CarouselProduct {
  id: string;
  name: string;
  woods: string[];
  woodStains: Record<string, Array<{ name: string; image?: string; priceAddition: number; inStock: boolean }>>;
}

interface Props {
  product: CarouselProduct;
  onClose: () => void;
}

export default function GalleryCarousel({ product, onClose }: Props) {
  const navigate = useNavigate();

  const woods = product.woods;
  const initialWood = woods[0] || '';
  const initialStains = product.woodStains[initialWood] || [];

  const handleViewDetails = () => {
    posthog.capture('product_selected', { product_name: product.name, source: 'gallery_carousel' });
    navigate(`/product/${product.id}`);
  };

  return (
    <div className="gallery-carousel-overlay" onClick={onClose}>
      <div className="gallery-carousel-content" onClick={e => e.stopPropagation()}>
        <button className="gallery-carousel-close" aria-label="Close gallery" onClick={onClose}>
          <span className="material-symbols-outlined">close</span>
        </button>

        <div className="gallery-carousel-image-wrap">
          {initialStains[0]?.image ? (
            <img src={initialStains[0].image} alt={product.name} />
          ) : (
            <div style={{ color: 'var(--outline-variant)' }}>Image Unavailable</div>
          )}
        </div>

        <div className="gallery-carousel-controls">
          <h2 className="headline-md" style={{ color: 'var(--primary)', marginBottom: '4px' }}>{product.name}</h2>
          <p className="body-lg" style={{ color: 'var(--on-surface-variant)', fontWeight: '500', marginBottom: '12px' }}>
            ${(product.woodStains[initialWood]?.[0]?.priceAddition || 0).toLocaleString()}
          </p>

          {product.woods.length > 1 && (
            <div style={{ marginBottom: '12px' }}>
              <p className="label-caps" style={{ color: 'var(--outline)', marginBottom: '6px' }}>Wood</p>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {product.woods.map(w => (
                  <button key={w} className={`wood-chip ${w === initialWood ? 'selected' : ''}`}>
                    {w.replace(/([A-Z])/g, ' $1').trim()}
                  </button>
                ))}
              </div>
            </div>
          )}

          {initialStains.length > 1 && (
            <div style={{ marginBottom: '16px' }}>
              <p className="label-caps" style={{ color: 'var(--outline)', marginBottom: '6px' }}>Stain</p>
              <div className="stain-strip-mobile" style={{ display: 'flex' }}>
                {initialStains.map(s => (
                  <button key={s.name} className="stain-strip-swatch">
                    <div className="stain-swatch" style={{ backgroundColor: getStainColor(s.name) }} />
                  </button>
                ))}
              </div>
            </div>
          )}

          <button className="gallery-carousel-cta" onClick={handleViewDetails}>
            <span className="label-caps">View Details</span>
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>arrow_forward</span>
          </button>
        </div>
      </div>
    </div>
  );
}
