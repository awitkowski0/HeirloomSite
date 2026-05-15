import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import posthog from 'posthog-js';

const STAIN_COLORS: Record<string, string> = {
  natural: '#D2B48C',
  espresso: '#3E2723',
  white: '#F5F5F0',
  grey: '#9E9E9E',
  gray: '#9E9E9E',
  walnut: '#5D4037',
  cherry: '#8B4513',
  maple: '#F5DEB3',
  oak: '#C4A882',
  black: '#212121',
  navy: '#1A237E',
  antique: '#8B7355',
  driftwood: '#A68B6B',
  weathered: '#8B8378',
  pearl: '#F8F8F6',
  cream: '#FFFDD0',
  sage: '#9CAF88',
  charcoal: '#36454F',
  cognac: '#9A4B2E',
  rust: '#8B3A2E',
  honey: '#D4956A',
  mocha: '#6B3A2E',
};

function getStainColor(name: string): string {
  const n = name.toLowerCase();
  for (const [key, color] of Object.entries(STAIN_COLORS)) {
    if (n.includes(key)) return color;
  }
  return '#8B4513';
}

export default function Gallery() {
  const navigate = useNavigate();
  const inventoryData = useQuery(api.inventory.get as any, {});
  const loading = inventoryData === undefined;
  const inventory: any[] = inventoryData || [];
  
  const [selectedWood, setSelectedWood] = useState<string>('All Collections');
  const [selectedStain, setSelectedStain] = useState<string>('All Stains');
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);
  const [carouselProduct, setCarouselProduct] = useState<string | null>(null);
  const [carouselWood, setCarouselWood] = useState<string>('');
  const [carouselStainIndex, setCarouselStainIndex] = useState<number>(0);

  if (loading) return (
    <div className="container" style={{ padding: '120px 24px', textAlign: 'center', minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
         <div style={{ width: '40px', height: '40px', border: '3px solid var(--outline-variant)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
         <p className="label-caps text-on-surface-variant">Curating Collections...</p>
      </div>
      <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
    </div>
  );

  // Aggregate by product name
  const uniqueCribsMap = new Map();
  inventory.forEach(item => {
    const pName = item.productName ?? item.cribName;
    const cribId = encodeURIComponent(pName);
    if (!uniqueCribsMap.has(pName)) {
      const woodStains: Record<string, any[]> = {};
      woodStains[item.wood] = item.stains.map((s: any) => ({
        name: s.name, image: s.image, priceAddition: s.priceAddition, inStock: s.inStock,
      }));
      uniqueCribsMap.set(pName, {
        id: cribId,
        name: pName,
        minPrice: item.basePrice,
        material: item.wood.replace(/([A-Z])/g, ' $1').trim(),
        img: item.stains[0]?.image,
        woods: [item.wood],
        woodStains,
      });
    } else {
      const existing = uniqueCribsMap.get(pName);
      if (item.basePrice < existing.minPrice) existing.minPrice = item.basePrice;
      if (!existing.woods.includes(item.wood)) existing.woods.push(item.wood);
      if (!existing.woodStains[item.wood]) {
        existing.woodStains[item.wood] = item.stains.map((s: any) => ({
          name: s.name, image: s.image, priceAddition: s.priceAddition, inStock: s.inStock,
        }));
      }
    }
  });

  const products = Array.from(uniqueCribsMap.values());
  const allWoods = Array.from(new Set(inventory.map(i => i.wood)));

  const allStains = (() => {
    const pool = selectedWood === 'All Collections' ? inventory : inventory.filter(i => i.wood === selectedWood);
    const names = new Set<string>();
    pool.forEach(i => i.stains.forEach((s: any) => names.add(s.name)));
    return Array.from(names);
  })();

  const getDisplayConfig = (productName: string) => {
    const configs = inventory.filter((i: any) => (i.productName ?? i.cribName) === productName);
    let config = configs[0];
    if (selectedWood !== 'All Collections') {
      config = configs.find(c => c.wood === selectedWood) || config;
    }
    let stain = config.stains.find((s: any) => s.inStock);
    if (selectedStain !== 'All Stains') {
      stain = config.stains.find((s: any) => s.name === selectedStain && s.inStock) || stain;
    }
    return { config, stain };
  };

  // Carousel helpers
  const carouselProductData = carouselProduct ? products.find(p => p.id === carouselProduct) : null;
  const carouselConfigs = carouselProductData
    ? inventory.filter((i: any) => encodeURIComponent(i.productName ?? i.cribName) === carouselProduct)
    : [];
  const effectiveCarouselWood = carouselWood || (carouselProductData?.woods[0] ?? '');
  const carouselStains = carouselProductData?.woodStains?.[effectiveCarouselWood] || [];
  const effectiveCarouselStain = carouselStains[carouselStainIndex] || carouselStains[0] || {};
  const carouselConfig = carouselConfigs.find((c: any) => c.wood === effectiveCarouselWood) || carouselConfigs[0] || {};
  const carouselPrice = (Number(carouselConfig.basePrice) || 0) + (Number(effectiveCarouselStain.priceAddition) || 0);

  return (
    <div style={{ backgroundColor: 'var(--surface-bright)', minHeight: '100vh' }}>
      <div className="container gallery-header" style={{ paddingTop: '8px', paddingBottom: '48px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          <div className="filter-pills">
            <button 
              style={{
                padding: '12px 24px',
                borderRadius: '100px',
                border: 'none',
                background: selectedWood === 'All Collections' ? 'var(--primary)' : 'transparent',
                color: selectedWood === 'All Collections' ? 'var(--on-primary)' : 'var(--on-surface-variant)',
                fontFamily: 'var(--font-label)',
                fontSize: '12px',
                fontWeight: '700',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
              onClick={() => { setSelectedWood('All Collections'); setSelectedStain('All Stains'); }}
            >
              Our Cribs
            </button>
            
            <div style={{ width: '1px', height: '24px', backgroundColor: 'var(--outline-variant)' }} />

            {allWoods.map(w => (
              <button 
                key={w as string}
                style={{
                  padding: '12px 24px',
                  borderRadius: '100px',
                  border: 'none',
                  background: selectedWood === w ? 'var(--primary)' : 'transparent',
                  color: selectedWood === w ? 'var(--on-primary)' : 'var(--on-surface-variant)',
                  fontFamily: 'var(--font-label)',
                  fontSize: '12px',
                  fontWeight: '700',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
                onClick={() => { setSelectedWood(w as string); setSelectedStain('All Stains'); }}
              >
                {(w as string).replace(/([A-Z])/g, ' $1').trim()}
              </button>
            ))}
          </div>

          {selectedWood !== 'All Collections' && allStains.length > 0 && (
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center', 
              gap: '8px', 
              flexWrap: 'wrap',
            }}>
              {allStains.map(stain => (
                <button 
                  key={stain}
                  style={{
                    padding: '8px 20px',
                    borderRadius: '100px',
                    border: '1px solid var(--outline-variant)',
                    background: selectedStain === stain ? 'var(--secondary-container)' : 'transparent',
                    color: selectedStain === stain ? 'var(--on-secondary-container)' : 'var(--on-surface-variant)',
                    fontFamily: 'var(--font-label)',
                    fontSize: '11px',
                    fontWeight: '600',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onClick={() => setSelectedStain(selectedStain === stain ? 'All Stains' : stain)}
                >
                  {stain}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Premium Product Grid */}
      <div className="container" style={{ padding: '0 24px' }}>
        <div className="gallery-grid">
          {products.map(p => {
            const { config, stain } = getDisplayConfig(p.name);
            const displayImage = stain?.image || p.img;
            const displayPrice = config ? config.basePrice + (stain?.priceAddition || 0) : p.minPrice;
            const displayWood = config ? config.wood : p.woods[0];
            const hasActiveSelection = selectedWood !== 'All Collections' || selectedStain !== 'All Stains';
            const isExpanded = expandedProduct === p.id;

            return (
            <div 
              key={p.id}
              className="product-card-wrapper"
              onClick={() => {
                if (window.innerWidth < 768) {
                  if (!isExpanded) {
                    setExpandedProduct(p.id);
                    return;
                  }
                  setExpandedProduct(null);
                  setCarouselProduct(p.id);
                  setCarouselWood(displayWood);
                  setCarouselStainIndex(0);
                  return;
                }
                posthog.capture('product_click', { productName: p.name, wood: selectedWood, stain: selectedStain, source: 'card' });
                const params = new URLSearchParams();
                if (selectedWood !== 'All Collections') params.set('wood', selectedWood);
                if (selectedStain !== 'All Stains') params.set('stain', selectedStain);
                const qs = params.toString();
                navigate(`/product/${p.id}${qs ? `?${qs}` : ''}`);
              }}
              style={{ 
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              <div className="product-card">
                
                {/* Image */}
                <div className="product-card-img-wrap">
                  {displayImage ? (
                    <img key={selectedWood + selectedStain} src={displayImage} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'contain', filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.1))' }} />
                  ) : (
                    <div style={{ color: 'var(--outline-variant)' }}>Image Unavailable</div>
                  )}
                </div>

                {/* Mobile: Name overlay on tap */}
                <div className={`product-info-overlay ${isExpanded ? 'visible' : ''}`}>
                  <h3 className="headline-md" style={{ color: 'var(--primary)', marginBottom: '4px' }}>
                    {p.name}
                  </h3>
                  <p className="body-md" style={{ color: 'var(--on-surface-variant)', fontWeight: '500' }}>
                    {hasActiveSelection ? `$${displayPrice.toLocaleString()}` : `From $${p.minPrice.toLocaleString()}`}
                  </p>
                  {isExpanded && (
                    <div className="gallery-card-details" style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {p.woods.slice(0, 4).map((w: string) => (
                          <span key={w} style={{
                            fontSize: '9px',
                            fontFamily: 'var(--font-label)',
                            letterSpacing: '0.05em',
                            textTransform: 'uppercase',
                            color: 'var(--on-surface-variant)',
                            padding: '2px 8px',
                            border: '1px solid var(--outline-variant)',
                            borderRadius: '4px',
                          }}>
                            {w.replace(/([A-Z])/g, ' $1').trim()}
                          </span>
                        ))}
                        {p.woods.length > 4 && <span style={{ fontSize: '9px', color: 'var(--outline)' }}>+{p.woods.length - 4}</span>}
                      </div>
                      {p.woodStains && p.woods.length > 0 && (
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          {(p.woodStains[p.woods[0]] || []).slice(0, 6).map((s: any) => (
                            <div key={s.name} style={{
                              width: '14px',
                              height: '14px',
                              borderRadius: '50%',
                              backgroundColor: getStainColor(s.name),
                              border: '1px solid var(--outline-variant)',
                              flexShrink: 0,
                            }} title={s.name} />
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Floating View Details Button */}
                <div className="view-details-btn" onClick={(e) => {
                  e.stopPropagation();
                  posthog.capture('product_click', { productName: p.name, wood: selectedWood, stain: selectedStain, source: 'view_details' });
                  const params = new URLSearchParams();
                  if (selectedWood !== 'All Collections') params.set('wood', selectedWood);
                  if (selectedStain !== 'All Stains') params.set('stain', selectedStain);
                  const qs = params.toString();
                  navigate(`/product/${p.id}${qs ? `?${qs}` : ''}`);
                }}>
                  <span className="label-caps" style={{ color: 'var(--primary)', letterSpacing: '0.1em' }}>View Details</span>
                  <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--primary)' }}>arrow_forward</span>
                </div>
              </div>

              {/* Desktop text section (hidden on mobile) */}
              <div className="product-card-text" style={{ padding: '24px 8px 0' }}>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                  {hasActiveSelection ? (
                     <span key={displayWood} style={{ 
                       fontSize: '10px', 
                       fontFamily: 'var(--font-label)',
                       letterSpacing: '0.05em',
                       textTransform: 'uppercase',
                       color: 'var(--on-surface-variant)',
                       padding: '4px 8px',
                       border: '1px solid var(--outline-variant)',
                       borderRadius: '4px'
                     }}>
                       {displayWood.replace(/([A-Z])/g, ' $1').trim()}
                       {selectedStain !== 'All Stains' && <span> / {selectedStain}</span>}
                     </span>
                  ) : (
                    p.woods.slice(0, 3).map((w: string) => (
                     <span key={w} style={{ 
                       fontSize: '10px', 
                       fontFamily: 'var(--font-label)',
                       letterSpacing: '0.05em',
                       textTransform: 'uppercase',
                       color: 'var(--on-surface-variant)',
                       padding: '4px 8px',
                       border: '1px solid var(--outline-variant)',
                       borderRadius: '4px'
                     }}>
                       {w.replace(/([A-Z])/g, ' $1').trim()}
                     </span>
                    ))
                  )}
                  {!hasActiveSelection && p.woods.length > 3 && <span style={{ fontSize: '10px', color: 'var(--outline)' }}>+{p.woods.length - 3}</span>}
                </div>
                
                <h3 className="headline-lg text-primary" style={{ fontSize: '28px', marginBottom: '8px' }}>
                  {p.name}
                </h3>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ height: '1px', width: '24px', backgroundColor: 'var(--primary)', opacity: 0.2 }} />
                  <p className="body-lg" style={{ color: 'var(--primary)', fontWeight: '500' }}>
                    {hasActiveSelection ? `$${displayPrice.toLocaleString()}` : `From $${p.minPrice.toLocaleString()}`}
                  </p>
                  <div style={{ height: '1px', width: '24px', backgroundColor: 'var(--primary)', opacity: 0.2 }} />
                </div>
              </div>
            </div>
            );
          })}
        </div>
      </div>

      {/* Mobile Carousel Overlay */}
      {carouselProduct && carouselProductData && (
        <div className="gallery-carousel-overlay" onClick={() => setCarouselProduct(null)}>
          <div className="gallery-carousel-content" onClick={(e) => e.stopPropagation()}>
            {/* Close */}
            <button className="gallery-carousel-close" aria-label="Close gallery" onClick={() => setCarouselProduct(null)}>
              <span className="material-symbols-outlined">close</span>
            </button>

            {/* Image */}
            <div className="gallery-carousel-image-wrap">
              {effectiveCarouselStain?.image ? (
                <img
                  key={effectiveCarouselWood + (effectiveCarouselStain?.name || '')}
                  src={effectiveCarouselStain.image}
                  alt={carouselProductData.name}
                />
              ) : (
                <div style={{ color: 'var(--outline-variant)', fontSize: '14px' }}>Image Unavailable</div>
              )}

              {carouselStains.length > 1 && (
                <>
                  <button
                    className="gallery-carousel-arrow left"
                    aria-label="Previous stain"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCarouselStainIndex(i => (i - 1 + carouselStains.length) % carouselStains.length);
                    }}
                  >
                    <span className="material-symbols-outlined">chevron_left</span>
                  </button>
                  <button
                    className="gallery-carousel-arrow right"
                    aria-label="Next stain"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCarouselStainIndex(i => (i + 1) % carouselStains.length);
                    }}
                  >
                    <span className="material-symbols-outlined">chevron_right</span>
                  </button>
                </>
              )}

              {/* Stain dots indicator */}
              {carouselStains.length > 1 && (
                <div className="gallery-carousel-dots">
                  {carouselStains.map((_: any, i: number) => (
                    <div key={i} className={`dot ${i === carouselStainIndex ? 'active' : ''}`} />
                  ))}
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="gallery-carousel-controls">
              <h2 className="headline-md" style={{ color: 'var(--primary)', marginBottom: '4px' }}>
                {carouselProductData.name}
              </h2>
              <p className="body-lg" style={{ color: 'var(--on-surface-variant)', fontWeight: '500', marginBottom: '12px' }}>
                ${carouselPrice.toLocaleString()}
              </p>

              {/* Wood chips */}
              {carouselProductData.woods.length > 1 && (
                <div style={{ marginBottom: '12px' }}>
                  <p className="label-caps" style={{ color: 'var(--outline)', marginBottom: '6px' }}>Wood</p>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {carouselProductData.woods.map((w: string) => (
                      <button
                        key={w}
                        className={`wood-chip ${w === effectiveCarouselWood ? 'selected' : ''}`}
                        onClick={() => {
                          setCarouselWood(w);
                          setCarouselStainIndex(0);
                        }}
                      >
                        {w.replace(/([A-Z])/g, ' $1').trim()}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Stain swatches */}
              {carouselStains.length > 1 && (
                <div style={{ marginBottom: '16px' }}>
                  <p className="label-caps" style={{ color: 'var(--outline)', marginBottom: '6px' }}>Stain</p>
                  <div className="stain-strip-mobile" style={{ display: 'flex' }}>
                    {carouselStains.map((s: any, i: number) => (
                      <button
                        key={s.name}
                        className={`stain-strip-swatch ${i === carouselStainIndex ? 'selected' : ''}`}
                        onClick={() => setCarouselStainIndex(i)}
                      >
                        <div className="stain-swatch" style={{ backgroundColor: getStainColor(s.name) }} />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* View Details */}
              <button
                className="gallery-carousel-cta"
                onClick={() => {
                  posthog.capture('product_click', { productName: carouselProductData.name, wood: effectiveCarouselWood, stain: effectiveCarouselStain?.name, source: 'carousel_cta' });
                  const params = new URLSearchParams();
                  if (effectiveCarouselWood) params.set('wood', effectiveCarouselWood);
                  if (effectiveCarouselStain?.name) params.set('stain', effectiveCarouselStain.name);
                  const qs = params.toString();
                  setCarouselProduct(null);
                  navigate(`/product/${carouselProductData.id}${qs ? `?${qs}` : ''}`);
                }}
              >
                <span className="label-caps">View Details</span>
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>arrow_forward</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
