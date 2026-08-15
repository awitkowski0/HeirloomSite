'use client';

import { useState, useMemo, useEffect, type ReactNode } from 'react';
import { productAddedToCart, productViewed, variantConfigured } from '@/lib/analytics';
import { useCart } from '@/context/useCart';
import { cartItemId } from '@/context/CartContext';
import ProductGallery from './ProductGallery';
import WoodSelector from './WoodSelector';
import StainSelector from './StainSelector';
import CartPopup from './CartPopup';
import PurchaseAssurances from './PurchaseAssurances';
import BundleBuilder from './BundleBuilder';
import { formatPrice } from '@/lib/format';
import { variantLabel as formatVariant } from '@/lib/labels';
import { variantHref } from '@/lib/variants';
import { useDelistedProducts } from '@/lib/useDelistedProducts';
import type { InventoryItem, Stain, VariantType } from '@/types';

/**
 * What to call the variant selector, keyed on the product's declared type.
 *
 * This was a heuristic that sniffed the variant strings for quote marks, "x ",
 * "FT" and "feet". It mislabelled everything it did not anticipate as the
 * generic "Select Option" - which is what the eleven finish-variant products
 * got - and on the seven products whose variants had been flattened to
 * "BrownMaple / Antique Slate" it also meant `showStainStep` was false, so the
 * finish selector never rendered at all. The type is now declared in
 * product.json and validated against the data at build time.
 */
const VARIANT_LABELS: Record<VariantType, string | null> = {
  wood: 'Select Wood Species',
  size: 'Select Size',
  finish: 'Select Finish',
  none: null,
};

function firstInStock(config: InventoryItem | undefined): string {
  return config?.stains.find((s: Stain) => s.inStock)?.name || '';
}

interface Props {
  productName: string;
  configurations: InventoryItem[];
  slug: string;
  /*
   * The <h1> and the description, rendered by the server page and slotted in.
   *
   * They belong to this component's LAYOUT - the name sits above the photo on
   * a phone and beside it on a desktop, and the description is the last thing
   * in the decision column - but not to its behaviour. Passing them as nodes
   * keeps them server-rendered, which matters for the description: the page
   * splits its paragraphs and substitutes real <Link>s for "Safety page" and
   * "Get Personal Assistance", and none of that should cross into the client
   * bundle just to be positioned.
   */
  title: ReactNode;
  description: ReactNode;
  /** Resolved on the server from the URL path, so the correct configuration is
      in the initial HTML rather than applied after hydration. */
  initialWood: string;
  initialStain: string | null;
}

