import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

export default function Gallery() {
  const isStaged = new URLSearchParams(window.location.search).get('mode') === 'staging';
  const inventoryData = useQuery(api.inventory.get, { useStaged: isStaged });
  const loading = inventoryData === undefined;
  const inventory = inventoryData || [];
  
  const adminPassword = localStorage.getItem('adminPassword');
  const isAdmin = !!adminPassword;
  const isEditMode = isAdmin && isStaged;
  const updateCribName = useMutation(api.inventory.updateCribName);
  
  const [selectedWood, setSelectedWood] = useState<string>('All Collections');
  const [hoveredProduct, setHoveredProduct] = useState<string | null>(null);

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

  const filteredProducts = selectedWood === 'All Collections' 
    ? products 
    : products.filter(p => p.woods.includes(selectedWood));

  return (
    <div style={{ backgroundColor: 'var(--surface-bright)', minHeight: '100vh', paddingBottom: '120px' }}>
      {/* Hero Header */}
      <div style={{ 
        position: 'relative', 
        padding: '120px 24px 80px', 
        backgroundColor: 'var(--surface-container-lowest)',
        borderBottom: '1px solid var(--surface-container-highest)',
        overflow: 'hidden'
      }}>
        {/* Subtle background element */}
        <div style={{
          position: 'absolute',
          top: '-50%', left: '50%',
          width: '100vw', height: '100vw',
          transform: 'translate(-50%, 0)',
          background: 'radial-gradient(circle, rgba(251,221,199,0.2) 0%, rgba(255,255,255,0) 70%)',
          pointerEvents: 'none',
          zIndex: 0
        }} />
        
        <div className="container" style={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: '800px' }}>
          <span className="label-caps" style={{ color: 'var(--secondary)', letterSpacing: '0.2em', marginBottom: '16px', display: 'block' }}>THE ARCHIVE</span>
          <h1 className="headline-xl text-primary" style={{ fontSize: '56px', letterSpacing: '-0.03em', lineHeight: '1.1', marginBottom: '24px' }}>
            Curated Elegance,<br/>Handcrafted for Life.
          </h1>
          <p className="body-lg text-on-surface-variant" style={{ fontSize: '20px', lineHeight: '1.6', margin: '0 auto' }}>
            Explore our defining collections. Each silhouette is a testament to timeless design and artisanal integrity, meticulously built to hold your most precious cargo for generations.
          </p>
        </div>
      </div>

      {/* Filter Section */}
      <div className="container" style={{ paddingTop: '64px', paddingBottom: '48px' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          gap: '12px', 
          flexWrap: 'wrap',
          backgroundColor: 'var(--surface-container-lowest)',
          padding: '8px',
          borderRadius: '100px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
          border: '1px solid var(--surface-container-highest)',
          width: 'fit-content',
          margin: '0 auto'
        }}>
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
            onClick={() => setSelectedWood('All Collections')}
          >
            The Full Archive
          </button>
          
          {/* Divider */}
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
              onClick={() => setSelectedWood(w as string)}
            >
              {(w as string).replace(/([A-Z])/g, ' $1').trim()}
            </button>
          ))}
        </div>
      </div>

      {/* Premium Product Grid */}
      <div className="container" style={{ padding: '0 24px' }}>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', 
          gap: '40px' 
        }}>
          {filteredProducts.map(p => (
            <Link 
              to={`/product/${p.id}`} 
              key={p.id} 
              onMouseEnter={() => setHoveredProduct(p.id)}
              onMouseLeave={() => setHoveredProduct(null)}
              style={{ 
                textDecoration: 'none', 
                color: 'inherit',
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              <div style={{ 
                backgroundColor: 'var(--surface-container-lowest)', 
                borderRadius: '16px',
                overflow: 'hidden',
                position: 'relative',
                height: '420px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '24px',
                border: '1px solid var(--surface-container-highest)',
                boxShadow: hoveredProduct === p.id 
                  ? '0 20px 40px rgba(50, 34, 20, 0.08)' 
                  : '0 4px 10px rgba(50, 34, 20, 0.02)',
                transition: 'all 0.5s cubic-bezier(0.2, 0.8, 0.2, 1)',
                transform: hoveredProduct === p.id ? 'translateY(-8px)' : 'translateY(0)'
              }}>
                
                {/* Image scaling effect */}
                <div style={{
                  width: '100%', height: '100%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transform: hoveredProduct === p.id ? 'scale(1.05)' : 'scale(1)',
                  transition: 'transform 0.7s cubic-bezier(0.2, 0.8, 0.2, 1)',
                }}>
                  {p.img ? (
                    <img src={p.img} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'contain', filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.1))' }} />
                  ) : (
                    <div style={{ color: 'var(--outline-variant)' }}>Image Unavailable</div>
                  )}
                </div>

                {/* Floating View Details Button */}
                <div style={{
                  position: 'absolute',
                  bottom: '24px', left: '50%',
                  transform: `translate(-50%, ${hoveredProduct === p.id ? '0' : '20px'})`,
                  opacity: hoveredProduct === p.id ? 1 : 0,
                  transition: 'all 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)',
                  backgroundColor: 'rgba(255, 255, 255, 0.9)',
                  backdropFilter: 'blur(8px)',
                  padding: '12px 24px',
                  borderRadius: '100px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <span className="label-caps" style={{ color: 'var(--primary)', letterSpacing: '0.1em' }}>View Details</span>
                  <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--primary)' }}>arrow_forward</span>
                </div>
              </div>

              <div style={{ padding: '24px 8px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                  {p.woods.slice(0, 3).map((w: string) => (
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
                  ))}
                  {p.woods.length > 3 && <span style={{ fontSize: '10px', color: 'var(--outline)' }}>+{p.woods.length - 3}</span>}
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
                    From ${p.minPrice.toLocaleString()}
                  </p>
                  <div style={{ height: '1px', width: '24px', backgroundColor: 'var(--primary)', opacity: 0.2 }} />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
