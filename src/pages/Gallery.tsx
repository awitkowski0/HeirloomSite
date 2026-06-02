import { useState, useMemo } from 'react';
import { useContent } from '../useContent';
import { WoodFilter, StainFilter } from '../components/gallery/GalleryFilters';
import GalleryCard from '../components/gallery/GalleryCard';
import GalleryCarousel from '../components/gallery/GalleryCarousel';

export default function Gallery() {
  const { inventory, loading } = useContent();

  const [selectedWood, setSelectedWood] = useState('All Collections');
  const [selectedStain, setSelectedStain] = useState('All Stains');
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);
  const [carouselProduct, setCarouselProduct] = useState<string | null>(null);

  const { products, allWoods, allStains } = useMemo(() => {
    const uniqueMap = new Map<string, {
      id: string; name: string; minPrice: number; woods: string[];
      woodStains: Record<string, Array<{ name: string; image?: string; priceAddition: number; inStock: boolean }>>;
    }>();

    inventory.forEach(item => {
      const pName = item.productName;
      const existing = uniqueMap.get(pName);
      if (existing) {
        if (item.basePrice < existing.minPrice) existing.minPrice = item.basePrice;
        if (!existing.woods.includes(item.wood)) existing.woods.push(item.wood);
        if (!existing.woodStains[item.wood]) {
          existing.woodStains[item.wood] = item.stains.map(s => ({
            name: s.name, image: s.image, priceAddition: s.priceAddition, inStock: s.inStock,
          }));
        }
      } else {
        uniqueMap.set(pName, {
          id: encodeURIComponent(pName), name: pName, minPrice: item.basePrice,
          woods: [item.wood],
          woodStains: { [item.wood]: item.stains.map(s => ({
            name: s.name, image: s.image, priceAddition: s.priceAddition, inStock: s.inStock,
          })) },
        });
      }
    });

    const woodSet = new Set(inventory.map(i => i.wood));
    const stainPool = selectedWood === 'All Collections' ? inventory : inventory.filter(i => i.wood === selectedWood);
    const stainSet = new Set<string>();
    stainPool.forEach(i => i.stains.forEach(s => stainSet.add(s.name)));

    return {
      products: Array.from(uniqueMap.values()),
      allWoods: Array.from(woodSet),
      allStains: Array.from(stainSet),
    };
  }, [inventory, selectedWood]);

  const carouselProductData = carouselProduct
    ? products.find(p => p.id === carouselProduct) ?? null
    : null;

  const getDisplayConfig = (productName: string) => {
    const configs = inventory.filter(i => i.productName === productName);
    let config = configs[0];
    if (selectedWood !== 'All Collections') {
      config = configs.find(c => c.wood === selectedWood) || config;
    }
    let stain = config.stains.find(s => s.inStock);
    if (selectedStain !== 'All Stains') {
      stain = config.stains.find(s => s.name === selectedStain && s.inStock) || stain;
    }
    return { config, stain };
  };

  if (loading) {
    return (
      <div className="container" style={{ padding: '120px 24px', textAlign: 'center', minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid var(--outline-variant)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: 'var(--white)', minHeight: '100vh' }}>
      <div className="container gallery-header" style={{ paddingTop: '8px', paddingBottom: '48px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          <WoodFilter
            woods={allWoods}
            selected={selectedWood}
            onSelect={w => { setSelectedWood(w); setSelectedStain('All Stains'); }}
            onReset={() => { setSelectedWood('All Collections'); setSelectedStain('All Stains'); }}
          />
          {selectedWood !== 'All Collections' && (
            <StainFilter stains={allStains} selected={selectedStain} onSelect={s => setSelectedStain(selectedStain === s ? 'All Stains' : s)} />
          )}
        </div>
      </div>

      <div className="container" style={{ padding: '0 24px' }}>
        <div className="gallery-grid">
          {products.map(p => {
            const { config, stain } = getDisplayConfig(p.name);
            const hasActiveSelection = selectedWood !== 'All Collections' || selectedStain !== 'All Stains';

            return (
              <GalleryCard
                key={p.id}
                product={{
                  ...p,
                  displayImage: stain?.image || p.woodStains[p.woods[0]]?.[0]?.image || '',
                  displayPrice: config ? config.basePrice + (stain?.priceAddition || 0) : p.minPrice,
                  displayWood: config ? config.wood : p.woods[0],
                  hasActiveSelection,
                }}
                isExpanded={expandedProduct === p.id}
                onExpand={() => setExpandedProduct(expandedProduct === p.id ? null : p.id)}
                onCarouselOpen={() => { setExpandedProduct(null); setCarouselProduct(p.id); }}
              />
            );
          })}
        </div>
      </div>

      {carouselProductData && (
        <GalleryCarousel product={carouselProductData} onClose={() => setCarouselProduct(null)} />
      )}
    </div>
  );
}
