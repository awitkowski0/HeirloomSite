import { useState, useMemo, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useCart } from '../context/useCart';
import { useContent } from '../useContent';
import posthog from 'posthog-js';
import ProductGallery from '../components/product/ProductGallery';
import WoodSelector from '../components/product/WoodSelector';
import StainSelector from '../components/product/StainSelector';
import StainStripMobile from '../components/product/StainStripMobile';
import CartPopup from '../components/product/CartPopup';
import type { InventoryItem, Stain } from '../types';

function getInitialSelection(productConfigurations: InventoryItem[]) {
  if (productConfigurations.length === 0) return { wood: '', stain: '' };
  const params = new URLSearchParams(window.location.search);
  const woodParam = params.get('wood');
  const stainParam = params.get('stain');
  const woods = productConfigurations.map(c => c.wood);
  const targetWood = woodParam && woods.includes(woodParam) ? woodParam : productConfigurations[0].wood;
  const targetConfig = productConfigurations.find(c => c.wood === targetWood) || productConfigurations[0];
  const firstStain = targetConfig.stains.find((s: Stain) => s.name === stainParam && s.inStock) || targetConfig.stains.find((s: Stain) => s.inStock);
  return { wood: targetWood, stain: firstStain?.name || '' };
}

const WOOD_SPECIES = ['brownmaple', 'cherrywood', 'redoak'];

function getVariantLabel(woods: string[]): string | null {
  if (woods.length <= 1 && woods[0] === 'Default Title') return null;
  if (woods.some(w => WOOD_SPECIES.includes(w.toLowerCase().replace(/\s/g, '')))) return 'Select Wood Species';
  if (woods.some(w => w.includes('"') || w.includes('x ') || w.includes('FT') || w.toLowerCase().includes('feet'))) return 'Select Size';
  return 'Select Option';
}

function isHandcraftedWood(woods: string[]): boolean {
  return woods.some(w => WOOD_SPECIES.includes(w.toLowerCase().replace(/\s/g, '')));
}

