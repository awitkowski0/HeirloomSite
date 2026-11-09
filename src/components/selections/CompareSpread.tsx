'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { CRIB_STYLES } from '@/lib/crib-styles';
import { formatPriceApprox } from '@/lib/format';
import { DETAIL_CROPS } from '@/lib/piece-details';
import type { ShopItem } from '@/lib/shop';
import UseTags from '@/components/uses/UseTags';
import SetAsideButton from './SetAsideButton';
import { swapCompare, toggleCompare } from '@/context/selectionsStore';

const NOT_ON_FILE = 'Not on file';

interface Trait {
  label: string;
  /** Compared for sameness; the row moves into Details when every value matches. */
  key: (i: ShopItem) => string;
  cell: (i: ShopItem) => ReactNode;
}

function Chips({ values }: { values: string[] }) {
  if (values.length === 0) return <span className="compare-gap">{NOT_ON_FILE}</span>;
  return (
    <ul className="feature-chips">
      {values.map(v => <li key={v}>{v}</li>)}
    </ul>
  );
}

const TRAITS: readonly Trait[] = [
  { label: 'Starting price', key: i => String(i.price), cell: i => formatPriceApprox(i.price) },
  {
    label: 'Built by',
    key: i => i.builder ?? '',
    cell: i => (i.builder && i.builderHref ? <Link href={i.builderHref} className="doc-link">{i.builder}, {i.state}</Link> : NOT_ON_FILE),
  },
  { label: 'Lead time', key: i => i.leadTime ?? '', cell: i => i.leadTime ?? NOT_ON_FILE },
  { label: 'How it converts', key: i => i.converts ?? '', cell: i => i.converts ?? NOT_ON_FILE },
  { label: "How it's built, per the builder", key: i => i.buildFeatures.join('|'), cell: i => <Chips values={i.buildFeatures} /> },
  { label: 'Safety, per the builder', key: i => i.safetyFeatures.join('|'), cell: i => <Chips values={i.safetyFeatures} /> },
];

function lookOf(item: ShopItem): string {
  return CRIB_STYLES.find(s => s.id === item.style)?.label ?? item.category ?? '';
}

const isCrib = (i: ShopItem) => i.category === 'Cribs' || i.category === 'Mini Cribs';
const sameGroup = (a: ShopItem, b: ShopItem) => (isCrib(a) ? isCrib(b) : a.category === b.category);

function Row({ trait, items }: { trait: Trait; items: ShopItem[] }) {
  return (
    <section className="compare-row">
      <h3 className="label-caps">{trait.label}</h3>
      <div className="compare-cells" style={{ ['--cols' as string]: items.length }}>
        {items.map(item => <div key={item.slug} className="compare-cell">{trait.cell(item)}</div>)}
      </div>
    </section>
  );
}

