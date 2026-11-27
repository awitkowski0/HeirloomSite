'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import InvoiceModelNote from '@/components/checkout/InvoiceModelNote';
import RegistryActions from '@/components/selections/RegistryActions';
import { removeSaved, useSelections } from '@/context/selectionsStore';
import { useCart } from '@/context/useCart';
import { hasBundlePrice } from '@/lib/bundle-prices';
import { chargedUnitPrices } from '@/lib/cart-pricing';
import type { RegistryLine } from '@/lib/babylist';
import { formatPrice } from '@/lib/format';
import { variantLabel } from '@/lib/labels';
import { liveChatEnabled, openLiveChat } from '@/lib/live-chat';
import { capture } from '@/lib/posthog-client';
import { PUBLISHED_EMAIL, PUBLISHED_PHONE, PUBLISHED_PHONE_TEL } from '@/lib/published-contact';

/**
 * The right-hand column on wide screens: the cart above, a way to reach us
 * below.
 *
 * Desktop only, and switched in CSS (see `.side-rail` in globals.css): under
 * 1200px there is not room for it beside the content, and phones already have
 * the cart and Help in the bottom nav. It is one tree that CSS hides, not a
 * second variant of something already on the page, and its thumbnails are
 * next/image (lazy), so a hidden rail fetches no images.
 *
 * On /checkout the cart half is dropped: the checkout page's own Order Summary
 * is the cart there, and two of them side by side is one too many.
 *
 * Line prices come from chargedUnitPrices, the same figures checkout shows,
 * so a kit whose crib has left the cart reads at its list price here too. The
 * server still prices the order itself; nothing here is sent anywhere.
 *
 * Tabs: Cart, Saved (pieces kept with Save, src/context/selectionsStore.ts)
 * and Babylist (send saved pieces to a registry). Cart lines carry no product
 * slug, so they cannot link back to their page for Babylist; save a piece to
 * send it. A "Comparing N" line links to /compare once two are picked.
 */
