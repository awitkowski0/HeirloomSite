'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import RegistryActions from '@/components/selections/RegistryActions';
import { useCart } from '@/context/useCart';
import { removeCompare, removeSaved, useSelections } from '@/context/selectionsStore';
import type { RegistryLine } from '@/lib/babylist';
import { registryTitle } from '@/lib/babylist';
import { shortBuilderName } from '@/lib/names';
import { hasBundlePrice } from '@/lib/bundle-prices';
import { chargedUnitPrices } from '@/lib/cart-pricing';
import { NURSERY_STEPS, orphanedKits, stepFor } from '@/lib/cart-lines';
import { formatPrice } from '@/lib/format';
import { recordInterest } from '@/lib/interest/store';
import { variantLabel } from '@/lib/labels';
import type { ShopItem } from '@/lib/shop';
import { variantHref } from '@/lib/variants';

type Tab = 'cart' | 'saved' | 'compare' | 'babylist';

const TABS: readonly { id: Tab; label: string }[] = [
  { id: 'cart', label: 'Cart' },
  { id: 'saved', label: 'Saved' },
  { id: 'compare', label: 'Compare' },
  { id: 'babylist', label: 'Babylist' },
];

const Thumb = ({ src }: { src: string | null }) => (
  <span className="line-thumb">{src ? <Image src={src} alt="" fill sizes="52px" /> : null}</span>
);

