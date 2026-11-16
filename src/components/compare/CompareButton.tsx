'use client';

import { useState } from 'react';
import Link from 'next/link';
import { MAX_COMPARE, replaceCompare, toggleCompare, useSelections } from '@/context/selectionsStore';

/**
 * "Compare" on a piece. A full comparison asks which piece to replace; it
 * never quietly evicts one. Once two or more are picked, a link to /compare
 * appears beside it.
 *
 * `names` resolves compared slugs to names for the replace prompt; pass what
 * the page already has (a product page passes its related products' names).
 */
export default function CompareButton({
  slug,
  finish,
  names = {},
}: {
  slug: string;
  finish: string | null;
  names?: Readonly<Record<string, string>>;
}) {
  const { compare } = useSelections();
  const [full, setFull] = useState(false);
  const comparing = compare.includes(slug);
  const nameOf = (s: string) => names[s] ?? s.replace(/-/g, ' ');

  return (
    <span className="compare-action">
      <button
        type="button"
        className="filter-link"
        aria-pressed={comparing}
        onClick={() => {
          if (toggleCompare(slug, finish) === 'full') setFull(true);
        }}
      >
        {comparing ? 'Comparing' : 'Compare'}
      </button>
      {compare.length >= 2 && (
        <Link href="/compare" className="filter-link">
          See {compare.length} side by side
        </Link>
      )}
      {full && (
        <span className="compare-replace" role="group" aria-label="Replace a piece in your comparison">
          <span>You can compare {MAX_COMPARE} at a time. Replace one?</span>
          {compare.map(s => (
            <button
              key={s}
              type="button"
              className="filter-link"
              onClick={() => {
                replaceCompare(s, slug, finish);
                setFull(false);
              }}
            >
              {nameOf(s)}
            </button>
          ))}
          <button type="button" className="filter-link" onClick={() => setFull(false)}>
            Keep these
          </button>
        </span>
      )}
    </span>
  );
}
