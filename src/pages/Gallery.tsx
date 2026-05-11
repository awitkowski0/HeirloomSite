import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

export default function Gallery() {
  const navigate = useNavigate();
  const isStaged = new URLSearchParams(window.location.search).get('mode') === 'staging';
  const inventoryData = useQuery(api.inventory.get, { useStaged: isStaged });
  const loading = inventoryData === undefined;
  const inventory = inventoryData || [];
  
  const adminPassword = localStorage.getItem('adminPassword');
  const isAdmin = !!adminPassword;
  const isEditMode = isAdmin && isStaged;
  const updateCribName = useMutation(api.inventory.updateCribName);
  
  const [selectedWood, setSelectedWood] = useState<string>('All Collections');
  const [selectedStain, setSelectedStain] = useState<string>('All Stains');
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);

  if (loading) return (
    <div className="container" style={{ padding: '120px 24px', textAlign: 'center', minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
         <div style={{ width: '40px', height: '40px', border: '3px solid var(--outline-variant)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
         <p className="label-caps text-on-surface-variant">Curating Collections...</p>
      </div>
      <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
    </div>
  );

  // Aggregate by cribName
  const uniqueCribsMap = new Map();
  inventory.forEach(item => {
    const cribId = encodeURIComponent(item.cribName);
    if (!uniqueCribsMap.has(item.cribName)) {
      uniqueCribsMap.set(item.cribName, {
        id: cribId,
        name: item.cribName,
        minPrice: item.basePrice,
        material: item.wood.replace(/([A-Z])/g, ' $1').trim(),
        img: item.stains[0]?.image,
        woods: [item.wood]
      });
    } else {
      const existing = uniqueCribsMap.get(item.cribName);
      if (item.basePrice < existing.minPrice) existing.minPrice = item.basePrice;
      if (!existing.woods.includes(item.wood)) existing.woods.push(item.wood);
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

  const getDisplayConfig = (cribName: string) => {
    const configs = inventory.filter(i => i.cribName === cribName);
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

  return (
    <div style={{ backgroundColor: 'var(--surface-bright)', minHeight: '100vh', paddingBottom: '120px' }}>
      <div className="container" style={{ paddingTop: '20px', paddingBottom: '48px' }}>
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
                }
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
                </div>

                {/* Floating View Details Button */}
                <div className="view-details-btn" onClick={(e) => {
                  e.stopPropagation();
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
                
                <h3 
                  className="headline-lg text-primary" 
                  style={{ 
                    fontSize: '28px', 
                    marginBottom: '8px',
                    borderBottom: isEditMode ? '1px dashed var(--primary)' : 'none',
                    outline: 'none'
                  }}
                  contentEditable={isEditMode}
                  suppressContentEditableWarning={true}
                  onBlur={(e) => {
                    if (isEditMode && e.target.innerText !== p.name) {
                      updateCribName({ password: adminPassword!, oldName: p.name, newName: e.target.innerText });
                    }
                  }}
                  onClick={(e) => {
                    if (isEditMode) e.preventDefault();
                  }}
                >
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
    </div>
  );
}
