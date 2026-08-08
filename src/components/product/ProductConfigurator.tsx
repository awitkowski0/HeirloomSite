'use client';

import { useState, useMemo, useEffect } from 'react';
import posthog from 'posthog-js';
import { useCart } from '@/context/useCart';
import { cartItemId } from '@/context/CartContext';
import ProductGallery from './ProductGallery';
import WoodSelector from './WoodSelector';
import StainSelector from './StainSelector';
import CartPopup from './CartPopup';
import { formatPrice } from '@/lib/format';
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
  slug: string;
  configurations: InventoryItem[];
}

export default function ProductConfigurator({ productName, slug, configurations }: Props) {
  const { addToCart } = useCart();
  const [userWood, setUserWood] = useState<string | null>(null);
  const [userStain, setUserStain] = useState<string | null>(null);
  const [showCartPopup, setShowCartPopup] = useState(false);

  const woods = useMemo(() => configurations.map(c => c.wood), [configurations]);
  const variantLabel = getVariantLabel(woods);
  const showStainStep = variantLabel === 'Select Wood Species';
  const showDeliveryMessage = isHandcraftedWood(woods);

  /**
   * ?wood= / ?stain= deep links are applied in a mount effect, not during
   * render.
   *
   * Two reasons. Reading window.location.search during render (what the old
   * code did) is not safe under SSR. And reading it via useSearchParams would
   * opt this whole route out of static prerendering, which is the point of the
   * migration. Server HTML therefore shows the default variant - correct for
   * the canonical URL - and the deep link applies after hydration.
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

  useEffect(() => {
    if (!currentConfig || !selection.stain) return;
    posthog.capture('product_view', {
      productName: currentConfig.productName,
      wood: selection.wood,
      stain: selection.stain,
      slug,
    });
  }, [currentConfig, selection.wood, selection.stain, slug]);

  if (!currentConfig) return null;

  const basePrice = Number(currentConfig.basePrice) || 0;
  const addition = Number(currentStain?.priceAddition) || 0;
  const totalPrice = basePrice + addition;

  const handleWoodChange = (wood: string) => {
    setUserWood(wood);
    setUserStain(firstInStock(configurations.find(c => c.wood === wood)) || null);
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
    posthog.capture('add_to_cart', { ...item, price: totalPrice });
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

        {showStainStep && (
          <StainSelector
            stains={currentConfig.stains}
            selected={selection.stain}
            onSelect={setUserStain}
            variant="strip"
          />
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
            <StainSelector
              stains={currentConfig.stains}
              selected={selection.stain}
              onSelect={setUserStain}
            />
          )}

          <section className="pricing-section">
            <div className="price-row">
              <span className="headline-lg price-current">{formatPrice(totalPrice)}</span>
            </div>
            <p role="status" aria-live="polite" className="visually-hidden">
              {selection.stain
                ? `Selected: ${selection.wood}, ${selection.stain}. ${formatPrice(totalPrice)}.`
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
