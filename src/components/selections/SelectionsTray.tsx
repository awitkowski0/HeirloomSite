'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCart } from '@/context/useCart';
import {
  MAX_COMPARE,
  onCompareOpen,
  onTrayOpen,
  removeSelection,
  toggleCompare,
  useSelections,
  type TrayTab,
} from '@/context/selectionsStore';
import { registryTitle, type RegistryLine } from '@/lib/babylist';
import { hasBundlePrice } from '@/lib/bundle-prices';
import { chargedUnitPrices } from '@/lib/cart-pricing';
import { formatPrice } from '@/lib/format';
import { variantLabel } from '@/lib/labels';
import type { ShopItem } from '@/lib/shop';
import { variantHref } from '@/lib/variants';
import TalkToPerson from '@/components/layout/TalkToPerson';
import CompareSpread from './CompareSpread';
import RegistryActions from './RegistryActions';
import '@/styles/selections.css';

type Step = 'crib' | 'mattress' | 'dresser' | 'nightstand' | 'kits';

const STEPS: readonly { id: Step; label: string; href: string }[] = [
  { id: 'crib', label: 'Crib', href: '/products/cribs' },
  { id: 'mattress', label: 'Mattress', href: '/product/crib-mattress' },
  { id: 'dresser', label: 'Dresser', href: '/products/dressers-changing-tables' },
  { id: 'nightstand', label: 'Nightstand', href: '/products/nightstands-storage' },
  { id: 'kits', label: 'Conversion kits', href: '/how-conversion-works' },
];

/* Cart lines carry a name and no category, so both sources resolve by name. */
function stepFor(name: string): Step {
  if (name === 'Crib Mattress') return 'mattress';
  if (/rail|guard|toddler bed/i.test(name)) return 'kits';
  if (/dresser|chest|changing/i.test(name)) return 'dresser';
  if (/nightstand/i.test(name)) return 'nightstand';
  return 'crib';
}

const CATALOG_ROUTES = /^\/($|products|product\/|collections|builders|search)/;

const TABS: readonly { id: TrayTab; label: string }[] = [
  { id: 'saved', label: 'Saved' },
  { id: 'compare', label: 'Compare' },
  { id: 'cart', label: 'Cart' },
  { id: 'registry', label: 'Registry' },
];