type Tab = 'cart' | 'saved' | 'babylist';
export default function SideRail() {
  const pathname = usePathname();
  const { cart, hydrated, removeFromCart } = useCart();
  const lines = useMemo(() => (hydrated ? cart : []), [cart, hydrated]);
  const unitPrices = useMemo(() => chargedUnitPrices(lines, hasBundlePrice), [lines]);
  const total = lines.reduce((sum, line, i) => sum + unitPrices[i] * line.quantity, 0);
  const onCheckout = Boolean(pathname?.startsWith('/checkout'));
  const { saved, compare } = useSelections();
  const [tab, setTab] = useState<Tab>('cart');
  // Selections come from localStorage too, so wait for the same hydration.
  const savedShown = useMemo(() => (hydrated ? saved : []), [hydrated, saved]);
  const comparing = hydrated ? compare.length : 0;
  const registryLines = useMemo<RegistryLine[]>(
    () =>
      savedShown.map(p => ({
        key: p.slug,
        title: p.finish ? `${p.name}, ${p.finish}` : p.name,
        image: p.image,
        href: p.href,
        price: p.price,
      })),
    [savedShown],
  );
  const counts: Record<Tab, number> = { cart: lines.length, saved: savedShown.length, babylist: 0 };
  const TABS: readonly { id: Tab; label: string }[] = [
    { id: 'cart', label: 'Cart' },
    { id: 'saved', label: 'Saved' },
    { id: 'babylist', label: 'Babylist' },
  ];

  return (
    <aside className="side-rail" aria-label="Your cart and help">
      {!onCheckout && (
        <section className="side-rail-cart" aria-labelledby="side-rail-cart-title">
          <h2 id="side-rail-cart-title" className="side-rail-title">
            Your nursery
          </h2>
          <div className="side-rail-tabs" role="tablist" aria-label="Your nursery">
            {TABS.map(t => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => setTab(t.id)}
              >
                {t.label}
                {counts[t.id] > 0 ? ` (${counts[t.id]})` : ''}
              </button>
            ))}
          </div>
          {comparing >= 2 && (
            <p className="side-rail-compare">
              Comparing {comparing} ·{' '}
              <Link href="/compare" className="side-rail-remove">
                See them side by side
              </Link>
            </p>
          )}
          {tab === 'saved' &&
            (savedShown.length === 0 ? (
              <p className="body-md text-on-surface-variant side-rail-empty">Pieces you save show up here.</p>
            ) : (
              <ul className="side-rail-lines">
                {savedShown.map(p => (
                  <li key={p.slug} className="side-rail-line">
                    <span className="side-rail-thumb">
                      {p.image ? <Image src={p.image} alt="" fill sizes="48px" /> : null}
                    </span>
                    <div className="side-rail-line-body">
                      <Link href={p.href} className="side-rail-line-name">
                        {p.name}
                      </Link>
                      {p.finish && <span className="side-rail-line-meta">{p.finish}</span>}
                      <span className="side-rail-line-meta">
                        {formatPrice(p.price)}
                        {' · '}
                        <button
                          type="button"
                          className="side-rail-remove"
                          onClick={() => removeSaved(p.slug)}
                          aria-label={`Remove ${p.name} from saved`}
                        >
                          Remove
                        </button>
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            ))}
          {tab === 'babylist' && <RegistryActions lines={registryLines} />}
          {tab !== 'cart' ? null : !hydrated ? null : lines.length === 0 ? (
            <p className="body-md text-on-surface-variant side-rail-empty">Your cart is empty.</p>
          ) : (
            <>
              <ul className="side-rail-lines">
                {lines.map((line, i) => {
                  const finish = variantLabel(line.wood, line.stainName);
                  return (
                    <li key={line.id} className="side-rail-line">
                      <span className="side-rail-thumb">
                        {line.image ? <Image src={line.image} alt="" fill sizes="48px" /> : null}
                      </span>
                      <div className="side-rail-line-body">
                        <span className="side-rail-line-name">
                          {line.productName}
                          {line.quantity > 1 ? ` × ${line.quantity}` : ''}
                        </span>
                        {finish && <span className="side-rail-line-meta">{finish}</span>}
                        <span className="side-rail-line-meta">
                          {formatPrice(unitPrices[i] * line.quantity)}
                          {' · '}
                          <button
                            type="button"
                            className="side-rail-remove"
                            onClick={() => removeFromCart(line.id)}
                            aria-label={`Remove ${line.productName}`}
                          >
                            Remove
                          </button>
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
              <p className="side-rail-total">
                <span>Total</span>
                <span>{formatPrice(total)}</span>
              </p>
              <Link href="/checkout" className="button-primary side-rail-checkout">
                Check out
              </Link>
              <InvoiceModelNote className="text-on-surface-variant side-rail-note" />
            </>
          )}
        </section>
      )}

      <section className="side-rail-help" aria-labelledby="side-rail-help-title">
        <h2 id="side-rail-help-title" className="side-rail-title">
          Questions?
        </h2>
        {liveChatEnabled ? (
          <button
            type="button"
            className="button-secondary side-rail-chat"
            onClick={() => {
              capture('live_chat_opened', { path: pathname });
              openLiveChat();
            }}
          >
            Chat with us
          </button>
        ) : (
          <Link href="/contact" className="button-secondary side-rail-chat">
            Message us
          </Link>
        )}
        <p className="text-on-surface-variant side-rail-contact">
          Call <a href={`tel:${PUBLISHED_PHONE_TEL}`}>{PUBLISHED_PHONE}</a> or{' '}
          {/* The address is 43 characters and the rail is 260px of text; it
              broke mid-word. It is printed in full on /contact and the footer. */}
          <a href={`mailto:${PUBLISHED_EMAIL}`}>email us</a>.
        </p>
      </section>
    </aside>
  );
}
