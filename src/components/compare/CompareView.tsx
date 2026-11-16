'use client';

import { useEffect, useMemo, type CSSProperties } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useCart } from '@/context/useCart';
import { removeCompare, replaceCompare, setSharedFinish, useSelections } from '@/context/selectionsStore';
import { cartLineFor } from '@/lib/cart-lines';
import { formatPriceApprox } from '@/lib/format';
import { recordCompare, recordInterest } from '@/lib/interest/store';
import { possessive, shortBuilderName } from '@/lib/names';
import { finishFor } from '@/lib/pick-run';
import type { ShopItem } from '@/lib/shop';
import { toast } from '@/lib/toast';

const groupOf = (item: ShopItem) => (item.category === 'Cribs' || item.category === 'Mini Cribs' ? 'crib' : item.category);

export default function CompareView({ catalog }: { catalog: ShopItem[] }) {
  const { compare, finishes } = useSelections();
  const { addToCart } = useCart();

  const items = useMemo(
    () => compare.map(slug => catalog.find(i => i.slug === slug)).filter((i): i is ShopItem => Boolean(i)),
    [compare, catalog],
  );
  const slugs = items.map(i => i.slug).join(',');

  useEffect(() => {
    const list = slugs.split(',').filter(Boolean);
    if (list.length >= 2) recordCompare(list);
  }, [slugs]);

  if (items.length < 2) {
    return (
      <div className="page">
        <header className="page-intro">
          <h1>Pick two to compare</h1>
          <p>Add at least two pieces to compare them side by side.</p>
          <p className="look-actions"><Link href="/products" className="btn">Browse furniture</Link></p>
        </header>
      </div>
    );
  }

  const shown = items.map(item => {
    const wanted = finishes[item.slug];
    const chosen = finishFor(item, wanted);
    const entry = item.finishImages.find(f => f.name === chosen.finish);
    return {
      item,
      finish: item.finishImages.length > 1 ? chosen.finish : null,
      image: entry?.image ?? item.image,
      note: wanted && !chosen.exact ? `No ${wanted} photo. Showing ${chosen.finish}.` : null,
    };
  });

  const shared = (shown[0].item.finishImages.length > 1 ? shown[0].item.finishImages : [])
    .map(f => f.name)
    .filter(name => items.every(i => i.finishImages.some(f => f.name === name)));
  const sameFinish = new Set(shown.map(s => s.finish)).size === 1 && shown[0].finish !== null;
  const crossBuilder = new Set(items.map(i => i.builderId)).size > 1;
  const swap = (index: number, direction: number) => {
    const current = items[index];
    const pool = catalog.filter(c => groupOf(c) === groupOf(current) && (c.slug === current.slug || !compare.includes(c.slug)));
    const next = pool[(pool.findIndex(c => c.slug === current.slug) + direction + pool.length) % pool.length];
    if (next && next.slug !== current.slug) replaceCompare(current.slug, next, shown[index].finish);
  };

  const rows: { label: string; value: (s: (typeof shown)[number]) => React.ReactNode }[] = [
    { label: 'Price', value: s => `${s.item.priceVaries ? 'From ' : ''}${formatPriceApprox(s.item.price)}` },
    { label: 'Who makes it', value: s => (s.item.builder && s.item.builderHref ? <Link href={s.item.builderHref} className="builder-name">{shortBuilderName(s.item.builder)}</Link> : 'Ask us') },
    { label: 'Lead time', value: s => s.item.leadTime ?? 'Ask us' },
    { label: 'What it becomes', value: s => s.item.converts ?? (s.item.category === 'Mini Cribs' ? 'Stays a mini crib' : 'Stays as it is') },
    {
      label: 'How it’s built',
      value: s => (s.item.buildFeatures.length > 0 ? s.item.buildFeatures.map(f => <span key={f} className="cell-line">{f}</span>) : `Ask us how ${s.item.builder ? shortBuilderName(s.item.builder) : 'the builder'} builds this.`),
    },
    {
      label: 'Safety, from the builder',
      value: s =>
        s.item.safetyFeatures.length > 0
          ? s.item.safetyFeatures.map(f => <span key={f} className="cell-line">{f}</span>)
          : s.item.builder
            ? `We can request ${possessive(shortBuilderName(s.item.builder))} written statement for you.`
            : 'Ask us.',
    },
  ];

  return (
    <div className="compare">
      <header className="page-intro"><h1>Side by side</h1></header>
      {shared.length > 0 && (
        <div className="swatch-row" role="group" aria-label="See every piece in one finish">
          {shared.map(name => {
            const entry = shown[0].item.finishImages.find(f => f.name === name);
            const on = shown.every(s => s.finish === name);
            return (
              <button key={name} type="button" className="swatch" aria-pressed={on} onClick={() => setSharedFinish(items.map(i => i.slug), name)}>
                <span className="swatch-photo">{entry ? <Image src={entry.image} alt="" fill sizes="44px" /> : null}</span>
                {name}
              </button>
            );
          })}
        </div>
      )}
      {sameFinish && crossBuilder ? <p className="small page-note">Each builder mixes its own stains, so the same name can look different from shop to shop.</p> : null}
      <div className="compare-scroll">
        <div className="compare-table" style={{ '--n': shown.length } as CSSProperties}>
          {shown.map((s, i) => (
            <div key={s.item.slug} className="compare-col">
              <Link href={`/product/${s.item.slug}`} className="compare-photo" aria-label={s.item.name}>
                {s.image ? <Image src={s.image} alt={s.item.name} fill sizes="(max-width: 859px) 46vw, 340px" /> : null}
              </Link>
              <p className="compare-tools">
                <button type="button" aria-label="Previous piece" onClick={() => swap(i, -1)}>‹</button>
                <button type="button" aria-label="Next piece" onClick={() => swap(i, 1)}>›</button>
                <button type="button" className="link link--quiet" onClick={() => removeCompare(s.item.slug)}>Remove</button>
              </p>
              <h2><Link href={`/product/${s.item.slug}`}>{s.item.name}</Link></h2>
              <p className="small">{s.finish ?? ''}{s.note ? ` ${s.note}` : ''}</p>
            </div>
          ))}
          {rows.map(row => (
            <div key={row.label} className="compare-row">
              <p className="compare-label">{row.label}</p>
              <div className="compare-cells">
                {shown.map(s => <div key={s.item.slug}>{row.value(s)}</div>)}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="compare-add">
        {shown.map(s => (
          <button
            key={s.item.slug}
            type="button"
            className="link"
            onClick={() => {
              const line = cartLineFor(s.item, s.finish);
              if (!line) return;
              addToCart(line);
              recordInterest({ kind: 'add_to_cart', slug: s.item.slug, finish: s.finish ?? undefined });
              toast(`In your cart: ${s.item.name}${s.finish ? `, ${s.finish}` : ''}`);
            }}
          >
            Add {s.item.name}
          </button>
        ))}
      </div>
    </div>
  );
}
