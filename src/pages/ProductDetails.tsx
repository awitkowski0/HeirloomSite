import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
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
  const [showStepper, setShowStepper] = useState(false);
  const [stepperStep, setStepperStep] = useState(1);
  const [selAddons, setSelAddons] = useState<{addon: any; stained: boolean}[]>([]);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [showWoodPicker, setShowWoodPicker] = useState(() => {
    if (typeof window !== 'undefined') return window.innerWidth >= 768;
    return true;
  });

  const touchStartY = useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const deltaY = e.changedTouches[0].clientY - touchStartY.current;
    if (Math.abs(deltaY) < 50) return;
    const sortedConfigs = [...productConfigurations].sort((a: any, b: any) => (a.order ?? 9999) - (b.order ?? 9999));
    const woodIdx = sortedConfigs.findIndex((c: any) => c.wood === selectedWood);
    const available = currentConfig.stains.filter((s: any) => s.inStock);
    const idx = available.findIndex((s: any) => s.name === selectedStain);
    if (deltaY < 0) {
      if (idx < available.length - 1) {
        setSelectedStain(available[idx + 1].name);
      } else if (woodIdx < sortedConfigs.length - 1) {
        const next = sortedConfigs[woodIdx + 1];
        const nextAvail = next.stains.filter((s: any) => s.inStock);
        if (nextAvail.length > 0) { setSelectedWood(next.wood); setSelectedStain(nextAvail[0].name); }
      }
    } else if (deltaY > 0) {
      if (idx > 0) {
        setSelectedStain(available[idx - 1].name);
      } else if (woodIdx > 0) {
        const prev = sortedConfigs[woodIdx - 1];
        const prevAvail = prev.stains.filter((s: any) => s.inStock);
        if (prevAvail.length > 0) { setSelectedWood(prev.wood); setSelectedStain(prevAvail[prevAvail.length - 1].name); }
      }
    }
  };

  const finalizeCart = () => {
    const productName = currentConfig.productName ?? currentConfig.cribName;
    addToCart({
      id: `${productName}-${selectedWood}-${selectedStain}`,
      productName,
      wood: selectedWood,
      stainName: selectedStain,
      price: basePrice + addition,
      image: galleryImages[0] || '',
      quantity: 1,
      addons: selAddons.map(s => ({
        name: s.addon.name,
        price: s.stained ? s.addon.priceStained : s.addon.price,
        stainName: s.stained ? selectedStain : undefined,
      })),
    });
  };

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
    if (window.innerWidth < 768) setShowWoodPicker(false);
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
          <div
            className="image-container product-image"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            style={{ backgroundColor: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '500px', flexDirection: 'column', position: 'relative' }}
          >
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

          <div className="stain-strip-mobile">
            {currentConfig.stains.map((stain: any) => (
              <button
                key={stain.name}
                disabled={!stain.inStock}
                className={`stain-strip-swatch ${selectedStain === stain.name ? 'selected' : ''}`}
                onClick={() => setSelectedStain(stain.name)}
                style={{ opacity: stain.inStock ? 1 : 0.5 }}
              >
                <div className="stain-swatch" style={{backgroundColor: getStainColor(stain.name), overflow: 'hidden', position: 'relative'}}>
                  {(stain.image || stain.gallery?.[0]?.url) ? (
                    <img src={stain.image || stain.gallery[0].url} alt={stain.name} style={{width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0}} />
                  ) : null}
                </div>
              </button>
            ))}
          </div>

          <div className="product-showcase-below">
            <p className="body-lg subtitle" style={{ margin: '0 0 16px', color: 'var(--on-surface-variant)' }}>
              {currentConfig.description || "A legacy piece for the modern nursery."}
            </p>

          <div className="product-metadata">
            {currentConfig.extendedDescription && (
              <p className="body-lg" style={{ color: 'var(--on-surface-variant)', lineHeight: '1.8', whiteSpace: 'pre-wrap', marginBottom: '16px' }}>
                {currentConfig.extendedDescription}
              </p>
            )}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
              {currentConfig.tags?.map((tag: string, i: number) => (
                <span key={i} style={{ padding: '4px 10px', borderRadius: '4px', backgroundColor: 'var(--surface-container-low)', color: 'var(--on-surface-variant)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{tag}</span>
              ))}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', fontSize: '13px', color: 'var(--on-surface-variant)' }}>
              {currentConfig.dimensions && <span>Dimensions: {currentConfig.dimensions}</span>}
              {currentConfig.weight && <span>Weight: {currentConfig.weight} lbs</span>}
              {currentConfig.sku && <span>SKU: {currentConfig.sku}</span>}
            </div>
          </div>
        </div>
      </div>

        <div className="configuration-panel">
        <h2 className="headline-xl" style={{ marginBottom: '8px' }}>
          {currentConfig.productName ?? currentConfig.cribName}
        </h2>

        <section className="config-section">
          <div className="config-header">
            <h3 className="label-caps">01. Select Wood Species</h3>
          </div>
          {showWoodPicker ? (
            <div className="wood-grid">
              {productConfigurations.map(config => {
                const isAvailable = config.stains.some((s: any) => s.inStock);
                return (
                  <button 
                    key={config.wood}
                    disabled={!isAvailable}
                    style={{ opacity: isAvailable ? 1 : 0.5, cursor: isAvailable ? 'pointer' : 'not-allowed' }}
                    className={`wood-chip ${selectedWood === config.wood ? 'selected' : ''}`}
                    onClick={() => handleWoodChange(config.wood)}
                  >
                    {config.wood.replace(/([A-Z])/g, ' $1').trim()}
                    {!isAvailable && <span style={{ fontSize: '9px', color: 'var(--error)', marginLeft: '4px' }}>Sold Out</span>}
                  </button>
                );
              })}
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <button className="wood-chip selected" onClick={() => setShowWoodPicker(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                {selectedWood.replace(/([A-Z])/g, ' $1').trim()}
                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>expand_more</span>
              </button>
              <span className="body-md" style={{ color: 'var(--on-surface-variant)' }}>Base: ${basePrice}</span>
            </div>
          )}
        </section>

        <section className="config-section desktop-only">
          <div className="config-header">
            <h3 className="label-caps">02. Choose Stain Finish</h3>
            <span className="body-sm">{selectedStain} {addition > 0 ? `(+ $${addition})` : '(Included)'}</span>
          </div>
          <div className="stain-list" style={{ maxHeight: '420px', overflowY: 'auto', paddingRight: '8px' }}>
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
                  <div className="stain-swatch" style={{backgroundColor: getStainColor(stain.name), overflow: 'hidden', position: 'relative'}}>
                    {(stain.image || stain.gallery?.[0]?.url) ? (
                      <img src={stain.image || stain.gallery[0].url} alt={stain.name} style={{width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0}} />
                    ) : null}
                  </div>
                  <div className="stain-info">
                    <p className="body-md stain-name">
                      {stain.name} {stainAddition > 0 && <span style={{ color: 'var(--secondary)'}}>(+${stainAddition})</span>}
                      {!stain.inStock && <span style={{ color: 'var(--error)', fontSize: '12px', marginLeft: '8px' }}>[Out of Stock]</span>}
                    </p>
                  </div>
                  {selectedStain === stain.name && <span className="material-symbols-outlined stain-check">check_circle</span>}
                </button>
              );
            })}
          </div>
        </section>

        <section className="pricing-section" style={{ gap: '4px' }}>
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

        <section className="action-section">
          <button 
            className="add-to-cart" 
            disabled={!selectedStain}
            style={{ opacity: selectedStain ? 1 : 0.5, cursor: selectedStain ? 'pointer' : 'not-allowed' }}
            onClick={() => {
              setSelAddons([]);
              setStepperStep(1);
              setShowStepper(true);
            }}
          >
            {selectedStain ? "ADD TO CART" : "OUT OF STOCK"}
          </button>
          <p className="label-caps delivery-info">Expected delivery: 6-8 weeks • Handcrafted for you</p>
        </section>

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

      {showStepper && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }} onClick={() => setShowStepper(false)}>
          <div style={{ backgroundColor: 'var(--surface)', borderRadius: '16px', padding: '32px', maxWidth: '520px', width: '100%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()}>
            {/* Step indicator */}
            <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', marginBottom: '24px' }}>
              {[1, 2, 3, 4].map(s => (
                <div key={s} style={{ width: s === stepperStep ? '24px' : '8px', height: '8px', borderRadius: '4px', backgroundColor: s <= stepperStep ? 'var(--primary)' : 'var(--outline-variant)', transition: 'all 0.3s' }} />
              ))}
            </div>

            {stepperStep === 1 && (
              <div style={{ textAlign: 'center' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '48px', color: 'var(--primary)', marginBottom: '12px', display: 'block' }}>check_circle</span>
                <h2 className="headline-md" style={{ marginBottom: '8px' }}>Added to Cart!</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', backgroundColor: 'var(--surface-container-low)', borderRadius: '10px', marginBottom: '24px' }}>
                  {galleryImages[0] && <img src={galleryImages[0]} alt="" style={{ width: '56px', height: '56px', borderRadius: '8px', objectFit: 'contain', backgroundColor: 'white' }} />}
                  <div style={{ flex: 1, textAlign: 'left' }}>
                    <p style={{ fontWeight: 600, fontSize: '14px' }}>{currentConfig.productName ?? currentConfig.cribName}</p>
                    <p style={{ fontSize: '12px', color: 'var(--on-surface-variant)' }}>{selectedWood.replace(/([A-Z])/g, ' $1').trim()} / {selectedStain}</p>
                    <p style={{ fontSize: '13px', fontWeight: 600, marginTop: '4px' }}>${(basePrice + addition).toLocaleString()}.00</p>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <button onClick={() => setStepperStep(2)} className="add-to-cart" style={{ width: '100%', padding: '14px 0', textAlign: 'center', border: 'none', fontSize: '14px', fontWeight: 600, letterSpacing: '0.08em', cursor: 'pointer' }}>Add Accessories</button>
                  <button onClick={() => {
                    finalizeCart();
                    window.location.href = '/checkout';
                  }} style={{ background: 'none', border: '1px solid var(--outline-variant)', borderRadius: '8px', padding: '12px', cursor: 'pointer', color: 'var(--on-surface)', fontSize: '13px', fontWeight: 600, letterSpacing: '0.06em' }}>Skip — View Cart</button>
                </div>
              </div>
            )}

            {stepperStep === 2 && (() => {
              const conversionAddons = (currentConfig.addons || []).filter((a: any) => a.category === 'conversion');
              if ((currentConfig.addons || []).length === 0) {
                return (
                  <div style={{ textAlign: 'center' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '40px', color: 'var(--primary)', marginBottom: '12px', display: 'block' }}>shopping_cart</span>
                    <h3 className="headline-sm" style={{ marginBottom: '8px' }}>Ready to Checkout?</h3>
                    <p className="body-sm" style={{ color: 'var(--on-surface-variant)', marginBottom: '24px' }}>Your item will be added with {selAddons.length > 0 ? `${selAddons.length} add-on(s)` : 'no add-ons'}.</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <button onClick={() => { finalizeCart(); window.location.href = '/checkout'; }} className="add-to-cart" style={{ width: '100%', padding: '14px 0', border: 'none', fontSize: '14px', fontWeight: 600, letterSpacing: '0.08em', cursor: 'pointer' }}>View Cart & Checkout</button>
                      <button onClick={() => setShowStepper(false)} style={{ background: 'none', border: '1px solid var(--outline-variant)', borderRadius: '8px', padding: '12px', cursor: 'pointer', color: 'var(--on-surface)', fontSize: '13px', fontWeight: 600 }}>Continue Shopping</button>
                    </div>
                  </div>
                );
              }
              if (conversionAddons.length === 0) { setTimeout(() => setStepperStep(3), 50); return null; }
              return (
                <div>
                  <h3 className="headline-sm" style={{ marginBottom: '16px' }}>Conversion Add-ons</h3>
                  <p className="body-sm" style={{ color: 'var(--on-surface-variant)', marginBottom: '16px' }}>Convert your crib as your child grows.</p>
                  {conversionAddons.map((addon: any, i: number) => {
                    const selected = selAddons.find(s => s.addon.name === addon.name);
                    return (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: '10px', border: selected ? '2px solid var(--primary)' : '1px solid var(--outline-variant)', marginBottom: '8px', cursor: 'pointer', backgroundColor: selected ? 'var(--primary-container, #f5efe8)' : 'var(--surface)' }}
                        onClick={() => {
                          if (selected) setSelAddons(selAddons.filter(s => s.addon.name !== addon.name));
                          else setSelAddons([...selAddons, { addon, stained: false }]);
                        }}>
                        <div style={{ width: '20px', height: '20px', borderRadius: '4px', border: selected ? '2px solid var(--primary)' : '2px solid var(--outline-variant)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, backgroundColor: selected ? 'var(--primary)' : 'transparent' }}>
                          {selected && <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'white' }}>check</span>}
                        </div>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontWeight: 600, fontSize: '14px' }}>{addon.name}</p>
                          {addon.description && <p style={{ fontSize: '12px', color: 'var(--on-surface-variant)' }}>{addon.description}</p>}
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <p style={{ fontSize: '13px', fontWeight: 600 }}>+${addon.price.toLocaleString()}.00</p>
                          {addon.priceStained > addon.price && <p style={{ fontSize: '11px', color: 'var(--on-surface-variant)' }}>Stained: +${addon.priceStained.toLocaleString()}.00</p>}
                        </div>
                      </div>
                    );
                  })}
                  <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                    <button onClick={() => setStepperStep(3)} className="add-to-cart" style={{ flex: 1, padding: '12px 0', textAlign: 'center', border: 'none', fontSize: '13px', fontWeight: 600, letterSpacing: '0.06em', cursor: 'pointer' }}>Continue</button>
                    <button onClick={() => setStepperStep(1)} style={{ background: 'none', border: '1px solid var(--outline-variant)', borderRadius: '8px', padding: '12px 20px', cursor: 'pointer', color: 'var(--on-surface)', fontSize: '12px' }}>Back</button>
                  </div>
                </div>
              );
            })()}

            {stepperStep === 3 && (() => {
              const mattressAddons = (currentConfig.addons || []).filter((a: any) => a.category === 'mattress');
              if ((currentConfig.addons || []).length === 0) {
                setTimeout(() => setStepperStep(2), 50); return null;
              }
              if (mattressAddons.length === 0) { setTimeout(() => setStepperStep(4), 50); return null; }
              return (
                <div>
                  <h3 className="headline-sm" style={{ marginBottom: '16px' }}>Mattresses</h3>
                  <p className="body-sm" style={{ color: 'var(--on-surface-variant)', marginBottom: '16px' }}>Choose a mattress for your crib.</p>
                  {mattressAddons.map((addon: any, i: number) => {
                    const selected = selAddons.find(s => s.addon.name === addon.name);
                    return (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: '10px', border: selected ? '2px solid var(--primary)' : '1px solid var(--outline-variant)', marginBottom: '8px', cursor: 'pointer', backgroundColor: selected ? 'var(--primary-container, #f5efe8)' : 'var(--surface)' }}
                        onClick={() => {
                          if (selected) setSelAddons(selAddons.filter(s => !mattressAddons.find((m: any) => m.name === s.addon.name)));
                          else setSelAddons([...selAddons.filter(s => !mattressAddons.find((m: any) => m.name === s.addon.name)), { addon, stained: false }]);
                        }}>
                        <div style={{ width: '20px', height: '20px', borderRadius: '50%', border: selected ? '2px solid var(--primary)' : '2px solid var(--outline-variant)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {selected && <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: 'var(--primary)' }} />}
                        </div>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontWeight: 600, fontSize: '14px' }}>{addon.name}</p>
                          {addon.description && <p style={{ fontSize: '12px', color: 'var(--on-surface-variant)' }}>{addon.description}</p>}
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <p style={{ fontSize: '13px', fontWeight: 600 }}>+${addon.price.toLocaleString()}.00</p>
                        </div>
                      </div>
                    );
                  })}
                  <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                    <button onClick={() => setStepperStep(4)} className="add-to-cart" style={{ flex: 1, padding: '12px 0', textAlign: 'center', border: 'none', fontSize: '13px', fontWeight: 600, letterSpacing: '0.06em', cursor: 'pointer' }}>Continue</button>
                    <button onClick={() => setStepperStep(2)} style={{ background: 'none', border: '1px solid var(--outline-variant)', borderRadius: '8px', padding: '12px 20px', cursor: 'pointer', color: 'var(--on-surface)', fontSize: '12px' }}>Back</button>
                  </div>
                </div>
              );
            })()}

            {stepperStep === 4 && (() => {
              const furnitureAddons = (currentConfig.addons || []).filter((a: any) => a.category === 'matching_furniture');
              if ((currentConfig.addons || []).length === 0) {
                setTimeout(() => setStepperStep(2), 50); return null;
              }
              if (furnitureAddons.length === 0) {
                return (
                  <div style={{ textAlign: 'center' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '40px', color: 'var(--primary)', marginBottom: '12px', display: 'block' }}>shopping_cart</span>
                    <h3 className="headline-sm" style={{ marginBottom: '8px' }}>Ready to Checkout?</h3>
                    <p className="body-sm" style={{ color: 'var(--on-surface-variant)', marginBottom: '24px' }}>Your item will be added with {selAddons.length > 0 ? `${selAddons.length} add-on(s)` : 'no add-ons'}.</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <button onClick={() => { finalizeCart(); window.location.href = '/checkout'; }} className="add-to-cart" style={{ width: '100%', padding: '14px 0', border: 'none', fontSize: '14px', fontWeight: 600, letterSpacing: '0.08em', cursor: 'pointer' }}>View Cart & Checkout</button>
                      <button onClick={() => setShowStepper(false)} style={{ background: 'none', border: '1px solid var(--outline-variant)', borderRadius: '8px', padding: '12px', cursor: 'pointer', color: 'var(--on-surface)', fontSize: '13px', fontWeight: 600 }}>Continue Shopping</button>
                    </div>
                  </div>
                );
              }
              return (
                <div>
                  <h3 className="headline-sm" style={{ marginBottom: '16px' }}>Matching Furniture</h3>
                  <p className="body-sm" style={{ color: 'var(--on-surface-variant)', marginBottom: '16px' }}>Complete the room with matching pieces. Stained items match your crib's {selectedStain} finish.</p>
                  {furnitureAddons.map((addon: any, i: number) => {
                    const selected = selAddons.find(s => s.addon.name === addon.name);
                    return (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: '10px', border: selected ? '2px solid var(--primary)' : '1px solid var(--outline-variant)', marginBottom: '8px', cursor: 'pointer', backgroundColor: selected ? 'var(--primary-container, #f5efe8)' : 'var(--surface)' }}
                        onClick={() => {
                          if (selected) setSelAddons(selAddons.filter(s => s.addon.name !== addon.name));
                          else setSelAddons([...selAddons, { addon, stained: true }]);
                        }}>
                        <div style={{ width: '20px', height: '20px', borderRadius: '4px', border: selected ? '2px solid var(--primary)' : '2px solid var(--outline-variant)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, backgroundColor: selected ? 'var(--primary)' : 'transparent' }}>
                          {selected && <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'white' }}>check</span>}
                        </div>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontWeight: 600, fontSize: '14px' }}>{addon.name}</p>
                          {addon.description && <p style={{ fontSize: '12px', color: 'var(--on-surface-variant)' }}>{addon.description}</p>}
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <p style={{ fontSize: '13px', fontWeight: 600 }}>+${addon.priceStained.toLocaleString()}.00</p>
                          <p style={{ fontSize: '11px', color: 'var(--on-surface-variant)' }}>Stained</p>
                        </div>
                      </div>
                    );
                  })}
                  <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                    <button onClick={() => setStepperStep(5)} className="add-to-cart" style={{ flex: 1, padding: '12px 0', textAlign: 'center', border: 'none', fontSize: '13px', fontWeight: 600, letterSpacing: '0.06em', cursor: 'pointer' }}>Continue</button>
                    <button onClick={() => setStepperStep(3)} style={{ background: 'none', border: '1px solid var(--outline-variant)', borderRadius: '8px', padding: '12px 20px', cursor: 'pointer', color: 'var(--on-surface)', fontSize: '12px' }}>Back</button>
                  </div>
                </div>
              );
            })()}

            {stepperStep === 5 && (
              <div style={{ textAlign: 'center' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '40px', color: 'var(--primary)', marginBottom: '12px', display: 'block' }}>shopping_cart</span>
                <h3 className="headline-sm" style={{ marginBottom: '8px' }}>Ready to Checkout?</h3>
                <p className="body-sm" style={{ color: 'var(--on-surface-variant)', marginBottom: '24px' }}>
                  Your item will be added with {selAddons.length > 0 ? `${selAddons.length} add-on(s)` : 'no add-ons'}.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <button onClick={() => { finalizeCart(); window.location.href = '/checkout'; }} className="add-to-cart" style={{ width: '100%', padding: '14px 0', textAlign: 'center', border: 'none', fontSize: '14px', fontWeight: 600, letterSpacing: '0.08em', cursor: 'pointer' }}>View Cart & Checkout</button>
                  <button onClick={() => setShowStepper(false)} style={{ background: 'none', border: '1px solid var(--outline-variant)', borderRadius: '8px', padding: '12px', cursor: 'cursor', color: 'var(--on-surface)', fontSize: '13px', fontWeight: 600 }}>Continue Shopping</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
