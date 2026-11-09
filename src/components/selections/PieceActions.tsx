'use client';

import { useState } from 'react';
import {
  isSaved,
  replaceCompare,
  toggleCompare,
  toggleSaved,
  useSelections,
} from '@/context/selectionsStore';
import { recordCompare, recordInterest } from '@/lib/interest/store';
import type { ShopItem } from '@/lib/shop';
import { toast } from '@/lib/toast';

/* Save and Compare, everywhere a piece is shown. A full comparison asks; it never evicts. */
export default function PieceActions({ item, finish }: { item: ShopItem; finish: string | null }) {
  const selections = useSelections();
  const [full, setFull] = useState(false);
  const saved = isSaved(selections, item.slug);
  const comparing = selections.compare.includes(item.slug);
  const label = `${item.name}${finish ? `, ${finish}` : ''}`;
  const known = [...selections.items, ...selections.compareExtras];
  const nameOf = (slug: string) => known.find(i => i.slug === slug)?.name ?? slug;

  return (
    <>
      <button
        type="button"
        className="link"
        aria-pressed={saved}
        onClick={() => {
          const now = toggleSaved(item, finish);
          recordInterest(now ? { kind: 'save', slug: item.slug, finish: finish ?? undefined } : { kind: 'remove', slug: item.slug, from: 'saved' });
          toast(now ? `Saved: ${label}` : 'Removed from saved');
        }}
      >
        {saved ? 'Saved' : 'Save'}
      </button>
      <button
        type="button"
        className="link"
        aria-pressed={comparing}
        onClick={() => {
          const result = toggleCompare(item, finish);
          if (result === 'full') setFull(true);
          else toast(result === 'added' ? `Added to compare: ${item.name}` : 'Removed from compare');
        }}
      >
        {comparing ? 'Comparing' : 'Compare'}
      </button>
      {full && (
        <span className="replace" role="group" aria-label="Replace a piece in your comparison">
          <span className="small">You can compare three at a time. Replace one?</span>
          {selections.compare.map(slug => (
            <button
              key={slug}
              type="button"
              className="link"
              onClick={() => {
                replaceCompare(slug, item, finish);
                recordCompare(selections.compare.map(s => (s === slug ? item.slug : s)));
                setFull(false);
                toast('Replaced');
              }}
            >
              {nameOf(slug)}
            </button>
          ))}
          <button type="button" className="link link--quiet" onClick={() => setFull(false)}>Keep these</button>
        </span>
      )}
    </>
  );
}
