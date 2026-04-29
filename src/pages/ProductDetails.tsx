import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

export default function ProductDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  
  const isStaged = new URLSearchParams(window.location.search).get('mode') === 'staging';
  const inventoryData = useQuery(api.inventory.get, { useStaged: isStaged });
  const loading = inventoryData === undefined;
  const inventory = inventoryData || [];
  
  const [selectedWood, setSelectedWood] = useState('');
  const [selectedStain, setSelectedStain] = useState('');

  const adminPassword = localStorage.getItem('adminPassword');
  const isAdmin = !!adminPassword;
  const isEditMode = isAdmin && isStaged;
  
  const updateCribName = useMutation(api.inventory.updateCribName);
  const updateBasePrice = useMutation(api.inventory.updateBasePrice);

  const decodedId = decodeURIComponent(id || '');
  const productConfigurations = inventory.filter(i => i.cribName === decodedId);
  const currentConfig = productConfigurations.find(c => c.wood === selectedWood) || productConfigurations[0];

  useEffect(() => {
    if (productConfigurations.length > 0 && !selectedWood) {
      setSelectedWood(productConfigurations[0].wood);
      const firstAvailableStain = productConfigurations[0].stains.find((s: any) => s.inStock);
      if (firstAvailableStain) setSelectedStain(firstAvailableStain.name);
    }
  }, [productConfigurations, selectedWood]);

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
  const getImagePath = () => {
    return currentStainData ? currentStainData.image : currentConfig.stains[0]?.image;
  };

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
          <div className="image-container" style={{ backgroundColor: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '500px' }}>
            {getImagePath() ? (
               <img src={getImagePath()} alt={currentConfig.cribName} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            ) : (
               <div style={{ padding: '48px', textAlign: 'center', color: 'var(--error)' }}>Out of Stock</div>
            )}
            <div className="badges">
              <span className="badge badge-outline">Handcrafted</span>
              <span className="badge badge-filled">Customizable</span>
            </div>
          </div>

        </div>

        <div className="configuration-panel">
          <section className="pricing-section">
            <div>
              <h2 
                className="headline-xl" 
                contentEditable={isEditMode} 
                suppressContentEditableWarning={true}
                onBlur={(e) => {
                  if (isEditMode && e.target.innerText !== currentConfig.cribName) {
                    updateCribName({ password: adminPassword!, oldName: currentConfig.cribName, newName: e.target.innerText });
                    navigate(`/product/${encodeURIComponent(e.target.innerText)}?mode=staging`, { replace: true });
                  }
                }}
                style={{ 
                  borderBottom: isEditMode ? '1px dashed var(--primary)' : 'none',
                  outline: 'none'
                }}
              >
                {currentConfig.cribName}
              </h2>
              <p 
                className="body-lg subtitle"
                style={{ 
                  marginTop: '12px', 
                  color: 'var(--on-surface-variant)',
                  borderBottom: isEditMode ? '1px dashed var(--primary)' : 'none',
                  outline: 'none'
                }}
                contentEditable={isEditMode}
                suppressContentEditableWarning={true}
              >
                {currentConfig.description || "A legacy piece for the modern nursery."}
              </p>
            </div>
            <div className="price-row">
              <div style={{ display: 'flex', alignItems: 'baseline' }}>
                <span className="headline-lg price-current">$</span>
                <span 
                  className="headline-lg price-current"
                  contentEditable={isEditMode} 
                  suppressContentEditableWarning={true}
                  onBlur={(e) => {
                    if (isEditMode) {
                      const newBasePrice = Number(e.target.innerText.replace(/[^0-9]/g, '')) - addition;
                      if (!isNaN(newBasePrice) && newBasePrice > 0) {
                        updateBasePrice({ password: adminPassword!, cribName: currentConfig.cribName, wood: selectedWood, newPrice: newBasePrice });
                      }
                    }
                  }}
                  style={{ 
                    borderBottom: isEditMode ? '1px dashed var(--primary)' : 'none',
                    outline: 'none',
                    minWidth: '60px'
                  }}
                >
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
                addToCart({
                  id: `${currentConfig.cribName}-${selectedWood}-${selectedStain}`,
                  cribName: currentConfig.cribName,
                  wood: selectedWood,
                  stainName: selectedStain,
                  price: basePrice + addition,
                  image: getImagePath() || '',
                  quantity: 1
                });
                alert("Added to cart!");
              }}
            >
              {selectedStain ? "ADD TO CART" : "OUT OF STOCK"}
            </button>
            <p className="label-caps delivery-info">Expected delivery: 6-8 weeks • White Glove Shipping</p>
          </section>
        </div>
      </div>
    </div>
  );
}
