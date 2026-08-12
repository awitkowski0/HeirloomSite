'use client';

import { useState, useMemo, useEffect } from 'react';
import { productAddedToCart, productViewed, variantConfigured } from '@/lib/analytics';
import { useCart } from '@/context/useCart';
import { cartItemId } from '@/context/CartContext';
import ProductGallery from './ProductGallery';
import WoodSelector from './WoodSelector';
import StainSelector from './StainSelector';
import CartPopup from './CartPopup';
import { formatPrice } from '@/lib/format';
import { variantLabel as formatVariant } from '@/lib/labels';
import { variantHref } from '@/lib/variants';
import type { InventoryItem, Stain } from '@/types';

const WOOD_SPECIES = ['brownmaple', 'cherrywood', 'redoak'];

function getVariantLabel(woods: string[]): string | null {
  if (woods.length <= 1 && woods[0] === 'Default Title') return null;
  if (woods.some(w => WOOD_SPECIES.includes(w.toLowerCase().replace(/\s/g, '')))) return 'Select Wood Species';
  if (woods.some(w => w.includes('"') || w.includes('x ') || w.includes('FT') || w.toLowerCase().includes('feet')))
    return 'Select Size';
  return 'Select Option';
}

function isHandcraftedWood(woods: string[]): boolean {
  return woods.some(w => WOOD_SPECIES.includes(w.toLowerCase().replace(/\s/g, '')));
}

function firstInStock(config: InventoryItem | undefined): string {
  return config?.stains.find((s: Stain) => s.inStock)?.name || '';
}

interface Props {
  productName: string;
  configurations: InventoryItem[];
  slug: string;
  /** Resolved on the server from the URL path, so the correct configuration is
      in the initial HTML rather than applied after hydration. */
  initialWood: string;
  initialStain: string | null;
}