export default function ProductConfigurator({
  productName,
  configurations,
  slug,
  title,
  description,
  initialWood,
  initialStain,
}: Props) {
  const { addToCart } = useCart();
  const [userWood, setUserWood] = useState<string | null>(initialWood);
  const [userStain, setUserStain] = useState<string | null>(initialStain);
  const [showCartPopup, setShowCartPopup] = useState(false);

  /*
   * Bundle items start ticked, so this is seeded from the catalogue rather
   * than empty. Keyed on slug because that is what the toggle and the cart
   * line both need, and it is stable across a wood or finish change - the
   * conversion kits do not depend on the crib's finish.
   */
  const { isDelisted } = useDelistedProducts();
  // A de-listed kit must not be offered as a tickbox, and a de-listed dresser
  // must not be recommended; both would add it straight to a cart.
  const bundleItems = (configurations[0]?.bundle ?? []).filter(b => !isDelisted(b.slug));
  // Display only - already inside the crib's price, never added to the cart.
  const includedItems = (configurations[0]?.includes ?? []).filter(i => !isDelisted(i.slug));
  const [bundleSelected, setBundleSelected] = useState<Set<string>>(
    () => new Set(bundleItems.map(i => i.slug))
  );
  /*
   * What pressing Add to Cart will actually put in the cart. Derived rather
   * than tracked, so it cannot drift from the loop in handleAddToCart.
   */
  const selectedBundleItems = bundleItems.filter(i => bundleSelected.has(i.slug));

  const toggleBundleItem = (slug: string) =>
    setBundleSelected(prev => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });

  const woods = useMemo(() => configurations.map(c => c.wood), [configurations]);
  const variantType = configurations[0]?.variantType ?? 'none';
  const variantLabel = VARIANT_LABELS[variantType];
  // Only a wood-variant product has a separate finish axis; for a finish-variant
  // product the variant selector IS the finish selector.
  const showStainStep = variantType === 'wood';
  const showDeliveryMessage = variantType === 'wood';

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

  // What the Add to Cart button will add, and what it will come to.
  const addedCount = 1 + selectedBundleItems.length;
  const cartTotal = totalPrice + selectedBundleItems.reduce((sum, i) => sum + i.price, 0);
  const hasBundle = includedItems.length > 0 || bundleItems.length > 0;


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

    /*
     * Each ticked kit is added as its OWN line, at its own price, not folded
     * into the crib's. They are separate products with separate SKUs, and an
     * invoice that says "Addison Crib $4,088" instead of naming the rail kits
     * is not a document anyone can check against what arrives.
     *
     * `wood` and `stainName` are non-null for every bundle entry - build-data
     * rejects a bundle target that has real choices, precisely so this cannot
     * put an arbitrary finish in the cart - but they are typed nullable
     * because `related` shares the type, so this narrows rather than asserts.
     */
    for (const bundleItem of bundleItems) {
      if (!bundleSelected.has(bundleItem.slug)) continue;
      if (!bundleItem.wood || !bundleItem.stainName) continue;
      const line = {
        productName: bundleItem.productName,
        wood: bundleItem.wood,
        stainName: bundleItem.stainName,
      };
      productAddedToCart({
        product_name: line.productName,
        wood: line.wood,
        stain: line.stainName,
        price: bundleItem.price,
        quantity: 1,
      });
      addToCart({
        ...line,
        id: cartItemId(line),
        price: bundleItem.price,
        image: bundleItem.image || '',
        quantity: 1,
      });
    }

    setShowCartPopup(true);
  };

  /*
   * One button, rendered twice.
   *
   * The primary sits in the decision column; the second sits under the bundle,
   * because that is where the last decision is actually taken - you tick the
   * mattress and then you are done, and the first button is a column away and
   * usually off-screen by then.
   *
   * Deliberately the SAME action, not a separate "add the bundle": two buttons
   * that add different subsets of one order is how someone ends up with two
   * cribs. Both add the crib and whatever is ticked, and CartPopup confirms
   * what went in either way.
   *
   * Described once so the label - which counts what the click will add - can
   * never say one thing in one place and something else in the other.
   */
  const addToCartButton = (
    <button
      type="button"
      className="add-to-cart"
      disabled={!selection.stain}
      onClick={handleAddToCart}
    >
      {!selection.stain
        ? 'OUT OF STOCK'
        : addedCount > 1
          ? `ADD ${addedCount} ITEMS — ${formatPrice(cartTotal)}`
          : 'ADD TO CART'}
    </button>
  );

  return (
    <>
      <div className="product-layout">
        {/*
          The name is a direct child of the grid, not part of either column.
          On a phone it is the first thing on the page, above the photograph;
          from 1024px it is the top of the decision column beside it. Named
          grid areas put one element in both places, rather than mounting the
          heading twice and hiding one, which is the arrangement AGENTS.md
          rules out.
        */}
        {title}

        <div className="product-showcase">
          <ProductGallery images={galleryImages} productName={productName} priority />

          {/*
            Under the photograph, not in the decision column and not at the
            foot of the page.
            
            In the column it sat between the finish picker and the price, so a
            five-row box with its own total pushed the price of the thing being
            configured most of a screen down. At the foot of the page it was
            below the buy button - and every row is ticked by default, so a
            customer who never scrolled that far would have had four extra
            products added by a button they pressed before seeing them.
          */}
          <BundleBuilder
            productName={currentConfig.productName}
            basePrice={totalPrice}
            baseImage={galleryImages[0] || ''}
            included={includedItems}
            items={bundleItems}
            selected={bundleSelected}
            onToggle={toggleBundleItem}
          />

          {/* The bundle is where the last decision gets made, so the commit
              belongs here too rather than only a column away. */}
          {hasBundle && <div className="bundle-cta">{addToCartButton}</div>}
        </div>

        {/*
          One column, in the order the decision is actually made: what it
          costs, what it comes in, buy it, then the copy that justifies it.
          The price used to sit BELOW the variant pickers and the bundle,
          which put the two things being weighed against each other - the
          photograph and the price - at opposite ends of a scroll.
        */}
        <div className="configuration-panel">
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

          <section className="action-section">
            {/*
              The label counts what the click will actually add.

              A ticked add-on adds its own cart line, so the button can be
              putting two products and $3,178 in the cart rather than one and
              $2,868 - and the bundle it was ticked in is a column away, below
              the fold on a laptop. The button has to be the thing that tells
              the truth about its own consequences.
            */}
            {addToCartButton}

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

            {/* Replaces a single "Expected delivery: 6-8 weeks" line. That
                answered the least important of the four questions a first-time
                buyer has, and left the other three - cost of delivery, safety,
                who to ask - unanswered at the point of decision. */}
            {showDeliveryMessage && <PurchaseAssurances />}
          </section>

          {description}
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
