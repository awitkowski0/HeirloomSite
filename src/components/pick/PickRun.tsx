'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import CompareButton from '@/components/compare/CompareButton';
import { pickRun, resetRun, setCompare, undoPick, useSelections, type Side } from '@/context/selectionsStore';
import { formatPriceApprox } from '@/lib/format';
import { buildLook, pairsFor, prefsFrom, tasteWords, type Pair } from '@/lib/pick-run';
import type { ShopItem } from '@/lib/shop';
import { variantHref } from '@/lib/variants';

const SWIPE_DISTANCE = 70;

function LookCard({ item, finish, note }: { item: ShopItem; finish: string | null; note: string | null }) {
  const entry = item.finishes.find(f => f.name === finish);
  const image = entry?.image ?? item.defaultImage;
  const href = entry && item.finishes.length > 1 ? variantHref(item.slug, entry.wood, entry.stainName) : `/product/${item.slug}`;
  return (
    <article className="look-card">
      <Link href={href} className="look-photo">
        {image ? (
          <Image src={image} alt={`${item.productName}${finish ? ` in ${finish}` : ''}`} fill sizes="(max-width: 767px) 70vw, 260px" />
        ) : null}
      </Link>
      <h3>
        <Link href={href}>{item.productName}</Link>
      </h3>
      <p className="look-meta">
        {formatPriceApprox(item.minPrice)}
        {item.finishes.length > 1 && finish ? ` · ${finish}` : ''}
        {note ? (
          <>
            <br />
            {note}
          </>
        ) : null}
      </p>
      {item.builder ? (
        <Link href={item.builder.href} className="piece-builder">
          {item.builder.name}
        </Link>
      ) : null}
      <p className="look-actions-card">
        <CompareButton slug={item.slug} finish={finish} />
      </p>
    </article>
  );
}

function YourLook({ items, onBack }: { items: readonly ShopItem[]; onBack: () => void }) {
  const { run } = useSelections();
  const look = useMemo(() => buildLook(run.picks, items), [run.picks, items]);
  const words = tasteWords(look.prefs);
  const summary =
    words.length > 0
      ? `${words[0][0].toUpperCase()}${words.join(', ').slice(1)}`
      : 'You skipped every question. Here are a few places to start.';
  const topTwo = look.cribs.slice(0, 2);

  return (
    <div className="look">
      <header className="page-header">
        <h1 className="headline-lg text-primary">Your look</h1>
        <p className="body-lg text-on-surface-variant">{summary}</p>
        {look.notes.map(n => (
          <p key={n} className="body-md text-on-surface-variant">
            {n}
          </p>
        ))}
      </header>
      <div className="look-rail" tabIndex={0} aria-label="Your matches">
        {look.cribs.map(c => (
          <LookCard key={c.item.slug} item={c.item} finish={c.finish} note={c.note} />
        ))}
        {look.storage.map(item => (
          <LookCard key={item.slug} item={item} finish={null} note={null} />
        ))}
      </div>
      <p className="look-actions">
        {topTwo.length > 1 && (
          <Link
            href="/compare"
            className="button-primary"
            onClick={() => setCompare(topTwo.map(c => ({ slug: c.item.slug, finish: c.finish })))}
          >
            Compare the top two
          </Link>
        )}
        <button type="button" className="filter-link" onClick={resetRun}>
          Start over
        </button>
        <button type="button" className="filter-link" onClick={onBack}>
          Back to the last question
        </button>
        <Link href="/products" className="filter-link">
          See everything
        </Link>
        <Link href="/contact" className="filter-link">
          Ask a person
        </Link>
      </p>
    </div>
  );
}

function Slide({ pair, onPick, picked }: { pair: Pair; onPick: (side: Side) => void; picked: Side | null }) {
  return (
    <div className="halves">
      {(['a', 'b'] as const).map(side => (
        <button
          key={side}
          type="button"
          className={picked === side ? 'half half--picked' : 'half'}
          onClick={() => onPick(side)}
        >
          <span className="half-photo">
            {pair[side].image ? <Image src={pair[side].image} alt="" fill sizes="(max-width: 767px) 90vw, 45vw" priority /> : null}
          </span>
          <span className="half-label">{pair[side].label}</span>
        </button>
      ))}
    </div>
  );
}

/**
 * Help me pick. The answers live in the selections store (localStorage), so
 * the page itself stays static and a shopper can leave and come back to the
 * same question. Swipe left or press → to skip; swipe right or press ← to go
 * back.
 */
export default function PickRun({ items }: { items: ShopItem[] }) {
  const { run } = useSelections();
  const find = useMemo(() => (slug: string) => items.find(i => i.slug === slug), [items]);
  const pairs = useMemo(() => pairsFor(run.picks, find), [run.picks, find]);
  const [flash, setFlash] = useState<Side | null>(null);
  const [note, setNote] = useState('');
  const start = useRef<number | null>(null);
  const distance = useRef(0);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const atEnd = run.at >= pairs.length;
  const index = Math.min(run.at, pairs.length - 1);
  const pair = pairs[index];
  const words = tasteWords(prefsFrom(run.picks, find));

  const choose = (side: Side) => {
    setFlash(side);
    setNote(side === 'skip' ? 'Skipped. Press Back to undo.' : '');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(
      () => {
        setFlash(null);
        pickRun(pair.id, side, index + 1);
      },
      side === 'skip' || reduced ? 0 : 170,
    );
  };

  const back = () => {
    setNote('');
    if (atEnd) {
      undoPick(pairs[pairs.length - 1].id, pairs.length - 1);
      return;
    }
    if (index === 0) return;
    undoPick(pairs[index - 1].id, index - 1);
  };

  if (atEnd) return <YourLook items={items} onBack={back} />;

  return (
    <div
      className="run"
      onKeyDown={e => {
        if ((e.target as HTMLElement).closest('input,textarea')) return;
        if (e.key === 'ArrowLeft') back();
        if (e.key === 'ArrowRight') choose('skip');
      }}
    >
      <div className="run-head">
        <div className="run-bar">
          {index > 0 ? (
            <button type="button" onClick={back}>
              Back
            </button>
          ) : (
            <Link href="/products">Back</Link>
          )}
          <div className="run-progress" aria-hidden="true">
            {pairs.map((p, i) => (
              <i key={p.id} className={i < index ? 'on' : ''} />
            ))}
          </div>
          <button type="button" onClick={() => choose('skip')}>
            Skip
          </button>
        </div>
        <h1 className="headline-lg text-primary">{pair.question}</h1>
        <p className="body-md text-on-surface-variant run-taste" role="status">
          {note || (words.length > 0 ? `Your taste so far: ${words.join(', ')}` : 'Tap the one you like, or skip.')}
        </p>
      </div>
      <div
        className="run-stage"
        onPointerDown={e => {
          start.current = e.clientX;
          distance.current = 0;
        }}
        onPointerMove={e => {
          if (start.current !== null) distance.current = e.clientX - start.current;
        }}
        onPointerUp={() => {
          if (start.current === null) return;
          start.current = null;
          if (distance.current < -SWIPE_DISTANCE) choose('skip');
          else if (distance.current > SWIPE_DISTANCE) back();
        }}
      >
        <Slide key={pair.id} pair={pair} onPick={choose} picked={flash} />
      </div>
      <p className="run-teach">
        <b>Good to know</b> {pair.teach}
      </p>
    </div>
  );
}
