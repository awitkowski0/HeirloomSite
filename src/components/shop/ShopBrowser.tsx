'use client';

import { useMemo, useSyncExternalStore } from 'react';
import PieceLink from './PieceLink';
import type { ShopItem } from '@/lib/shop';
import { useDelistedProducts } from '@/lib/useDelistedProducts';

/**
 * The listing grid, with a light / dark wood filter.
 *
 * The filter lives in the URL HASH (`#tone=dark`), never the query string:
 * reading searchParams in a page, or useSearchParams() outside Suspense, opts
 * the route out of static prerendering (see AGENTS.md). The hash is invisible
 * to the server, so every listing stays prerendered with the full grid in its
 * HTML, Back restores the filter, and a link can carry one.
 *
 * De-listed products (PostHog `product-<slug>` flags) are dropped here, the
 * same as VisibleProductGrid did; see src/lib/useDelistedProducts.ts.
 */
type ToneFilter = 'light' | 'dark';

const TONE_FILTERS: readonly { id: ToneFilter; label: string }[] = [
  { id: 'light', label: 'Light wood' },
  { id: 'dark', label: 'Dark wood' },
];

function subscribeHash(listener: () => void) {
  window.addEventListener('hashchange', listener);
  return () => window.removeEventListener('hashchange', listener);
}
const readHash = () => window.location.hash;
const serverHash = () => '';

function toneFromHash(hash: string): ToneFilter | null {
  const tone = new URLSearchParams(hash.replace(/^#/, '')).get('tone');
  return tone === 'light' || tone === 'dark' ? tone : null;
}

function setTone(tone: ToneFilter | null) {
  window.history.pushState(null, '', tone ? `#tone=${tone}` : window.location.pathname);
  window.dispatchEvent(new HashChangeEvent('hashchange'));
}

/** The first finish of that tone, so the card shows it; null for one-finish pieces. */
const finishForTone = (item: ShopItem, tone: ToneFilter | null) =>
  tone && item.finishes.length > 1 ? (item.finishes.find(f => f.tone === tone)?.name ?? null) : null;

export default function ShopBrowser({ items, priorityCount = 4 }: { items: ShopItem[]; priorityCount?: number }) {
  const { isDelisted } = useDelistedProducts();
  const tone = toneFromHash(useSyncExternalStore(subscribeHash, readHash, serverHash));

  const visible = useMemo(
    () =>
      items
        .filter(i => !isDelisted(i.slug))
        .filter(i => !tone || i.finishes.some(f => f.tone === tone)),
    [items, tone, isDelisted],
  );

  return (
    <div className="browser">
      <div className="filters" role="group" aria-label="Filter by wood tone">
        {tone ? (
          <button
            type="button"
            className="filter"
            aria-label={`Remove ${TONE_FILTERS.find(t => t.id === tone)?.label}`}
            onClick={() => setTone(null)}
          >
            {TONE_FILTERS.find(t => t.id === tone)?.label} <span aria-hidden="true">×</span>
          </button>
        ) : null}
        {TONE_FILTERS.filter(t => t.id !== tone).map(t => (
          <button key={t.id} type="button" className="filter-link" onClick={() => setTone(t.id)}>
            {t.label}
          </button>
        ))}
      </div>
      {visible.length === 0 ? (
        <p className="browser-empty">
          Nothing here in {tone === 'light' ? 'a light' : 'a dark'} wood.{' '}
          <button type="button" className="filter-link" onClick={() => setTone(null)}>
            Show everything
          </button>
        </p>
      ) : (
        <div className="piece-grid">
          {visible.map((item, i) => (
            <PieceLink key={item.slug} item={item} finish={finishForTone(item, tone)} priority={i < priorityCount} />
          ))}
        </div>
      )}
    </div>
  );
}
