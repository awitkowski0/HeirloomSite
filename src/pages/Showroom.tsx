import { useState } from 'react';
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useNavigate } from 'react-router-dom';

export default function Showroom() {
  const navigate = useNavigate();
  const showroomData = useQuery(api.showroom.get);
  const saveShowroom = useMutation(api.showroom.save);
  
  const adminPassword = localStorage.getItem('adminPassword');
  const isAdmin = !!adminPassword;
  const isStaged = new URLSearchParams(window.location.search).get('mode') === 'staging';
  const isEditMode = isAdmin && isStaged;

  const [hoveredSpot, setHoveredSpot] = useState<number | null>(null);

  const handleImageClick = async (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isEditMode) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    const productName = prompt("Enter the exact product name for this spot (e.g. Mission Crib):");
    if (!productName) return;

    const currentSpots = showroomData?.spots || [];
    await saveShowroom({
      password: adminPassword!,
      image: showroomData?.image || "https://lh3.googleusercontent.com/aida-public/AB6AXuATyNgQClA8UHZnWc2RU_55kMNwSCS_f6J9c7s41gQSfBKv33hqZWFUxlmN8Di1H55cxLZa62QgsPlJFyGIARSqOK965OC3PNumjOYZLm-Tp_OwH-yLXeF_UCATtbGtlT0nk8BC-3PncWcoIlVVnLveC_nAE_wN7vuSqCX1YAxFgseWZX1RimmvrnMGCEjcMTfAr-MxQFLUYGbRyB8JE9hWhSArue1GxNCnVF1qplsZMs20_xE_aDWjKKlWiyTujxW7R0R0AERh584n",
      spots: [...currentSpots, { x, y, productName }]
    });
  };

  const removeSpot = async (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isEditMode) return;
    
    const currentSpots = [...(showroomData?.spots || [])];
    currentSpots.splice(index, 1);
    await saveShowroom({
      password: adminPassword!,
      image: showroomData?.image || "",
      spots: currentSpots
    });
  };

  const defaultImage = "https://lh3.googleusercontent.com/aida-public/AB6AXuATyNgQClA8UHZnWc2RU_55kMNwSCS_f6J9c7s41gQSfBKv33hqZWFUxlmN8Di1H55cxLZa62QgsPlJFyGIARSqOK965OC3PNumjOYZLm-Tp_OwH-yLXeF_UCATtbGtlT0nk8BC-3PncWcoIlVVnLveC_nAE_wN7vuSqCX1YAxFgseWZX1RimmvrnMGCEjcMTfAr-MxQFLUYGbRyB8JE9hWhSArue1GxNCnVF1qplsZMs20_xE_aDWjKKlWiyTujxW7R0R0AERh584n";

  return (
    <div>
      <section className="hero-showroom" style={{ position: 'relative', width: '100%', height: '85vh', overflow: 'hidden', cursor: isEditMode ? 'crosshair' : 'default' }} onClick={handleImageClick}>
        <img 
          style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
          src={showroomData?.image || defaultImage} 
          alt="Showroom" 
        />
        <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.05)', pointerEvents: 'none' }}></div>
        
        {showroomData?.spots?.map((spot: any, index: number) => (
          <div 
            key={index}
            style={{ 
              position: 'absolute', 
              left: `${spot.x}%`, 
              top: `${spot.y}%`,
              transform: 'translate(-50%, -50%)',
              zIndex: 10
            }}
            onMouseEnter={() => setHoveredSpot(index)}
            onMouseLeave={() => setHoveredSpot(null)}
          >
            <div 
              onClick={(e) => {
                e.stopPropagation();
                if (!isEditMode) navigate(`/product/${encodeURIComponent(spot.productName)}`);
              }}
              style={{ 
                width: '32px', 
                height: '32px', 
                backgroundColor: 'rgba(255,255,255,0.8)', 
                backdropFilter: 'blur(4px)',
                borderRadius: '50%', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                border: '2px solid white',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                transform: hoveredSpot === index ? 'scale(1.2)' : 'scale(1)'
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--primary)' }}>
                {isEditMode ? 'close' : 'add'}
              </span>
              {isEditMode && (
                <div 
                  onClick={(e) => removeSpot(index, e)}
                  style={{ position: 'absolute', inset: 0, zIndex: 2 }}
                ></div>
              )}
            </div>

            {hoveredSpot === index && (
              <div style={{ 
                position: 'absolute', 
                top: '40px', 
                left: '50%', 
                transform: 'translateX(-50%)',
                backgroundColor: 'white',
                padding: '12px 16px',
                borderRadius: '8px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                whiteSpace: 'nowrap',
                zIndex: 20
              }}>
                <p className="label-caps" style={{ color: 'var(--primary)', marginBottom: '4px' }}>HEIRLOOM PIECE</p>
                <p className="body-md" style={{ fontWeight: 'bold' }}>{spot.productName}</p>
                <p className="body-sm" style={{ color: 'var(--on-surface-variant)', marginTop: '4px' }}>Click to view details</p>
              </div>
            )}
          </div>
        ))}

        <div style={{ position: 'absolute', bottom: '48px', left: '48px', color: 'white', textShadow: '0 2px 4px rgba(0,0,0,0.5)', pointerEvents: 'none' }}>
          <p className="label-caps" style={{ color: 'white', marginBottom: '8px', opacity: 0.9 }}>INTERACTIVE SHOWROOM</p>
          <h1 className="headline-xl">The Sanctuary Series</h1>
          <p className="body-lg" style={{ marginTop: '16px', maxWidth: '450px', opacity: 0.9 }}>Explore our curated nursery showroom. Tap the markers to view handcrafted details and bespoke pricing.</p>
        </div>

        {isEditMode && (
          <div style={{ position: 'absolute', top: '80px', right: '48px', backgroundColor: 'var(--primary)', color: 'white', padding: '12px 20px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', boxShadow: 'var(--shadow-hard)' }}>
            EDIT MODE: Click image to add hotspot
          </div>
        )}
      </section>

      <section className="container" style={{ padding: '80px 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: '64px' }}>
          <span className="label-caps text-secondary">A Heritage of Craft</span>
          <h2 className="headline-xl text-primary" style={{ marginTop: '8px' }}>Designed for a Lifetime</h2>
          <p className="body-lg text-on-surface-variant" style={{ maxWidth: '600px', margin: '24px auto 0' }}>
            Every Heirloom piece is more than furniture. It is a vessel for memories, built with the quiet confidence of master woodworking and the tactile beauty of solid American hardwoods.
          </p>
        </div>
        
        <div className="showroom-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '32px' }}>
           <div style={{ backgroundColor: 'var(--surface-container-low)', padding: '40px', borderRadius: '16px', textAlign: 'center' }}>
              <span className="material-symbols-outlined text-primary" style={{ fontSize: '40px', marginBottom: '24px' }}>precision_manufacturing</span>
              <h3 className="headline-md" style={{ marginBottom: '16px' }}>Traditional Joinery</h3>
              <p className="body-md text-on-surface-variant">We use time-tested dovetail and mortise-and-tenon joints for structural integrity that lasts generations.</p>
           </div>
           <div style={{ backgroundColor: 'var(--surface-container-low)', padding: '40px', borderRadius: '16px', textAlign: 'center' }}>
              <span className="material-symbols-outlined text-primary" style={{ fontSize: '40px', marginBottom: '24px' }}>eco</span>
              <h3 className="headline-md" style={{ marginBottom: '16px' }}>Botanical Finishes</h3>
              <p className="body-md text-on-surface-variant">Our organic, VOC-free oils are child-safe and enhance the natural grain without toxic chemicals.</p>
           </div>
           <div style={{ backgroundColor: 'var(--surface-container-low)', padding: '40px', borderRadius: '16px', textAlign: 'center' }}>
              <span className="material-symbols-outlined text-primary" style={{ fontSize: '40px', marginBottom: '24px' }}>potted_plant</span>
              <h3 className="headline-md" style={{ marginBottom: '16px' }}>Solid Hardwoods</h3>
              <p className="body-md text-on-surface-variant">We exclusively use sustainably harvested Oak, Cherry, Maple, and Walnut—never veneers or particle board.</p>
           </div>
        </div>
      </section>
    </div>
  );
}