export default function ProductConfigurator({
  productName,
  configurations,
  slug,
  initialWood,
  initialStain,
}: Props) {
  const { addToCart } = useCart();
  const [userWood, setUserWood] = useState<string | null>(initialWood);
  const [userStain, setUserStain] = useState<string | null>(initialStain);
  const [showCartPopup, setShowCartPopup] = useState(false);

  const woods = useMemo(() => configurations.map(c => c.wood), [configurations]);
  const variantLabel = getVariantLabel(woods);
  const showStainStep = variantLabel === 'Select Wood Species';
  const showDeliveryMessage = isHandcraftedWood(woods);

  /**
   * Legacy ?wood= / ?stain= links only.
   *
   * The current form is a path - /product/bloomington/cherry_wood/antique_slate
   * - resolved on the server, so the right configuration is in the HTML a
   * crawler sees. This effect exists for links shared before that change.
   *
   * It stays an effect rather than useSearchParams(), which would opt the whole
   * route out of static prerendering.
   */
  /* eslint-disable react-hooks/set-state-in-effect --
     A one-shot read of browser-only state applied after hydration; there is no
     external store to subscribe to, and this cannot run during render. */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const woodParam = params.get('wood');
    const stainParam = params.get('stain');
    if (woodParam && woods.includes(woodParam)) setUserWood(woodParam);
    if (stainParam) {
      const target = configurations.find(c => c.wood === (woodParam || configurations[0]?.wood));
      if (target?.stains.some(s => s.name === stainParam && s.inStock)) setUserStain(stainParam);
    }
  }, [configurations, woods]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const selection = useMemo(() => {
    if (configurations.length === 0) return { wood: '', stain: '' };
    const activeWood = userWood && woods.includes(userWood) ? userWood : configurations[0].wood;
    const config = configurations.find(c => c.wood === activeWood) ?? configurations[0];
    const stainIsValid = userStain && config.stains.some(s => s.name === userStain && s.inStock);
    return { wood: activeWood, stain: stainIsValid ? userStain : firstInStock(config) };
  }, [configurations, woods, userWood, userStain]);

  const currentConfig = configurations.find(c => c.wood === selection.wood) ?? configurations[0];
  const currentStain = currentConfig?.stains.find(s => s.name === selection.stain);

  const galleryImages = useMemo(() => {
    const out: string[] = [];
    if (currentStain?.gallery?.length) {
      for (const g of currentStain.gallery) if (g.url) out.push(g.url);
      if (currentStain.image && !out.includes(currentStain.image)) out.unshift(currentStain.image);
    } else if (currentStain?.image) {
      out.push(currentStain.image);
    } else if (currentConfig?.stains[0]?.image) {
      out.push(currentConfig.stains[0].image);
    }
    return out;
  }, [currentStain, currentConfig]);

  /*
   * Funnel step 1, fired once per product page.
   *
   * The old 'product_view' capture was keyed on wood and stain, so it re-fired
   * on every swatch click and one visit produced a dozen "views" - which made
   * the top of the funnel meaningless. The dependency array is the product
   * name alone, deliberately: changing a finish is step 2, not another view.
   */
  useEffect(() => {
    if (!productName) return;
    productViewed({
      product_name: productName,
      product_category: configurations[0]?.category ?? null,
      price: (configurations[0]?.basePrice as number) ?? 0,
    });
  }, [productName, configurations]);

  if (!currentConfig) return null;

  const basePrice = Number(currentConfig.basePrice) || 0;
  const addition = Number(currentStain?.priceAddition) || 0;
  const totalPrice = basePrice + addition;

  /*
   * Keep the address bar on the configuration being shown, so the URL is
   * always the one worth copying.
   *
   * history.replaceState, not router.replace: this is the same page with a
   * different variant already in memory, so a Next navigation would re-render
   * the tree to reach a state we are already in. replaceState also does not
   * stack a history entry per swatch, so Back still leaves the product rather
   * than walking eleven finishes.
   */
  const syncUrl = (wood: string, stain: string | null) => {
    window.history.replaceState(null, '', variantHref(slug, wood, stain));
  };

  // Funnel step 2. Fires on interaction rather than on render, so it measures
  // intent - a visitor who touched a control - not merely arriving on a page.
  const handleStainChange = (stain: string) => {
    setUserStain(stain);
    syncUrl(selection.wood, stain);
    variantConfigured({
      product_name: productName,
      wood: selection.wood,
      stain,
      field: 'stain',
    });
  };

  const handleWoodChange = (wood: string) => {
    variantConfigured({ product_name: productName, wood, stain: selection.stain, field: 'wood' });
    const nextStain = firstInStock(configurations.find(c => c.wood === wood)) || null;
    setUserWood(wood);
    setUserStain(nextStain);
    syncUrl(wood, nextStain);
  };

  const isWoodSoldOut = (wood: string) => {
    const config = configurations.find(c => c.wood === wood);
    return config ? !config.stains.some(s => s.inStock) : true;
  };

  const handleAddToCart = () => {
    const item = {
      productName: currentConfig.productName,
      wood: selection.wood,
      stainName: selection.stain,
    };
    productAddedToCart({
      product_name: item.productName,
      wood: item.wood,
      stain: item.stainName,
      price: totalPrice,
      quantity: 1,
    });
    addToCart({
      ...item,
      id: cartItemId(item),
      price: totalPrice,
      image: galleryImages[0] || '',
      quantity: 1,
    });
    setShowCartPopup(true);
  };

  return (
    <>
      <div className="grid-layout">
        <div className="product-showcase">
          <ProductGallery images={galleryImages} productName={productName} priority />
        </div>

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

          {/* One instance. Its layout - horizontal swatch rail vs. vertical
              list with text - is decided in CSS, not by mounting twice. */}
          {showStainStep && (
            <StainSelector
              stains={currentConfig.stains}
              selected={selection.stain}
              onSelect={handleStainChange}
            />
          )}

          <section className="pricing-section">
            <div className="price-row">
              <span className="headline-lg price-current">{formatPrice(totalPrice)}</span>
            </div>
            <p role="status" aria-live="polite" className="visually-hidden">
              {selection.stain
                ? `Selected: ${formatVariant(selection.wood, selection.stain)}. ${formatPrice(totalPrice)}.`
                : ''}
            </p>
          </section>

          <section className="action-section">
            <button
              type="button"
              className="add-to-cart"
              disabled={!selection.stain}
              onClick={handleAddToCart}
            >
              {selection.stain ? 'ADD TO CART' : 'OUT OF STOCK'}
            </button>

            <button
              type="button"
              className="babylist-btn button-secondary"
              onClick={() => {
                const bl = (
                  window as typeof window & {
                    bl?: { addToRegistry: (d: Record<string, string>) => void };
                  }
                ).bl;
                bl?.addToRegistry?.({
                  images: galleryImages[0] || '',
                  price: String(totalPrice),
                  title: currentConfig.productName,
                  url: window.location.href,
                });
              }}
            >
              Add to Babylist
            </button>

            {showDeliveryMessage && (
              <p className="label-caps delivery-info">
                Expected delivery: 6-8 weeks &bull; Handcrafted for you
              </p>
            )}
          </section>
        </div>
      </div>

      <CartPopup
        open={showCartPopup}
        productName={currentConfig.productName}
        wood={selection.wood}
        stain={selection.stain}
        onClose={() => setShowCartPopup(false)}
      />
    </>
  );
}
