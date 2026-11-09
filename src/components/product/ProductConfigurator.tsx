'use client';

import { useState, useMemo, useEffect, useRef, type ReactNode } from 'react';
import { productAddedToCart, productViewed, variantConfigured } from '@/lib/analytics';
import { useCart } from '@/context/useCart';
import { cartItemId } from '@/context/CartContext';
import ProductGallery from './ProductGallery';
import WoodSelector from './WoodSelector';
import StainSelector from './StainSelector';
import PurchaseAssurances from './PurchaseAssurances';
import { showsPurchaseAssurances } from '@/lib/delivery-line';
import BundleBuilder from './BundleBuilder';
import FinishWall from './FinishWall';
import PieceActions from '@/components/selections/PieceActions';
import TalkToPerson from '@/components/layout/TalkToPerson';
import { recordInterest } from '@/lib/interest/store';
import { finishDisplayName } from '@/lib/names';
import { toast } from '@/lib/toast';
import { preloadBabylist, registryTitle, sendToBabylist, type RegistryLine } from '@/lib/babylist';
import type { ShopItem } from '@/lib/shop';
import { formatPrice } from '@/lib/format';
import { humanizeWood, variantLabel as formatVariant } from '@/lib/labels';
import { stainLabel } from '@/lib/stainColors';
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
  /** The builder credit, under the name and price. */
  byline?: ReactNode;
  /** What this piece can be. */
  tags?: ReactNode;
  /** A note about something in the photo. */
  photoNote?: string | null;
  /** Why this price, who makes it, and what they say about safety. */
  details?: ReactNode;
  /** Absent for the unlisted kits and mattress. */
  shopItem?: ShopItem;
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
  byline,
  tags,
  photoNote,
  details,
  shopItem,
  description,
  initialWood,
  initialStain,
}: Props) {
  const { addToCart } = useCart();
  const [userWood, setUserWood] = useState<string | null>(initialWood);
  const [userStain, setUserStain] = useState<string | null>(initialStain);
  const addButton = useRef<HTMLButtonElement>(null);
  const [addOffScreen, setAddOffScreen] = useState(false);
  const [registryState, setRegistryState] = useState<{ key: string; result: 'sent' | 'unavailable' } | null>(null);

  /*
   * Keyed on slug because that is what the toggle and the cart line both need,
   * and it is stable across a wood or finish change - the conversion kits do
   * not depend on the crib's finish.
   */
  const { isDelisted } = useDelistedProducts();
  // A de-listed kit must not be offered as a tickbox, and a de-listed dresser
  // must not be recommended; both would add it straight to a cart.
  const bundleItems = (configurations[0]?.bundle ?? []).filter(b => !isDelisted(b.slug));
  // Display only - already inside the crib's price, never added to the cart.
  const includedItems = (configurations[0]?.includes ?? []).filter(i => !isDelisted(i.slug));
  // Nothing starts ticked: every row is an optional paid add-on, and the price
  // on the button should be the price of the piece until someone chooses more.
  const [bundleSelected, setBundleSelected] = useState<Set<string>>(() => new Set());
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
  // Every furniture order carries a delivery charge, so the assurance block
  // (delivery tiers etc.) follows the category, not the variant type.
  const showDeliveryMessage = showsPurchaseAssurances(configurations[0]?.category);

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
   * The finishes the phone scroll preview rolls through, in picker order.
   *
   * Whichever axis is the colour: the stains under the selected wood for a
   * `wood` product, the variants themselves for a `finish` one. Out-of-stock
   * and image-less finishes are left out - previewing something that cannot
   * be bought, or a blank, is a dead end. `size` and `none`
   * products get no feed.
   */
  const feedItems = useMemo(() => {
    if (variantType === 'wood') {
      return (currentConfig?.stains ?? [])
        .filter(s => s.inStock && s.image)
        .map(s => ({ key: s.name, label: stainLabel(s.name), image: s.image! }));
    }
    if (variantType === 'finish') {
      return configurations.flatMap(c => {
        const stain = c.stains.find(s => s.inStock && s.image);
        return stain ? [{ key: c.wood, label: humanizeWood(c.wood), image: stain.image! }] : [];
      });
    }
    return [];
  }, [variantType, currentConfig, configurations]);

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
    recordInterest({ kind: 'view', slug });
    productViewed({
      product_name: productName,
      product_category: configurations[0]?.category ?? null,
      price: (configurations[0]?.basePrice as number) ?? 0,
    });
  }, [productName, configurations, slug]);

  /* The sticky add bar appears only once the real button has scrolled away. */
  useEffect(() => {
    const target = addButton.current;
    if (!target) return;
    const observer = new IntersectionObserver(([entry]) => setAddOffScreen(!entry.isIntersecting));
    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  if (!currentConfig) return null;

  const basePrice = Number(currentConfig.basePrice) || 0;
  const addition = Number(currentStain?.priceAddition) || 0;
  const totalPrice = basePrice + addition;

  // What the Add to Cart button will add, and what it will come to.
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
    recordInterest({ kind: 'finish_chosen', slug, finish: stain });
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
    if (variantType === 'finish') recordInterest({ kind: 'finish_chosen', slug, finish: wood });
  };

  const feedKey = variantType === 'wood' ? selection.stain : selection.wood;
  const feed = {
    items: feedItems,
    activeIndex: feedItems.findIndex(i => i.key === feedKey),
    onChoose: (i: number) => {
      const key = feedItems[i].key;
      if (variantType === 'wood') handleStainChange(key);
      else handleWoodChange(key);
    },
  };

  const isWoodSoldOut = (wood: string) => {
    const config = configurations.find(c => c.wood === wood);
    return config ? !config.stains.some(s => s.inStock) : true;
  };

  const rawFinish = variantType === 'wood' ? selection.stain : variantType === 'finish' ? selection.wood : null;
  const finishForShopper = rawFinish ? finishDisplayName(humanizeWood(rawFinish)) : null;

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
      slug,
      price: totalPrice,
      image: galleryImages[0] || '',
      quantity: 1,
      /*
       * Carried so the cart can show the whole order - the conversion rails and
       * the guard rail arrive with the crib and a buyer should see that before
       * they wonder whether to order them.
       *
       * Display only. These are already inside the crib's price, they are not
       * separate cart lines, and CheckoutClient does not send them: the server
       * would re-price each one from the catalogue and bill $910 of parts a
       * second time, which is the bug that separated `includes` from `bundle`
       * in the first place.
       */
      includes: includedItems.map(i => ({ productName: i.productName, image: i.image })),
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
        // Only an overridden row names its parent; the server re-derives the
        // price from that parent's catalogue entry and ignores this line's price.
        ...(bundleItem.bundleOverride
          ? { bundledWith: { productName: currentConfig.productName, wood: selection.wood } }
          : {}),
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
        slug: bundleItem.slug,
        price: bundleItem.price,
        ...(bundleItem.bundleOverride && typeof bundleItem.listPrice === 'number'
          ? { listPrice: bundleItem.listPrice }
          : {}),
        image: bundleItem.image || '',
        quantity: 1,
      });
    }

    recordInterest({ kind: 'add_to_cart', slug, finish: finishForShopper ?? undefined });
    toast(`In your cart: ${currentConfig.productName}${finishForShopper ? `, ${finishForShopper}` : ''}`);
  };

  const addLabel = selection.stain ? `Add to order · ${formatPrice(cartTotal)}` : 'Out of stock';
  const finishName = formatVariant(selection.wood, selection.stain);

  const registryLine: RegistryLine = {
    key: `${slug}:${selection.wood}:${selection.stain}`,
    title: registryTitle(currentConfig.productName, finishName || null),
    image: galleryImages[0] || '',
    href: finishName ? variantHref(slug, selection.wood, selection.stain) : `/product/${slug}`,
    price: totalPrice,
  };
  const registryResult = registryState?.key === registryLine.key ? registryState.result : null;

  return (
    <>
      <div className="pdp">
        <div className="pdp-media">
          <ProductGallery images={galleryImages} productName={productName} priority />
          {feedItems.length > 1 || photoNote ? (
            <p className="small pdp-caption">
              {feedItems.length > 1 ? 'Colors are digital previews of one photo. ' : ''}
              {photoNote ?? ''}
            </p>
          ) : null}
        </div>

        <div className="pdp-info">
          {title}
          <p className="pdp-price">
            {formatPrice(totalPrice)}
            {finishForShopper ? <span className="small"> in {finishForShopper}</span> : null}
          </p>
          {byline}

          <p role="status" aria-live="polite" className="visually-hidden">
            {selection.stain ? `${finishName ? `Selected: ${finishName}. ` : ''}${formatPrice(totalPrice)}.` : ''}
          </p>

          {variantLabel && (variantType === 'size' || (variantType === 'wood' && woods.length > 1)) && (
            <WoodSelector woods={woods} selected={selection.wood} onSelect={handleWoodChange} disabled={isWoodSoldOut} label={variantLabel} />
          )}

          {feedItems.length > 1 && <FinishWall tiles={feedItems} active={feed.activeIndex} onChoose={feed.onChoose} />}

          {showStainStep && feedItems.length < 2 && (
            <StainSelector stains={currentConfig.stains} selected={selection.stain} onSelect={handleStainChange} />
          )}

          {hasBundle && <BundleBuilder included={includedItems} items={bundleItems} selected={bundleSelected} onToggle={toggleBundleItem} />}

          <button ref={addButton} type="button" className="btn btn--wide" disabled={!selection.stain} onClick={handleAddToCart}>
            {addLabel}
          </button>

          <p className="card-actions pdp-actions">
            {shopItem && <PieceActions item={shopItem} finish={finishForShopper} />}
            {registryResult === 'sent' ? (
              <span className="small">Sent to Babylist</span>
            ) : (
              <button
                type="button"
                className="link"
                onPointerEnter={() => void preloadBabylist()}
                onFocus={() => void preloadBabylist()}
                onClick={() => {
                  const key = registryLine.key;
                  void sendToBabylist(registryLine).then(result => {
                    setRegistryState({ key, result });
                    if (result === 'sent') recordInterest({ kind: 'babylist', slug });
                  });
                }}
              >
                Add to Babylist
              </button>
            )}
          </p>
          {registryResult === 'unavailable' && (
            <p className="registry-note" role="status">Babylist’s button isn’t available in this browser. Copy this page’s address and add it on Babylist.</p>
          )}

          {tags}

          {showDeliveryMessage && <PurchaseAssurances />}
          <p className="pdp-help"><TalkToPerson piece={currentConfig.productName} label="Talk to someone about this" /></p>
        </div>

        <div className="pdp-below">
          {description}
          {details}
        </div>
      </div>

      {addOffScreen && (
        <div className="pdp-sticky">
          <button type="button" className="btn btn--wide" disabled={!selection.stain} onClick={handleAddToCart}>
            {selection.stain ? `Add · ${formatPrice(cartTotal)}` : 'Out of stock'}
          </button>
        </div>
      )}
    </>
  );
}
