import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { InventoryItem, ShowroomFeatured } from '../../types';

function getFeaturedProduct(item: ShowroomFeatured, inventoryMap: Map<string, InventoryItem>) {
  const config = inventoryMap.get(item.productName);
  if (!config) return null;
  const stainName = item.stainName || 'Natural';
  const stain = config.stains.find(s => s.name === stainName && s.inStock) || config.stains.find(s => s.inStock);
  if (!stain) {
    return { ...config, stain: null, displayImage: config.stains[0]?.image || null, displayPrice: config.basePrice, displayStainName: '' };
  }
  return {
    ...config,
    stain,
    displayImage: stain.gallery?.[0]?.url || stain.image || null,
    displayPrice: config.basePrice + (stain.priceAddition || 0),
    displayStainName: stain.name,
  };
}

interface Props {
  featured: ShowroomFeatured[];
  inventory: InventoryItem[];
}

export default function FeaturedGrid({ featured, inventory }: Props) {
  const navigate = useNavigate();

  const inventoryMap = useMemo(() => {
    const map = new Map<string, InventoryItem>();
    for (const item of inventory) {
      if (!map.has(item.productName)) {
        map.set(item.productName, item);
      }
    }
    return map;
  }, [inventory]);

  const resolved = featured.length > 0
    ? featured
    : inventory.length > 0
      ? [...new Map(inventory.map(i => [i.productName, i])).values()].slice(0, 8).map(i => ({
          productName: i.productName,
          stainName: undefined,
        }))
      : [];

  if (resolved.length === 0) return null;

  return (
    <section className="featured-section" style={{ paddingTop: '48px' }}>
      <div style={{ textAlign: 'center', marginBottom: '48px' }}>
        <span className="label-caps text-secondary">Curated Collection</span>
        <h2 className="headline-xl text-primary" style={{ marginTop: '8px' }}>Featured Cribs</h2>
      </div>
      <div className="featured-grid">
        {resolved.map((item, i) => {
          const product = getFeaturedProduct(item, inventoryMap);

          return (
            <div
              key={i}
              className="featured-card"
              onClick={() => {
                if (!product) return;
                const params = new URLSearchParams();
                if (product.displayStainName) params.set('stain', product.displayStainName);
                navigate(`/product/${product.slug || item.productName}?${params.toString()}`);
              }}
              style={!product ? { border: '2px dashed var(--error)', minHeight: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' } : {}}
            >
              {!product ? (
                <div style={{ textAlign: 'center', padding: '20px' }}>
                  <p style={{ color: 'var(--error)' }}>"{item.productName}" not found</p>
                </div>
              ) : (
                <>
                  <div className="featured-card-img">
                    {product.displayImage ? (
                      <img src={product.displayImage} alt={item.productName} />
                    ) : (
                      <div style={{ color: 'var(--outline-variant)', fontSize: '14px' }}>No Image</div>
                    )}
                  </div>
                  <div className="featured-card-body">
                    <h3>{item.productName}</h3>
                    <p className="price">${product.displayPrice.toLocaleString()}</p>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
