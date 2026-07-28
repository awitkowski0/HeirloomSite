import { useState, useMemo, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useCart } from '../context/useCart';
import { useContent } from '../useContent';
import posthog from 'posthog-js';
import ProductGallery from '../components/product/ProductGallery';
import WoodSelector from '../components/product/WoodSelector';
import StainSelector from '../components/product/StainSelector';
import StainReel from '../components/product/StainReel';
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

  const decodedSlug = id || '';
  const item = inventory.find((i: any) => i.slug === decodedSlug);
  const productConfigurations = item ? inventory.filter((i: any) => i.productName === item.productName) : [];
  const woods = productConfigurations.map(c => c.wood);
  const variantLabel = getVariantLabel(woods);
  const showStainStep = variantLabel === 'Select Wood Species';
  const showDeliveryMessage = isHandcraftedWood(woods);

  const [userWood, setUserWood] = useState<string | null>(null);
  const [userStain, setUserStain] = useState<string | null>(null);
  const [showCartPopup, setShowCartPopup] = useState(false);
  const [showStainReel, setShowStainReel] = useState(false);

  const selection = useMemo(() => {
    if (productConfigurations.length === 0) return { wood: '', stain: '' };
    const initial = getInitialSelection(productConfigurations);
    const activeWood = userWood || initial.wood;
    const config = productConfigurations.find((c: InventoryItem) => c.wood === activeWood);

    if (config) {
      const preferredStain = userStain || initial.stain;
      const isValid = preferredStain && config.stains.some((s: Stain) => s.name === preferredStain && s.inStock);
      const activeStain = isValid
        ? preferredStain
        : config.stains.find((s: Stain) => s.inStock)?.name || '';
      return { wood: activeWood, stain: activeStain };
    }
    return initial;
  }, [productConfigurations, userWood, userStain]);

  const currentConfig = productConfigurations.find((c: any) => c.wood === selection.wood) || productConfigurations[0];
  const currentStainData = currentConfig?.stains.find((s: any) => s.name === selection.stain);

  // Build the photo gallery for the current wood. Each stain only carries a
  // single photo, so on its own the gallery has nothing to page through. We
  // lead with the selected stain's photo(s), then append the other in-stock
  // finishes for this wood so shoppers can swipe/scroll through the crib's
  // available looks. Duplicates are removed and order is preserved.
  const galleryImages: string[] = [];
  const pushImage = (url?: string | null) => {
    if (url && !galleryImages.includes(url)) galleryImages.push(url);
  };
  const pushStainImages = (stain?: { image?: string | null; gallery?: Array<{ url?: string }> } | null) => {
    stain?.gallery?.forEach(g => pushImage(g.url));
    pushImage(stain?.image);
  };

  pushStainImages(currentStainData);
  currentConfig?.stains.forEach((s: Stain) => {
    if (s.inStock) pushStainImages(s);
  });
  if (galleryImages.length === 0) pushImage(currentConfig?.stains[0]?.image);

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
  const inStockStainCount = currentConfig.stains.filter((s: Stain) => s.inStock).length;

  const addStainToCart = (stain: Stain) => {
    const price = basePrice + (Number(stain.priceAddition) || 0);
    posthog.capture('add_to_cart', {
      productName: currentConfig.productName,
      wood: selection.wood,
      stain: stain.name,
      price,
    });
    addToCart({
      id: `${currentConfig.productName}-${selection.wood}-${stain.name}`,
      productName: currentConfig.productName,
      wood: selection.wood,
      stainName: stain.name,
      price,
      image: stain.image || galleryImages[0] || '',
      quantity: 1,
    });
    setShowCartPopup(true);
  };

  return (
    <>
      <Helmet>
        <title>{currentConfig.title || currentConfig.productName} | Heirloom Cribs and More</title>
        <meta name="description" content={currentConfig.metaDescription || currentConfig.description || ''} />
        <meta property="og:title" content={currentConfig.title || currentConfig.productName} />
        <meta property="og:description" content={currentConfig.metaDescription || currentConfig.description || ''} />
      </Helmet>
      <div className="container">
      <div className="grid-layout">
        <div className="product-showcase">
          <ProductGallery images={galleryImages} productName={currentConfig.productName} />
        </div>

        {showStainStep && (
          <button
            type="button"
            className="stain-reel-launcher"
            onClick={() => setShowStainReel(true)}
            aria-label={`Browse ${inStockStainCount} finishes`}
          >
            <span
              className="stain-reel-launcher-swatch"
              style={currentStainData?.image ? { backgroundImage: `url(${currentStainData.image})` } : undefined}
            />
            <span className="stain-reel-launcher-text">
              <span className="label-caps">Finish</span>
              <span className="stain-reel-launcher-name">{selection.stain || 'Choose a finish'}</span>
            </span>
            <span className="stain-reel-launcher-cta">
              <span className="material-symbols-outlined" aria-hidden="true">swipe_vertical</span>
              Browse {inStockStainCount}
            </span>
          </button>
        )}

        <div className="configuration-panel">
          <h2 className="headline-xl" style={{ marginBottom: '24px' }}>{currentConfig.productName}</h2>
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
              onClick={() => { if (currentStainData) addStainToCart(currentStainData); }}
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

      {showStainReel && (
        <StainReel
          stains={currentConfig.stains}
          productName={currentConfig.productName}
          basePrice={basePrice}
          initialStain={selection.stain}
          onSelectStain={setUserStain}
          onAddToCart={(stain) => { addStainToCart(stain); setShowStainReel(false); }}
          onClose={() => setShowStainReel(false)}
        />
      )}

      {showCartPopup && (
        <CartPopup
          productName={currentConfig.productName}
          wood={selection.wood}
          stain={selection.stain}
          onClose={() => setShowCartPopup(false)}
        />
      )}
    </div>
    </>
  );
}