export default function CompareSpread({ items }: { items: ShopItem[] }) {
  const [finish, setFinish] = useState<string | null>(null);
  const [pool, setPool] = useState<ShopItem[]>([]);

  useEffect(() => {
    let live = true;
    fetch('/shop-items.json')
      .then(r => (r.ok ? (r.json() as Promise<ShopItem[]>) : []))
      .then(list => {
        if (live) setPool(list);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);

  const shared = (items[0]?.finishImages ?? [])
    .map(f => f.name)
    .filter(name => items.every(i => i.finishImages.some(f => f.name === name)))
    .slice(0, 7);
  const active = finish && shared.includes(finish) ? finish : null;
  const imageOf = (item: ShopItem) => item.finishImages.find(f => f.name === active)?.image ?? item.image;

  const flip = (item: ShopItem, direction: 1 | -1) => {
    const taken = new Set(items.filter(i => i.slug !== item.slug).map(i => i.slug));
    const options = pool.filter(p => sameGroup(p, item) && !taken.has(p.slug));
    if (options.length < 2) return;
    const at = options.findIndex(p => p.slug === item.slug);
    swapCompare(item.slug, options[(at + direction + options.length) % options.length]);
  };

  const differs = (t: Trait) => new Set(items.map(t.key)).size > 1;
  const visible = TRAITS.filter(differs);
  const same = TRAITS.filter(t => !differs(t));
  const statements = items.flatMap(item =>
    [item.buildStatement, item.safetyStatement].flatMap(q => (q ? [{ item, q }] : [])),
  );
  const anyCrops = items.some(i => DETAIL_CROPS[i.slug]);

  return (
    <div className="compare">
      <div className="compare-photos compare-cells" style={{ ['--cols' as string]: items.length }}>
        {items.map(item => (
          <div key={item.slug} className="compare-cell">
            <span className={/_crib_(slat|panel)_back_/.test(imageOf(item) ?? '') ? 'compare-photo compare-photo--padded' : 'compare-photo'}>
              {imageOf(item) ? <Image src={imageOf(item) as string} alt={item.name} fill sizes="(max-width: 767px) 50vw, 520px" style={{ objectFit: 'contain', objectPosition: 'bottom' }} /> : null}
            </span>
            <div className="compare-flip">
              <button type="button" aria-label={`Previous piece instead of ${item.name}`} onClick={() => flip(item, -1)}>&lsaquo;</button>
              <button type="button" aria-label={`Next piece instead of ${item.name}`} onClick={() => flip(item, 1)}>&rsaquo;</button>
            </div>
          </div>
        ))}
      </div>

      {shared.length > 1 && (
        <div className="plate-finishes" role="group" aria-label="See these in one finish">
          {shared.map(name => (
            <button key={name} type="button" className="plate-finish" aria-pressed={active === name} onClick={() => setFinish(name)}>{name}</button>
          ))}
        </div>
      )}

      {shared.length > 1 && <p className="plate-fine">Digital preview. Colors are a guide, so ask us about your finish.</p>}

      <div className="compare-names compare-cells" style={{ ['--cols' as string]: items.length }}>
        {items.map(item => (
          <div key={item.slug} className="compare-cell">
            <p className="compare-look">{lookOf(item)}</p>
            <Link href={`/product/${item.slug}`} className="compare-name">{item.name}</Link>
            <div className="compare-tools">
              <SetAsideButton item={item} />
              <button type="button" className="compare-remove" onClick={() => toggleCompare(item.slug)}>Remove</button>
            </div>
          </div>
        ))}
      </div>

      {items.some(i => i.uses.length > 0) && (
        <section className="compare-row">
          <h3 className="label-caps">What it can be</h3>
          <div className="compare-cells" style={{ ['--cols' as string]: items.length }}>
            {items.map(item => <div key={item.slug} className="compare-cell"><UseTags uses={item.uses} note={item.usesNote} /></div>)}
          </div>
        </section>
      )}

      {items.length > 2 && <p className="compare-phone-note">Remove one to see the third.</p>}

      {anyCrops && (
        <section className="compare-row">
          <h3 className="label-caps">Up close</h3>
          <div className="compare-cells" style={{ ['--cols' as string]: items.length }}>
            {items.map(item => {
              const spec = DETAIL_CROPS[item.slug];
              if (!spec) return <div key={item.slug} className="compare-cell"><span className="compare-gap">No close-ups yet</span></div>;
              const src = active && active !== 'Natural' ? (item.finishImages.find(f => f.name === active)?.image ?? spec.image) : spec.image;
              const [W, H] = spec.size;
              return (
                <div key={item.slug} className="compare-cell">
                  <ul className="compare-crops">
                    {spec.crops.map(crop => {
                      const [x0, y0, x1, y1] = crop.box;
                      const bw = x1 - x0;
                      const bh = y1 - y0;
                      return (
                        <li key={crop.label}>
                          <span className="compare-crop" style={{ aspectRatio: `${bw} / ${bh}` }}>
                            <span style={{ position: 'absolute', left: `${(-x0 / bw) * 100}%`, top: `${(-y0 / bh) * 100}%`, width: `${(W / bw) * 100}%`, height: `${(H / bh) * 100}%` }}>
                              <Image src={src} alt={`${item.name}, ${crop.label.toLowerCase()}`} fill sizes="400px" style={{ objectFit: 'fill' }} />
                            </span>
                          </span>
                          <span className="compare-crop-label">{crop.label}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {visible.map(t => <Row key={t.label} trait={t} items={items} />)}

      {(same.length > 0 || statements.length > 0) && (
        <details className="compare-details">
          <summary>Details{same.length > 0 ? ' and what these share' : ''}</summary>
          {same.map(t => <Row key={t.label} trait={t} items={items} />)}
          {statements.map(({ item, q }) => (
            <blockquote key={`${item.slug}:${q.text}`}>
              <p>&ldquo;{q.text}&rdquo;</p>
              <cite>{q.source}</cite>
            </blockquote>
          ))}
        </details>
      )}
    </div>
  );
}