export default function ProductDetails() {
  const { id } = useParams<{ id: string }>();
  const { addToCart } = useCart();
  const { inventory, loading } = useContent();

  const decodedId = decodeURIComponent(id || '');
  const productConfigurations = inventory.filter((i: any) => i.productName === decodedId);
  const woods = productConfigurations.map(c => c.wood);
  const variantLabel = getVariantLabel(woods);
  const showStainStep = variantLabel === 'Select Wood Species';
  const showDeliveryMessage = isHandcraftedWood(woods);

  const [userWood, setUserWood] = useState<string | null>(null);
  const [userStain, setUserStain] = useState<string | null>(null);
  const [showCartPopup, setShowCartPopup] = useState(false);

  const selection = useMemo(() => {
    if (productConfigurations.length === 0) return { wood: '', stain: '' };
    if (userWood) {
      const config = productConfigurations.find((c: any) => c.wood === userWood);
      if (config) {
        const validStain = userStain && config.stains.some((s: any) => s.name === userStain && s.inStock)
          ? userStain
          : config.stains.find((s: any) => s.inStock)?.name || '';
        return { wood: userWood, stain: validStain };
      }
    }
    return getInitialSelection(productConfigurations);
  }, [productConfigurations, userWood, userStain]);

  const currentConfig = productConfigurations.find((c: any) => c.wood === selection.wood) || productConfigurations[0];
  const currentStainData = currentConfig?.stains.find((s: any) => s.name === selection.stain);

  const galleryImages: string[] = [];
  if (currentStainData?.gallery?.length) {
    currentStainData.gallery.forEach((g: any) => { if (g.url) galleryImages.push(g.url); });
  } else if (currentStainData?.image) {
    galleryImages.push(currentStainData.image);
  } else if (currentConfig?.stains[0]?.image) {
    galleryImages.push(currentConfig.stains[0].image);
  }

  useEffect(() => {
    if (currentConfig && selection.stain) {
      posthog.capture('product_view', {
        productName: currentConfig.productName,
        wood: selection.wood,
        stain: selection.stain,
        productId: id,
      });
    }
  }, [currentConfig?.productName, selection.wood, selection.stain, id]);

  const handleWoodChange = (wood: string) => {
    setUserWood(wood);
    setUserStain(null);
    const newConfig = productConfigurations.find((c: any) => c.wood === wood);
    if (newConfig) {
      const firstAvailable = newConfig.stains.find((s: any) => s.inStock);
      if (firstAvailable) setUserStain(firstAvailable.name);
    }
  };

  const isWoodSoldOut = (wood: string) => {
    const config = productConfigurations.find((c: any) => c.wood === wood);
    return config ? !config.stains.some((s: any) => s.inStock) : true;
  };

  if (loading) return <div className="container" style={{ padding: '80px 24px' }}>Loading...</div>;
  if (!currentConfig) return <div className="container" style={{ padding: '80px 24px' }}>Product not found.</div>;

  const basePrice = Number(currentConfig.basePrice) || 0;
  const addition = Number(currentStainData?.priceAddition) || 0;
  const totalPrice = basePrice + addition;

  return (
    <div className="container">
      <h2 className="headline-xl product-title">{currentConfig.productName}</h2>

      <div className="grid-layout">
        <div className="product-showcase">
          <ProductGallery images={galleryImages} productName={currentConfig.productName} />
        </div>

        {showStainStep && (
          <StainStripMobile stains={currentConfig.stains} selected={selection.stain} onSelect={setUserStain} />
        )}

        <div className="configuration-panel">
          {variantLabel && (
            <WoodSelector
              woods={woods}
              selected={selection.wood}
              onSelect={handleWoodChange}
              disabled={isWoodSoldOut}
              label={variantLabel}
            />
          )}

          {showStainStep && (
            <StainSelector stains={currentConfig.stains} selected={selection.stain} onSelect={setUserStain} />
          )}

          <section className="pricing-section">
            {currentConfig.description && (
              <p className="body-lg subtitle" style={{ margin: '0', color: 'var(--on-surface-variant)' }}>
                {currentConfig.description}
              </p>
            )}
            <div className="price-row">
              <div style={{ display: 'flex', alignItems: 'baseline' }}>
                <span className="headline-lg price-current">$</span>
                <span className="headline-lg price-current" style={{ minWidth: '60px' }}>{totalPrice.toLocaleString()}</span>
                <span className="headline-lg price-current">.00</span>
              </div>
              {currentConfig.stains?.[0]?.priceAddition === 0 && (
                <span className="body-md price-old">${(totalPrice + 350).toLocaleString()}.00</span>
              )}
            </div>
          </section>

          <section className="action-section">
            <button
              className="add-to-cart"
              disabled={!selection.stain}
              style={{ opacity: selection.stain ? 1 : 0.5, cursor: selection.stain ? 'pointer' : 'not-allowed' }}
              onClick={() => {
                posthog.capture('add_to_cart', {
                  productName: currentConfig.productName,
                  wood: selection.wood,
                  stain: selection.stain,
                  price: basePrice + addition,
                });
                addToCart({
                  id: `${currentConfig.productName}-${selection.wood}-${selection.stain}`,
                  productName: currentConfig.productName,
                  wood: selection.wood,
                  stainName: selection.stain,
                  price: basePrice + addition,
                  image: galleryImages[0] || '',
                  quantity: 1,
                });
                setShowCartPopup(true);
              }}
            >
              {selection.stain ? "ADD TO CART" : "OUT OF STOCK"}
            </button>

            <button
              className="babylist-btn"
              style={{ background: 'none', width: '100%', padding: '14px 0', textAlign: 'center', textDecoration: 'none', border: '1px solid var(--outline-variant)', borderRadius: '8px', cursor: 'pointer', color: 'var(--on-surface)', fontSize: '14px', fontWeight: 600, letterSpacing: '0.08em', marginTop: '12px', display: 'block', boxSizing: 'border-box' }}
              onClick={() => {
                const bl = (window as typeof window & { bl?: { addToRegistry: (d: Record<string, string>) => void } }).bl;
                if (bl?.addToRegistry) {
                  bl.addToRegistry({
                    images: galleryImages[0] || '',
                    price: String(totalPrice),
                    title: currentConfig.productName,
                    url: window.location.href,
                  });
                }
              }}
            >
              Add to Babylist
            </button>

            {showDeliveryMessage && (
              <p className="label-caps delivery-info">Expected delivery: 6-8 weeks &bull; Handcrafted for you</p>
            )}
          </section>
        </div>
      </div>

      {showCartPopup && (
        <CartPopup
          productName={currentConfig.productName}
          wood={selection.wood}
          stain={selection.stain}
          onClose={() => setShowCartPopup(false)}
        />
      )}
    </div>
  );
}
