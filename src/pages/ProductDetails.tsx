import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import posthog from 'posthog-js';

export default function ProductDetails() {
  const { id } = useParams<{ id: string }>();
  const { addToCart } = useCart();
  
  const inventoryData = useQuery(api.inventory.get as any, {});
  const loading = inventoryData === undefined;
  const inventory: any[] = inventoryData || [];
  
  const [selectedWood, setSelectedWood] = useState('');
  const [selectedStain, setSelectedStain] = useState('');
  const [showCartPopup, setShowCartPopup] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const decodedId = decodeURIComponent(id || '');
  const productConfigurations = inventory.filter((i: any) => (i.productName ?? i.cribName) === decodedId);
  const currentConfig = productConfigurations.find(c => c.wood === selectedWood) || productConfigurations[0];

  // Read preselected wood/stain from gallery query params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const woodParam = params.get('wood');
    const stainParam = params.get('stain');
    if (productConfigurations.length === 0) return;
    const targetWood = woodParam && productConfigurations.find(c => c.wood === woodParam) ? woodParam : productConfigurations[0].wood;
    setSelectedWood(targetWood);
    const targetConfig = productConfigurations.find(c => c.wood === targetWood) || productConfigurations[0];
    if (stainParam && targetConfig.stains.find((s: any) => s.name === stainParam && s.inStock)) {
      setSelectedStain(stainParam);
    } else {
      const firstAvailable = targetConfig.stains.find((s: any) => s.inStock);
      if (firstAvailable) setSelectedStain(firstAvailable.name);
    }
  }, [productConfigurations.length]);

  useEffect(() => {
    setGalleryIndex(0);
  }, [selectedWood, selectedStain]);

  useEffect(() => {
    if (currentConfig && selectedStain) {
      posthog.capture('product_view', {
        productName: currentConfig.productName ?? currentConfig.cribName,
        cribName: currentConfig.cribName,
        wood: selectedWood,
        stain: selectedStain,
        productId: id,
      });
    }
  }, [currentConfig, selectedWood, selectedStain, id]);

  const handleWoodChange = (wood: string) => {
    setSelectedWood(wood);
    const newConfig = productConfigurations.find(c => c.wood === wood);
    if (newConfig) {
       const stainStillValid = newConfig.stains.find((s: any) => s.name === selectedStain && s.inStock);
       if (!stainStillValid) {
         const firstAvailable = newConfig.stains.find((s: any) => s.inStock);
         if (firstAvailable) setSelectedStain(firstAvailable.name);
         else setSelectedStain('');
       }
    }
  };

  if (loading) return <div className="container" style={{ padding: '80px 24px' }}>Loading...</div>;
  if (!currentConfig) return <div className="container" style={{ padding: '80px 24px' }}>Product not found.</div>;

  const currentStainData = currentConfig.stains.find((s: any) => s.name === selectedStain);

  const galleryImages: string[] = [];
  if (currentStainData) {
    if (currentStainData.gallery && currentStainData.gallery.length > 0) {
      currentStainData.gallery.forEach((g: any) => {
        if (g.url) galleryImages.push(g.url);
      });
    } else if (currentStainData.image) {
      galleryImages.push(currentStainData.image);
    }
  } else if (currentConfig.stains[0]?.image) {
    galleryImages.push(currentConfig.stains[0].image);
  }

  const getStainColor = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes('natural')) return '#DEB887';
    if (n.includes('slate')) return '#5A6064';
    if (n.includes('smoke')) return '#3b3c36';
    if (n.includes('cherry')) return '#651c14';
    if (n.includes('driftwood')) return '#a39887';
    return '#8B4513';
  };

  const basePrice = Number(currentConfig.basePrice) || 0;
  const addition = Number(currentStainData?.priceAddition) || 0;
  const totalPrice = basePrice + addition;

  return (
    <div className="container">
      <div className="grid-layout">
        <div className="product-showcase">
          <div className="image-container product-image" style={{ backgroundColor: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '500px', flexDirection: 'column', position: 'relative' }}>
            {galleryImages.length > 0 ? (
              <>
                <img
                  src={galleryImages[galleryIndex]}
                  alt={currentConfig.productName ?? currentConfig.cribName}
                  style={{ width: '100%', height: '100%', objectFit: 'contain', cursor: 'pointer', position: 'absolute', inset: 0 }}
                  onClick={() => setLightboxOpen(true)}
                />
                {galleryImages.length > 1 && (
                  <>
                    <button
                      onClick={(e) => { e.stopPropagation(); setGalleryIndex(i => (i - 1 + galleryImages.length) % galleryImages.length); }}
                      style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', backgroundColor: 'rgba(255,255,255,0.8)', border: 'none', borderRadius: '50%', width: '40px', height: '40px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
                    >
                      <span className="material-symbols-outlined">chevron_left</span>
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setGalleryIndex(i => (i + 1) % galleryImages.length); }}
                      style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', backgroundColor: 'rgba(255,255,255,0.8)', border: 'none', borderRadius: '50%', width: '40px', height: '40px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
                    >
                      <span className="material-symbols-outlined">chevron_right</span>
                    </button>
                    <div style={{ position: 'absolute', bottom: '12px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '6px', zIndex: 2 }}>
                      {galleryImages.map((_, i) => (
                        <button
                          key={i}
                          onClick={(e) => { e.stopPropagation(); setGalleryIndex(i); }}
                          style={{ width: i === galleryIndex ? '20px' : '8px', height: '8px', borderRadius: '4px', border: 'none', backgroundColor: i === galleryIndex ? 'var(--primary)' : 'var(--outline-variant)', cursor: 'pointer', transition: 'all 0.2s' }}
                        />
                      ))}
                    </div>
                  </>
                )}
              </>
            ) : (
              <div style={{ padding: '48px', textAlign: 'center', color: 'var(--error)' }}>Out of Stock</div>
            )}
            <div className="badges">
              <span className="badge badge-outline">Handcrafted</span>
              <span className="badge badge-filled">Customizable</span>
            </div>
          </div>

          {galleryImages.length > 1 && (
            <div style={{ display: 'flex', gap: '8px', marginTop: '12px', overflowX: 'auto', paddingBottom: '4px' }}>
              {galleryImages.map((url, i) => (
                <img
                  key={i}
                  src={url}
                  alt=""
                  onClick={() => setGalleryIndex(i)}
                  style={{
                    width: '72px',
                    height: '72px',
                    objectFit: 'cover',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    border: i === galleryIndex ? '2px solid var(--primary)' : '2px solid transparent',
                    opacity: i === galleryIndex ? 1 : 0.6,
                    transition: 'all 0.2s',
                    flexShrink: 0,
                  }}
                />
              ))}
            </div>
          )}
        </div>

        <div className="configuration-panel">
          <section className="pricing-section">
            <div>
              <h2 className="headline-xl">
                {currentConfig.productName ?? currentConfig.cribName}
              </h2>
              <p className="body-lg subtitle" style={{ marginTop: '12px', color: 'var(--on-surface-variant)' }}>
                {currentConfig.description || "A legacy piece for the modern nursery."}
              </p>
            </div>
            <div className="price-row">
              <div style={{ display: 'flex', alignItems: 'baseline' }}>
                <span className="headline-lg price-current">$</span>
                <span className="headline-lg price-current" style={{ minWidth: '60px' }}>
                  {totalPrice.toLocaleString()}
                </span>
                <span className="headline-lg price-current">.00</span>
              </div>
              <span className="body-md price-old">${(totalPrice + 350).toLocaleString()}.00</span>
            </div>
          </section>

          <section className="config-section">
            <div className="config-header">
              <h3 className="label-caps">01. Select Wood Species</h3>
              <span className="body-md">{selectedWood.replace(/([A-Z])/g, ' $1').trim()} (Base: ${basePrice})</span>
            </div>
            <div className="wood-grid">
              {productConfigurations.map(config => {
                const isAvailable = config.stains.some((s: any) => s.inStock);
                return (
                  <button 
                    key={config.wood}
                    disabled={!isAvailable}
                    style={{ opacity: isAvailable ? 1 : 0.5, cursor: isAvailable ? 'pointer' : 'not-allowed' }}
                    className={`wood-button ${selectedWood === config.wood ? 'selected' : ''}`}
                    onClick={() => handleWoodChange(config.wood)}
                  >
                    <div className="wood-swatch" style={{ backgroundColor: config.wood === 'RedOak' ? '#D2B48C' : config.wood === 'BrownMaple' ? '#DEB887' : '#8B4513' }}>
                    </div>
                    <p className="label-caps wood-label">
                      {config.wood.replace(/([A-Z])/g, ' $1').trim()}
                      {!isAvailable && <span style={{ display: 'block', fontSize: '10px', color: 'var(--error)', marginTop: '4px' }}>Sold Out</span>}
                    </p>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="config-section">
            <div className="config-header">
              <h3 className="label-caps">02. Choose Stain Finish</h3>
              <span className="body-md">{selectedStain} {addition > 0 ? `(+ $${addition})` : '(Included)'}</span>
            </div>
            <div className="stain-list" style={{ maxHeight: '300px', overflowY: 'auto', paddingRight: '8px' }}>
              {currentConfig.stains.map((stain: any) => {
                const stainAddition = Number(stain.priceAddition) || 0;
                return (
                  <button 
                    key={stain.name}
                    disabled={!stain.inStock}
                    style={{ opacity: stain.inStock ? 1 : 0.5, cursor: stain.inStock ? 'pointer' : 'not-allowed' }}
                    className={`stain-button ${selectedStain === stain.name ? 'selected' : ''}`}
                    onClick={() => setSelectedStain(stain.name)}
                  >
                    <div className="stain-swatch" style={{backgroundColor: getStainColor(stain.name)}}></div>
                    <div className="stain-info">
                      <p className="body-md stain-name">
                        {stain.name} {stainAddition > 0 && <span style={{ color: 'var(--secondary)'}}>(+${stainAddition})</span>}
                        {!stain.inStock && <span style={{ color: 'var(--error)', fontSize: '12px', marginLeft: '8px' }}>[Out of Stock]</span>}
                      </p>
                      <p className="label-caps stain-desc">{stain.name.includes('Natural') ? "Enhances the wood's inherent character" : "Sophisticated artisan pigment"}</p>
                    </div>
                    {selectedStain === stain.name && <span className="material-symbols-outlined stain-check">check_circle</span>}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="action-section">
            <button 
              className="add-to-cart" 
              disabled={!selectedStain}
              style={{ opacity: selectedStain ? 1 : 0.5, cursor: selectedStain ? 'pointer' : 'not-allowed' }}
              onClick={() => {
                const productName = currentConfig.productName ?? currentConfig.cribName;
                posthog.capture('add_to_cart', { productName, cribName: currentConfig.cribName, wood: selectedWood, stain: selectedStain, price: currentConfig.basePrice + (currentStainData?.priceAddition || 0) });
                addToCart({
                  id: `${productName}-${selectedWood}-${selectedStain}`,
                  productName,
                  wood: selectedWood,
                  stainName: selectedStain,
                  price: basePrice + addition,
                  image: galleryImages[0] || '',
                  quantity: 1
                });
                setShowCartPopup(true);
              }}
            >
              {selectedStain ? "ADD TO CART" : "OUT OF STOCK"}
            </button>
            <p className="label-caps delivery-info">Expected delivery: 6-8 weeks • Handcrafted for you</p>
          </section>

          {showCartPopup && (
            <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowCartPopup(false)}>
              <div style={{ backgroundColor: 'var(--surface)', borderRadius: '16px', padding: '40px', maxWidth: '420px', width: '90%', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()}>
                <span className="material-symbols-outlined" style={{ fontSize: '48px', color: 'var(--primary)', marginBottom: '16px' }}>check_circle</span>
                <h2 className="headline-md" style={{ marginBottom: '8px' }}>Added to Cart!</h2>
                <p className="body-md text-on-surface-variant" style={{ marginBottom: '32px' }}>{currentConfig.productName ?? currentConfig.cribName} — {selectedWood.replace(/([A-Z])/g, ' $1').trim()} / {selectedStain}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <Link to="/checkout" className="add-to-cart" style={{ width: '100%', padding: '14px 0', textAlign: 'center', textDecoration: 'none' }}>Go to Cart</Link>
                  <button onClick={() => setShowCartPopup(false)} style={{ background: 'none', border: '1px solid var(--outline-variant)', borderRadius: '8px', padding: '14px', cursor: 'pointer', color: 'var(--on-surface)', fontSize: '14px', fontWeight: 600, letterSpacing: '0.08em' }}>Continue Shopping</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {lightboxOpen && galleryImages.length > 0 && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.9)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }} onClick={() => setLightboxOpen(false)}>
          <button onClick={(e) => { e.stopPropagation(); setLightboxOpen(false); }} style={{ position: 'absolute', top: '24px', right: '24px', background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '36px' }}>close</span>
          </button>
          <img src={galleryImages[galleryIndex]} alt="" style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain' }} onClick={e => e.stopPropagation()} />
          {galleryImages.length > 1 && (
            <>
              <button onClick={(e) => { e.stopPropagation(); setGalleryIndex(i => (i - 1 + galleryImages.length) % galleryImages.length); }} style={{ position: 'absolute', left: '24px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%', width: '48px', height: '48px', cursor: 'pointer', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '28px' }}>chevron_left</span>
              </button>
              <button onClick={(e) => { e.stopPropagation(); setGalleryIndex(i => (i + 1) % galleryImages.length); }} style={{ position: 'absolute', right: '24px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%', width: '48px', height: '48px', cursor: 'pointer', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '28px' }}>chevron_right</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
