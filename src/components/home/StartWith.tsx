'use client';

import { useMemo } from 'react';
import PieceLink from '@/components/shop/PieceLink';
import { INTEREST_PRIVATE_CLASS, explainSuggestion, rankSuggestions } from '@/lib/interest/uses';
import type { InterestCatalogItem } from '@/lib/interest/catalog';
import { useInterestProfile } from '@/lib/interest/useInterestProfile';
import type { ShopItem } from '@/lib/shop';
import { useDelistedProducts } from '@/lib/useDelistedProducts';

const SHOWN = 4;

/*
 * Four pieces. Once a shopper has shown enough of a preference, on a device
 * where they have accepted, these follow it and say why.
 */
export default function StartWith({
  items,
  starters,
  catalog,
}: {
  items: ShopItem[];
  starters: readonly string[];
  catalog: InterestCatalogItem[];
}) {
  const { profile } = useInterestProfile(catalog);
  const { isDelisted } = useDelistedProducts();

  const picks = useMemo(() => {
    const byDefault = starters
      .map(slug => items.find(i => i.slug === slug))
      .filter((i): i is ShopItem => Boolean(i) && !isDelisted(i!.slug))
      .map(item => ({ item, reason: null as string | null }));
    if (!profile || profile.confidence.level === 'none') return byDefault;
    const ranked = rankSuggestions(profile, catalog, { limit: SHOWN, isAvailable: slug => !isDelisted(slug) && items.some(i => i.slug === slug) });
    const chosen = ranked.flatMap(r => {
      const item = items.find(i => i.slug === r.item.slug);
      return item ? [{ item, reason: explainSuggestion(profile, r.item) }] : [];
    });
    return chosen.length === SHOWN ? chosen : byDefault;
  }, [items, starters, catalog, profile, isDelisted]);

  return (
    <div className={`grid ${INTEREST_PRIVATE_CLASS}`}>
      {picks.map(p => <PieceLink key={p.item.slug} item={p.item} reason={p.reason} morph />)}
    </div>
  );
}
