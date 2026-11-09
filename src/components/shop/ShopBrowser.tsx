'use client';

import { useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { formatPriceApprox } from '@/lib/format';
import { useDelistedProducts } from '@/lib/useDelistedProducts';
import type { ShopItem } from '@/lib/shop';
import CompareTable from './CompareTable';
import GuidedPicker from './GuidedPicker';
import { EMPTY_FILTERS, PRICE_BANDS, applyFilters, type Filters } from './filters';
import '@/styles/shop.css';

const MAX_COMPARE = 3;
const TYPE_ORDER = ['Cribs', 'Mini Cribs', 'Dressers', 'Chests', 'Changing Tables', 'Nightstands'];

type Sort = 'featured' | 'low' | 'high' | 'soonest';

function Chips<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly { value: T; label: string }[];
  value: T | null;
  onChange: (next: T | null) => void;
}) {
  return (
    <div className="shop-facet" role="group" aria-label={label}>
      <span className="shop-facet__label">{label}</span>
      <div className="shop-facet__chips">
        {options.map(o => (
          <button
            key={o.value}
            type="button"
            className="shop-chip"
            aria-pressed={value === o.value}
            onClick={() => onChange(value === o.value ? null : o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function ShopBrowser({
  items,
  initialType = null,
  priorityCount = 0,
}: {
  items: ShopItem[];
  initialType?: string | null;
  priorityCount?: number;
}) {
  const { isDelisted } = useDelistedProducts();
  const [filters, setFilters] = useState<Filters>({ ...EMPTY_FILTERS, type: initialType });
  const [sort, setSort] = useState<Sort>('featured');
  const [compare, setCompare] = useState<string[]>([]);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const available = useMemo(() => items.filter(i => !isDelisted(i.slug)), [items, isDelisted]);
  const types = useMemo(
    () =>
      [...new Set(available.map(i => i.category).filter((c): c is string => Boolean(c)))].sort(
        (a, b) => TYPE_ORDER.indexOf(a) - TYPE_ORDER.indexOf(b),
      ),
    [available],
  );
  const builders = useMemo(
    () => [...new Set(available.map(i => i.builder).filter((b): b is string => Boolean(b)))],
    [available],
  );

  const pool = filters.type ? available.filter(i => i.category === filters.type) : available;
  const showLooks = pool.length > 0 && pool.every(i => i.top);

  const results = useMemo(() => {
    const matched = applyFilters(available, filters);
    if (sort === 'low') return [...matched].sort((a, b) => a.price - b.price);
    if (sort === 'high') return [...matched].sort((a, b) => b.price - a.price);
    if (sort === 'soonest') {
      return [...matched].sort((a, b) => (a.leadWeeksMax ?? 99) - (b.leadWeeksMax ?? 99));
    }
    return matched;
  }, [available, filters, sort]);

  const set = <K extends keyof Filters>(key: K, value: Filters[K]) =>
    setFilters(f => ({ ...f, [key]: value }));
  const toggleCompare = (slug: string) =>
    setCompare(c =>
      c.includes(slug) ? c.filter(s => s !== slug) : c.length < MAX_COMPARE ? [...c, slug] : c,
    );
  const compared = compare
    .map(slug => available.find(i => i.slug === slug))
    .filter((i): i is ShopItem => Boolean(i));
  const openCompare = () => dialogRef.current?.showModal();

  return (
    <div className="shop">
      <GuidedPicker
        items={available}
        onFilters={setFilters}
        onCompare={slugs => {
          setCompare(slugs.slice(0, MAX_COMPARE));
          // The table renders from state, so open once React has committed it.
          requestAnimationFrame(openCompare);
        }}
      />

      <div className="shop-main">
        <div className="shop-facets">
          {types.length > 1 && (
            <Chips
              label="Type"
              options={types.map(t => ({ value: t, label: t }))}
              value={filters.type}
              onChange={v => setFilters(f => ({ ...f, type: v, top: null, front: null }))}
            />
          )}
          {builders.length > 1 && (
            <Chips
              label="Builder"
              options={builders.map(b => ({ value: b, label: b }))}
              value={filters.builder}
              onChange={v => set('builder', v)}
            />
          )}
          {showLooks && (
            <>
              <Chips
                label="Top"
                options={[{ value: 'Arched', label: 'Arched' }, { value: 'Flat', label: 'Flat' }]}
                value={filters.top}
                onChange={v => set('top', v)}
              />
              <Chips
                label="Front"
                options={[{ value: 'Slatted', label: 'Slatted' }, { value: 'Panel', label: 'Panel' }]}
                value={filters.front}
                onChange={v => set('front', v)}
              />
            </>
          )}
          <Chips
            label="Budget"
            options={PRICE_BANDS.map(b => ({ value: b.id, label: b.label }))}
            value={filters.band}
            onChange={v => set('band', v)}
          />
          <div className="shop-facet" role="group" aria-label="More filters">
            <span className="shop-facet__label">Must have</span>
            <div className="shop-facet__chips">
              <button
                type="button"
                className="shop-chip"
                aria-pressed={filters.maxWeeks === 8}
                onClick={() => set('maxWeeks', filters.maxWeeks === 8 ? null : 8)}
              >
                Ready in 8 weeks or less
              </button>
              <button
                type="button"
                className="shop-chip"
                aria-pressed={filters.safetyOnFile}
                onClick={() => set('safetyOnFile', !filters.safetyOnFile)}
              >
                Builder safety statement
              </button>
            </div>
          </div>
        </div>

        <div className="shop-toolbar">
          <p aria-live="polite">
            <strong>{results.length}</strong> {results.length === 1 ? 'piece' : 'pieces'}
          </p>
          <button
            type="button"
            className="shop-clear"
            onClick={() => setFilters({ ...EMPTY_FILTERS, type: initialType })}
          >
            Clear filters
          </button>
          <label className="shop-sort">
            Sort
            <select value={sort} onChange={e => setSort(e.target.value as Sort)}>
              <option value="featured">Featured</option>
              <option value="low">Price: low to high</option>
              <option value="high">Price: high to low</option>
              <option value="soonest">Soonest ready</option>
            </select>
          </label>
        </div>

        {results.length === 0 ? (
          <p className="shop-empty">Nothing matches all of that. Remove a filter to see more.</p>
        ) : (
          <ul className="shop-grid">
            {results.map((item, i) => {
              const selected = compare.includes(item.slug);
              return (
                <li key={item.slug} className="shop-card">
                  <Link
                    href={`/product/${item.slug}`}
                    className="shop-card__link"
                    data-product-name={item.name}
                    data-product-category={item.category || 'Crib'}
                  >
                    <span className="shop-card__img">
                      {item.image ? (
                        <Image
                          src={item.image}
                          alt={item.name}
                          fill
                          sizes="(max-width: 767px) 50vw, (max-width: 1199px) 33vw, 280px"
                          priority={i < priorityCount}
                          style={{ objectFit: 'contain' }}
                        />
                      ) : null}
                    </span>
                    {item.builder && (
                      <span className="builder-tag">
                        {item.builder} · {item.state}
                      </span>
                    )}
                    <span className="shop-card__name">{item.name}</span>
                    <span className="shop-card__price">From {formatPriceApprox(item.price)}</span>
                    <span className="shop-card__facts">
                      {item.leadTime && <span>{item.leadTime}</span>}
                      {item.finishes > 1 && <span>{item.finishes} finishes</span>}
                    </span>
                    {item.builder && (
                      <span className={item.safetyOnFile ? 'shop-flag shop-flag--on' : 'shop-flag'}>
                        {item.safetyOnFile ? 'Builder safety statement' : 'Ask for builder statement'}
                      </span>
                    )}
                  </Link>
                  <button
                    type="button"
                    className="shop-card__compare"
                    aria-pressed={selected}
                    disabled={!selected && compare.length >= MAX_COMPARE}
                    onClick={() => toggleCompare(item.slug)}
                  >
                    {selected ? 'Added to compare' : 'Compare'}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {compared.length > 0 && (
        <div className="shop-tray" role="region" aria-label="Pieces to compare">
          <ul className="shop-tray__items">
            {compared.map(item => (
              <li key={item.slug}>
                <button
                  type="button"
                  onClick={() => toggleCompare(item.slug)}
                  aria-label={`Remove ${item.name} from compare`}
                >
                  {item.name} <span aria-hidden="true">&times;</span>
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="button-primary"
            disabled={compared.length < 2}
            onClick={openCompare}
          >
            {compared.length < 2 ? 'Pick one more' : `Compare ${compared.length}`}
          </button>
        </div>
      )}

      <dialog ref={dialogRef} className="shop-dialog" aria-label="Compare pieces">
        <div className="shop-dialog__head">
          <h2>Side by side</h2>
          <button type="button" className="shop-clear" onClick={() => dialogRef.current?.close()}>
            Close
          </button>
        </div>
        <CompareTable items={compared} />
      </dialog>
    </div>
  );
}
