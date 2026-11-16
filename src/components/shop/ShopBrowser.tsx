'use client';

import { useMemo, useSyncExternalStore } from 'react';
import PieceLink from './PieceLink';
import TalkToPerson from '@/components/layout/TalkToPerson';
import { TONES } from '@/lib/finish-tones';
import { filtersFromHash, filtersToHash, type Filters } from '@/lib/intent';
import { formatPriceApprox } from '@/lib/format';
import { PICK_CRIBS, photoRank } from '@/lib/photo-notes';
import type { ShopItem } from '@/lib/shop';
import { useDelistedProducts } from '@/lib/useDelistedProducts';

/*
 * Filters live in the URL hash: a page can stay prerendered, Back restores them,
 * and a link from the home prompt can carry them.
 */
function subscribeHash(listener: () => void) {
  window.addEventListener('hashchange', listener);
  return () => window.removeEventListener('hashchange', listener);
}
const readHash = () => window.location.hash;
const serverHash = () => '';

function setHash(filters: Filters) {
  const next = filtersToHash(filters);
  window.history.pushState(null, '', next || window.location.pathname);
  window.dispatchEvent(new HashChangeEvent('hashchange'));
}

const LABELS: Record<string, (f: Filters) => string> = {
  use: f => `${f.use?.[0]}${f.use?.slice(1).toLowerCase()}`,
  top: f => (f.top === 'arched' ? 'Curved top' : 'Straight top'),
  front: f => (f.front === 'slats' ? 'Open slats' : 'Solid front'),
  tone: f => (f.tone === 'light' ? 'Light wood' : 'Dark wood'),
  max: f => `Under ${formatPriceApprox(f.max ?? 0)}`,
};

const finishForTone = (item: ShopItem, tone: 'light' | 'dark' | undefined) =>
  tone && item.finishImages.length > 1 ? item.finishImages.find(f => f.tone === tone)?.name ?? null : null;

export default function ShopBrowser({
  items,
  priorityCount = 0,
  heading,
  hideBuilder,
}: {
  items: ShopItem[];
  priorityCount?: number;
  heading?: boolean;
  /** Inside a builder's store, where every card would repeat the same name. */
  hideBuilder?: boolean;
}) {
  const { isDelisted } = useDelistedProducts();
  const hash = useSyncExternalStore(subscribeHash, readHash, serverHash);
  const filters = useMemo(() => filtersFromHash(hash), [hash]);
  const active = (Object.keys(LABELS) as (keyof Filters)[]).filter(k => filters[k] !== undefined);

  const visible = useMemo(
    () =>
      items
        .filter(i => !isDelisted(i.slug))
        .filter(i => {
          const tag = PICK_CRIBS[i.slug];
          if (filters.use && !i.uses.includes(filters.use)) return false;
          if (filters.top && (tag ? tag.top !== filters.top : i.top?.toLowerCase() !== filters.top)) return false;
          if (filters.front && (tag ? tag.front !== filters.front : (i.front === 'Slatted' ? 'slats' : i.front === 'Panel' ? 'panel' : null) !== filters.front)) return false;
          if (filters.tone && !i.finishImages.some(f => f.tone === filters.tone)) return false;
          if (filters.max && i.price > filters.max) return false;
          return true;
        })
        .sort((a, b) => photoRank(a.slug) - photoRank(b.slug)),
    [items, filters, isDelisted],
  );

  const tones = TONES.filter(t => t.id !== 'mid') as readonly { id: 'light' | 'dark'; label: string }[];

  return (
    <div className="browser">
      {heading && <h1 className="browser-title">{active.length > 0 ? 'Matching pieces' : 'All furniture'}</h1>}
      {filters.q && active.length > 0 ? <p className="small">For “{filters.q}”</p> : null}
      <div className="filters" role="group" aria-label="Filter">
        {active.map(key => (
          <button
            key={key}
            type="button"
            className="filter"
            aria-label={`Remove ${LABELS[key](filters)}`}
            onClick={() => {
              const next = { ...filters };
              delete next[key];
              setHash(next);
            }}
          >
            {LABELS[key](filters)} <span aria-hidden="true">×</span>
          </button>
        ))}
        {tones
          .filter(t => filters.tone !== t.id)
          .map(t => (
            <button key={t.id} type="button" className="link link--quiet" onClick={() => setHash({ ...filters, tone: t.id })}>
              {t.label} wood
            </button>
          ))}
        {active.length > 0 && (
          <button type="button" className="link" onClick={() => setHash({})}>Clear</button>
        )}
      </div>
      {visible.length === 0 ? (
        <p className="page-note">Nothing matches all of that. Remove a filter above, or <TalkToPerson />.</p>
      ) : (
        <div className="grid">
          {visible.map((item, i) => (
            <PieceLink key={item.slug} item={item} finish={finishForTone(item, filters.tone)} priority={i < priorityCount} hideBuilder={hideBuilder} morph />
          ))}
        </div>
      )}
    </div>
  );
}