export default function SelectionsTray() {
  const pathname = usePathname();
  const { items, compare, compareExtras } = useSelections();
  const { cart, totalItems, hydrated, removeFromCart, subtotal } = useCart();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<TrayTab>('saved');
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => onCompareOpen(() => dialog.current?.showModal()), []);
  useEffect(
    () =>
      onTrayOpen(next => {
        setTab(next);
        setOpen(true);
      }),
    [],
  );

  const lines = useMemo(() => (hydrated ? cart : []), [cart, hydrated]);
  const unitPrices = useMemo(() => chargedUnitPrices(lines, hasBundlePrice), [lines]);

  const registryLines = useMemo<RegistryLine[]>(() => {
    const fromCart = lines.flatMap((line, i) => {
      if (!line.slug) return [];
      return [{
        key: `cart:${line.id}`,
        title: registryTitle(line.productName, variantLabel(line.wood, line.stainName) || null),
        image: line.image,
        // A kit's only variant is a placeholder, and has no page of its own.
        href: variantLabel(line.wood, line.stainName) ? variantHref(line.slug, line.wood, line.stainName) : `/product/${line.slug}`,
        price: unitPrices[i],
      }];
    });
    const inCart = new Set(lines.map(l => l.slug));
    const fromSaved = items.flatMap(item =>
      item.registry && !inCart.has(item.slug)
        ? [{ key: `saved:${item.slug}`, ...item.registry }]
        : [],
    );
    return [...fromCart, ...fromSaved];
  }, [lines, unitPrices, items]);

  const onCatalog = CATALOG_ROUTES.test(pathname ?? '');
  const done = new Set([...items.map(i => i.name), ...lines.map(l => l.productName)].map(stepFor));
  const compared = compare
    .map(slug => items.find(i => i.slug === slug) ?? compareExtras.find(i => i.slug === slug))
    .filter((i): i is ShopItem => Boolean(i));
  const cartCount = hydrated ? totalItems : 0;
  const count = items.length + cartCount;
  const progress = STEPS.filter(s => done.has(s.id)).length;
  const countFor: Record<TrayTab, number> = {
    saved: items.length,
    compare: compared.length,
    cart: cartCount,
    registry: registryLines.length,
  };

  const classes = ['tray'];
  if (pathname?.startsWith('/product/')) classes.push('tray--product');
  if (open) classes.push('tray--open');

  return (
    <>
      {onCatalog && (
        <aside className={classes.join(' ')} aria-label="Your Selections">
          <button type="button" className="tray-bar" aria-expanded={open} onClick={() => setOpen(o => !o)}>
            <span className="label-caps">Your Selections{count > 0 ? ` (${count})` : ''}</span>
            <span className="tray-progress" aria-hidden="true">
              {STEPS.map(s => <span key={s.id} className={done.has(s.id) ? 'tray-tick tray-tick--on' : 'tray-tick'} />)}
            </span>
            <span className="visually-hidden">{progress} of {STEPS.length} parts of your nursery chosen</span>
            <span className="material-symbols-outlined tray-chevron" aria-hidden="true">expand_less</span>
          </button>

          {open && (
            <div className="tray-panel">
              <section>
                <p className="label-caps tray-heading">Your Nursery</p>
                <ol className="tray-steps">
                  {STEPS.map(s => (
                    <li key={s.id}>
                      {done.has(s.id) ? (
                        <span className="tray-step tray-step--on"><span aria-hidden="true">✓</span> {s.label}</span>
                      ) : (
                        <Link href={s.href} className="tray-step">{s.label}</Link>
                      )}
                    </li>
                  ))}
                </ol>
              </section>

              <div className="tray-tabs" role="group" aria-label="Your Selections sections">
                {TABS.map(t => (
                  <button key={t.id} type="button" className="tray-tab" aria-pressed={tab === t.id} onClick={() => setTab(t.id)}>
                    {t.label}{countFor[t.id] > 0 ? ` (${countFor[t.id]})` : ''}
                  </button>
                ))}
              </div>

              {tab === 'saved' && (
                items.length === 0 ? (
                  <p className="tray-empty">Tap + Set aside on anything you want to keep looking at.</p>
                ) : (
                  <ul className="tray-items">
                    {items.map(item => (
                      <li key={item.slug} className="tray-row">
                        <span className="tray-thumb">
                          {item.image ? <Image src={item.image} alt="" fill sizes="56px" style={{ objectFit: 'contain' }} /> : null}
                        </span>
                        <Link href={`/product/${item.slug}`} className="tray-name">{item.name}</Link>
                        <button type="button" className="tray-remove" aria-label={`Remove ${item.name}`} onClick={() => removeSelection(item.slug)}>&times;</button>
                      </li>
                    ))}
                  </ul>
                )
              )}

              {tab === 'compare' && (
                <>
                  {items.length === 0 ? (
                    <p className="tray-empty">Set aside two or three pieces to see them side by side.</p>
                  ) : (
                    <ul className="tray-items">
                      {items.map(item => (
                        <li key={item.slug} className="tray-row">
                          <span className="tray-thumb">
                            {item.image ? <Image src={item.image} alt="" fill sizes="56px" style={{ objectFit: 'contain' }} /> : null}
                          </span>
                          <span className="tray-name">{item.name}</span>
                          <label className="tray-compare">
                            <input
                              type="checkbox"
                              checked={compare.includes(item.slug)}
                              disabled={!compare.includes(item.slug) && compare.length >= MAX_COMPARE}
                              onChange={() => toggleCompare(item.slug)}
                            />
                            <span className="visually-hidden">Compare {item.name}</span>
                          </label>
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="tray-actions">
                    <button type="button" className="button-primary" disabled={compared.length < 2} onClick={() => dialog.current?.showModal()}>
                      {compared.length < 2 ? 'Pick two to compare' : `Compare ${compared.length}`}
                    </button>
                  </div>
                </>
              )}

              {tab === 'cart' && (
                lines.length === 0 ? (
                  <p className="tray-empty">Your cart is empty. Nothing is charged until we have called you and sent an invoice.</p>
                ) : (
                  <>
                    <ul className="tray-items">
                      {lines.map((line, i) => (
                        <li key={line.id} className="tray-row">
                          <span className="tray-thumb">
                            {line.image ? <Image src={line.image} alt="" fill sizes="56px" style={{ objectFit: 'contain' }} /> : null}
                          </span>
                          <span className="tray-name">
                            {line.productName}{line.quantity > 1 ? ` × ${line.quantity}` : ''}
                            <small>{formatPrice(unitPrices[i] * line.quantity)}</small>
                          </span>
                          <button type="button" className="tray-remove" aria-label={`Remove ${line.productName}`} onClick={() => removeFromCart(line.id)}>&times;</button>
                        </li>
                      ))}
                    </ul>
                    <div className="tray-actions">
                      <Link href="/checkout" className="button-primary">Checkout, {formatPrice(subtotal)}</Link>
                    </div>
                  </>
                )
              )}

              {tab === 'registry' && <RegistryActions lines={registryLines} />}

              <p className="tray-help"><TalkToPerson /></p>
            </div>
          )}
        </aside>
      )}

      <dialog ref={dialog} className="compare-dialog" aria-label="Compare pieces">
        <div className="compare-top">
          <h2>Side by Side</h2>
          <button type="button" className="compare-close" onClick={() => dialog.current?.close()}>Close</button>
        </div>
        {compared.length >= 2 ? (
          <CompareSpread items={compared} />
        ) : (
          <p className="tray-empty">Set aside at least two pieces to compare them.</p>
        )}
      </dialog>
    </>
  );
}