export default function TrayPanel({ onClose }: { onClose: () => void }) {
  const { cart, hydrated, removeFromCart, subtotal } = useCart();
  const { items, compare, compareExtras, finishes } = useSelections();
  const [tab, setTab] = useState<Tab>('cart');
  const lines = useMemo(() => (hydrated ? cart : []), [cart, hydrated]);
  const unitPrices = useMemo(() => chargedUnitPrices(lines, hasBundlePrice), [lines]);
  const orphans = orphanedKits(lines);

  const compared = compare
    .map(slug => items.find(i => i.slug === slug) ?? compareExtras.find(i => i.slug === slug))
    .filter((i): i is ShopItem => Boolean(i));

  const registryLines = useMemo<RegistryLine[]>(() => {
    const fromCart = lines.flatMap((line, i) => {
      if (!line.slug) return [];
      const finish = variantLabel(line.wood, line.stainName);
      return [{
        key: `cart:${line.id}`,
        title: registryTitle(line.productName, finish || null),
        image: line.image,
        href: finish ? variantHref(line.slug, line.wood, line.stainName) : `/product/${line.slug}`,
        price: unitPrices[i],
      }];
    });
    const inCart = new Set(lines.map(l => l.slug));
    const fromSaved = items.flatMap(item => (item.registry && !inCart.has(item.slug) ? [{ key: `saved:${item.slug}`, ...item.registry }] : []));
    return [...fromCart, ...fromSaved];
  }, [lines, unitPrices, items]);

  const counts: Record<Tab, number> = { cart: lines.length, saved: items.length, compare: compared.length, babylist: 0 };
  const slot = (id: string) => lines.filter(l => stepFor(l.productName) === id).pop();
  const crib = [...lines].reverse().find(l => stepFor(l.productName) === 'crib' && l.slug);

  return (
    <div className="tray">
      <div className="panel-head">
        <h2>Your nursery</h2>
        <button type="button" className="panel-close" aria-label="Close" onClick={onClose}>×</button>
      </div>

      {lines.length > 0 && (
        <>
          <ol className="tray-slots" aria-label="Your nursery">
            {NURSERY_STEPS.map(step => {
              const line = slot(step.id);
              return (
                <li key={step.id} className={line ? 'tray-slot tray-slot--full' : 'tray-slot'}>
                  <span className="tray-slot-photo">{line?.image ? <Image src={line.image} alt="" fill sizes="56px" /> : null}</span>
                  {step.label}
                </li>
              );
            })}
          </ol>
          {crib && !slot('kits') && (
            <p className="tray-kits"><Link href={`/product/${crib.slug}#kits`} className="link">Conversion kits for your {crib.productName}</Link></p>
          )}
        </>
      )}

      <div className="tabs" role="tablist" aria-label="Your nursery">
        {TABS.map(t => (
          <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}>
            {t.label}{counts[t.id] > 0 ? ` (${counts[t.id]})` : ''}
          </button>
        ))}
      </div>

      {tab === 'cart' &&
        (lines.length === 0 ? (
          <p className="panel-empty">Your cart is empty.</p>
        ) : (
          <>
            <ul className="lines">
              {lines.map((line, i) => {
                const finish = variantLabel(line.wood, line.stainName);
                return (
                  <li key={line.id} className="line">
                    <Thumb src={line.image} />
                    <div>
                      <span className="line-name">{line.productName}{line.quantity > 1 ? ` × ${line.quantity}` : ''}</span>
                      <span className="line-meta">{finish ? `${finish} · ` : ''}{formatPrice(unitPrices[i] * line.quantity)}</span>
                      <span className="line-actions">
                        {line.builder ? <Link href={line.builder.href} className="builder-name">{shortBuilderName(line.builder.name)}</Link> : null}
                        <button
                          type="button"
                          className="link link--quiet"
                          onClick={() => {
                            removeFromCart(line.id);
                            if (line.slug) recordInterest({ kind: 'remove', slug: line.slug, from: 'cart' });
                          }}
                        >
                          Remove
                        </button>
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
            {orphans.length > 0 && (
              <p className="registry-note">
                {orphans.length === 1 ? 'A kit' : `${orphans.length} kits`} no longer has its crib in the cart, so {orphans.length === 1 ? 'it’s' : 'they’re'} back at list price.{' '}
                <button type="button" className="link" onClick={() => orphans.forEach(l => removeFromCart(l.id))}>Remove {orphans.length === 1 ? 'it' : 'them'}</button>
              </p>
            )}
            <p className="tray-total"><span>Total</span><span>{formatPrice(subtotal)}</span></p>
            <p className="panel-row"><Link href="/checkout" className="btn btn--wide">Check out</Link></p>
            <p className="small panel-note">No card today. We call to confirm, then send an invoice.</p>
          </>
        ))}

      {tab === 'saved' &&
        (items.length === 0 ? (
          <p className="panel-empty">Pieces you save show up here.</p>
        ) : (
          <ul className="lines">
            {items.map(item => (
              <li key={item.slug} className="line">
                <Thumb src={item.finishImages.find(f => f.name === finishes[item.slug])?.image ?? item.image} />
                <div>
                  <Link href={`/product/${item.slug}`} className="line-name">{item.name}</Link>
                  <span className="line-meta">{finishes[item.slug] ? `${finishes[item.slug]} · ` : ''}{formatPrice(item.price)}</span>
                  <span className="line-actions">
                    <button
                      type="button"
                      className="link link--quiet"
                      onClick={() => {
                        removeSaved(item.slug);
                        recordInterest({ kind: 'remove', slug: item.slug, from: 'saved' });
                      }}
                    >
                      Remove
                    </button>
                  </span>
                </div>
              </li>
            ))}
          </ul>
        ))}

      {tab === 'compare' && (
        <>
          {compared.length === 0 ? (
            <p className="panel-empty">Pieces you add to Compare show up here.</p>
          ) : (
            <ul className="lines">
              {compared.map(item => (
                <li key={item.slug} className="line">
                  <Thumb src={item.finishImages.find(f => f.name === finishes[item.slug])?.image ?? item.image} />
                  <div>
                    <span className="line-name">{item.name}</span>
                    <span className="line-meta">{finishes[item.slug] ? `${finishes[item.slug]} · ` : ''}{formatPrice(item.price)}</span>
                    <span className="line-actions">
                      <button type="button" className="link link--quiet" onClick={() => removeCompare(item.slug)}>Remove</button>
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {compared.length >= 2 && <p className="panel-row"><Link href="/compare" className="btn btn--wide">See them side by side</Link></p>}
        </>
      )}

      {tab === 'babylist' && <RegistryActions lines={registryLines} />}
    </div>
  );
}
