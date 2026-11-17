'use client';

import { useMemo, type CSSProperties, type ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { removeCompare, replaceCompare, setSharedFinish, useSelections } from '@/context/selectionsStore';
import { formatPriceApprox } from '@/lib/format';
import { finishFor } from '@/lib/pick-run';
import type { ShopItem } from '@/lib/shop';
import { variantHref } from '@/lib/variants';

const groupOf = (item: ShopItem) =>
  item.category === 'Cribs' || item.category === 'Mini Cribs' ? 'crib' : item.category;

/**
 * Up to three pieces side by side.
 *
 * Every row comes from the catalogue or src/lib/builders.ts: price, who makes
 * it, lead time, what a crib converts to, and size. There are deliberately no
 * construction or safety rows; those are the builders' own statements and
 * live, quoted and sourced, on each builder's page.
 *
 * "Choose options" opens the piece's own page in the compared finish rather
 * than adding to the cart from here, so kits and add-ons are chosen where they
 * are explained.
 */
export default function CompareView({ catalog }: { catalog: ShopItem[] }) {
  const { compare, finishes } = useSelections();

  const items = useMemo(
    () => compare.map(slug => catalog.find(i => i.slug === slug)).filter((i): i is ShopItem => Boolean(i)),
    [compare, catalog],
  );

  if (items.length < 2) {
    return (
      <header className="page-header">
        <h1 className="headline-lg text-primary">Pick two to compare</h1>
        <p className="body-lg text-on-surface-variant">
          Press Compare on two or three pieces to see them side by side.
        </p>
        <p className="look-actions">
          <Link href="/products" className="button-primary">
            Browse furniture
          </Link>
          <Link href="/pick" className="filter-link">
            Help me pick
          </Link>
        </p>
      </header>
    );
  }

  const shown = items.map(item => {
    const wanted = finishes[item.slug];
    const chosen = finishFor(item, wanted);
    const entry = item.finishes.find(f => f.name === chosen.finish);
    return {
      item,
      entry,
      finish: item.finishes.length > 1 ? chosen.finish : null,
      image: entry?.image ?? item.defaultImage,
      note: wanted && !chosen.exact ? `No ${wanted} photo. Showing ${chosen.finish}.` : null,
    };
  });

  const shared = (shown[0].item.finishes.length > 1 ? shown[0].item.finishes : [])
    .map(f => f.name)
    .filter(name => items.every(i => i.finishes.some(f => f.name === name)));
  const sameFinish = new Set(shown.map(s => s.finish)).size === 1 && shown[0].finish !== null;
  const crossBuilder = new Set(items.map(i => i.builder?.name ?? null)).size > 1;

  const swap = (index: number, direction: number) => {
    const current = items[index];
    const pool = catalog.filter(
      c => groupOf(c) === groupOf(current) && (c.slug === current.slug || !compare.includes(c.slug)),
    );
    const next = pool[(pool.findIndex(c => c.slug === current.slug) + direction + pool.length) % pool.length];
    if (next && next.slug !== current.slug) replaceCompare(current.slug, next.slug, shown[index].finish);
  };

  const rows: { label: string; value: (s: (typeof shown)[number]) => ReactNode }[] = [
    { label: 'Price', value: s => `${s.item.priceVaries ? 'From ' : ''}${formatPriceApprox(s.item.minPrice)}` },
    {
      label: 'Who makes it',
      value: s =>
        s.item.builder ? (
          <Link href={s.item.builder.href} className="piece-builder">
            {s.item.builder.name}
          </Link>
        ) : (
          'Ask us'
        ),
    },
    { label: 'Lead time', value: s => (s.item.leadTime ? `${s.item.leadTime}, confirmed when you order` : 'Ask us') },
    {
      label: 'What it becomes',
      value: s =>
        s.item.converts ??
        (s.item.category === 'Mini Cribs' ? 'Stays a mini crib' : s.item.category === 'Cribs' ? 'Ask us' : '—'),
    },
    { label: 'Size', value: s => s.item.dimensions ?? 'Ask us' },
  ];

  return (
    <div className="compare">
      <header className="page-header">
        <h1 className="headline-lg text-primary">Side by side</h1>
      </header>
      {shared.length > 0 && (
        <div className="swatch-row" role="group" aria-label="See every piece in one finish">
          {shared.map(name => {
            const entry = shown[0].item.finishes.find(f => f.name === name);
            const on = shown.every(s => s.finish === name);
            return (
              <button
                key={name}
                type="button"
                className="swatch"
                aria-pressed={on}
                onClick={() => setSharedFinish(items.map(i => i.slug), name)}
              >
                <span className="swatch-photo">{entry ? <Image src={entry.image} alt="" fill sizes="40px" /> : null}</span>
                {name}
              </button>
            );
          })}
        </div>
      )}
      {sameFinish && crossBuilder ? (
        <p className="body-md text-on-surface-variant">
          Each builder mixes its own stains, so the same name can look different from shop to shop.
        </p>
      ) : null}
      <div className="compare-scroll">
        <div className="compare-table" style={{ '--n': shown.length } as CSSProperties}>
          {shown.map((s, i) => {
            const href =
              s.entry && s.item.finishes.length > 1
                ? variantHref(s.item.slug, s.entry.wood, s.entry.stainName)
                : `/product/${s.item.slug}`;
            return (
              <div key={s.item.slug} className="compare-col">
                <Link href={href} className="compare-photo" aria-label={s.item.productName}>
                  {s.image ? <Image src={s.image} alt={s.item.productName} fill sizes="(max-width: 767px) 46vw, 300px" /> : null}
                </Link>
                <p className="compare-tools">
                  <button type="button" aria-label={`Previous piece instead of ${s.item.productName}`} onClick={() => swap(i, -1)}>
                    ‹
                  </button>
                  <button type="button" aria-label={`Next piece instead of ${s.item.productName}`} onClick={() => swap(i, 1)}>
                    ›
                  </button>
                  <button type="button" className="filter-link" onClick={() => removeCompare(s.item.slug)}>
                    Remove
                  </button>
                </p>
                <h2>
                  <Link href={href}>{s.item.productName}</Link>
                </h2>
                <p className="compare-finish">
                  {s.finish ?? ''}
                  {s.note ? ` ${s.note}` : ''}
                </p>
                <Link href={href} className="button-secondary compare-choose">
                  Choose options
                </Link>
              </div>
            );
          })}
          {rows.map(row => (
            <div key={row.label} className="compare-row">
              <p className="compare-label">{row.label}</p>
              <div className="compare-cells">
                {shown.map(s => (
                  <div key={s.item.slug}>{row.value(s)}</div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
