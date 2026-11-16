'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import TalkToPerson from '@/components/layout/TalkToPerson';
import PieceActions from '@/components/selections/PieceActions';
import { pickRun, resetRun, setCompare, undoPick, useSelections } from '@/context/selectionsStore';
import { recordInterest } from '@/lib/interest/store';
import { buildLook, pairsFor, prefsFrom, tasteWords, type Pair, type Side } from '@/lib/pick-run';
import { formatPriceApprox } from '@/lib/format';
import { shortBuilderName } from '@/lib/names';
import type { ShopItem } from '@/lib/shop';
import { variantHref } from '@/lib/variants';

const SWIPE_DISTANCE = 70;

function LookCard({ item, finish, note }: { item: ShopItem; finish: string | null; note: string | null }) {
  const entry = item.finishImages.find(f => f.name === finish);
  const image = entry?.image ?? item.image;
  const href = entry && item.finishImages.length > 1 ? variantHref(item.slug, entry.wood, entry.stainName) : `/product/${item.slug}`;
  return (
    <article className="look-card">
      <Link href={href} className="look-photo">
        {image ? <Image src={image} alt={`${item.name}${finish ? ` in ${finish}` : ''}`} fill sizes="(max-width: 859px) 70vw, 280px" /> : null}
      </Link>
      <h3>{item.name}</h3>
      <p className="small">
        {formatPriceApprox(item.price)}
        {item.builder && item.builderHref ? <> · <Link href={item.builderHref} className="builder-name">{shortBuilderName(item.builder)}</Link></> : ''}
        {item.finishImages.length > 1 && finish ? ` · ${finish}` : ''}
        {note ? <><br />{note}</> : null}
      </p>
      <p className="card-actions"><PieceActions item={item} finish={finish} /></p>
    </article>
  );
}

function YourLook({ items }: { items: readonly ShopItem[] }) {
  const { run } = useSelections();
  const look = useMemo(() => buildLook(run.picks, items), [run.picks, items]);
  const words = tasteWords(look.prefs);
  const summary = words.length > 0 ? `${words[0][0].toUpperCase()}${words.join(', ').slice(1)}` : 'You skipped every question. Here are a few places to start.';
  const topTwo = look.cribs.slice(0, 2);

  return (
    <div className="look">
      <header className="page-intro">
        <h1>Your look</h1>
        <p className="small">{summary}</p>
        {look.notes.map(n => <p key={n} className="small">{n}</p>)}
      </header>
      <div className="look-rail" tabIndex={0} aria-label="Your matches">
        {look.cribs.map(c => <LookCard key={c.item.slug} item={c.item} finish={c.finish} note={c.note} />)}
        {look.storage.map(item => <LookCard key={item.slug} item={item} finish={null} note={null} />)}
      </div>
      <p className="page-intro look-actions">
        {topTwo.length > 1 && (
          <Link
            href="/compare"
            className="btn"
            onClick={() => setCompare(topTwo.map(c => ({ item: c.item, finish: c.finish })))}
          >
            Compare the top two
          </Link>
        )}
        <button type="button" className="link" onClick={resetRun}>Start over</button>
        <Link href="/products" className="link">See everything</Link>
      </p>
      <p className="page-intro small"><TalkToPerson /></p>
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
            {pair[side].image ? <Image src={pair[side].image} alt="" fill sizes="(max-width: 859px) 90vw, 45vw" priority /> : null}
          </span>
          <span className="half-label">{pair[side].label}</span>
        </button>
      ))}
    </div>
  );
}

export default function PickRun({ items }: { items: ShopItem[] }) {
  const { run } = useSelections();
  const find = useMemo(() => (slug: string) => items.find(i => i.slug === slug), [items]);
  const pairs = useMemo(() => pairsFor(run.picks, find), [run.picks, find]);
  const [flash, setFlash] = useState<Side | null>(null);
  const [note, setNote] = useState('');
  const start = useRef<number | null>(null);
  const distance = useRef(0);
  const swiped = useRef(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const atEnd = run.at >= pairs.length;
  const index = Math.min(run.at, pairs.length - 1);
  const pair = pairs[index];
  const words = tasteWords(prefsFrom(run.picks, find));

  const choose = (side: Side) => {
    if (swiped.current) return;
    setFlash(side);
    setNote(side === 'skip' ? 'Skipped. Press Back to undo.' : '');
    if (side !== 'skip') {
      const chosen = pair[side];
      const other = pair[side === 'a' ? 'b' : 'a'];
      recordInterest({ kind: 'this_or_that', slug: chosen.slug, otherSlug: other.slug, finish: chosen.finish, otherFinish: other.finish });
    }
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      setFlash(null);
      pickRun(pair.id, side, index + 1);
    }, side === 'skip' || reduced ? 0 : 170);
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

  if (atEnd) {
    return (
      <>
        <YourLook items={items} />
        <p className="page-intro"><button type="button" className="link link--quiet" onClick={back}>Back to the last question</button></p>
      </>
    );
  }

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
          {index > 0 ? <button type="button" onClick={back}>Back</button> : <Link href="/">Back</Link>}
          <div className="run-progress" aria-hidden="true">
            {pairs.map((p, i) => <i key={p.id} className={i < index ? 'on' : ''} />)}
          </div>
          <button type="button" onClick={() => choose('skip')}>Skip</button>
        </div>
        <h1>{pair.question}</h1>
        <p className="small run-taste" role="status">
          {note || (words.length > 0 ? `Your taste so far: ${words.join(', ')}` : 'Tap the one you like, or swipe left to skip.')}
        </p>
      </div>
      <div
        className="run-stage"
        onPointerDown={e => {
          start.current = e.clientX;
          distance.current = 0;
          swiped.current = false;
        }}
        onPointerMove={e => {
          if (start.current !== null) distance.current = e.clientX - start.current;
        }}
        onPointerUp={() => {
          if (start.current === null) return;
          start.current = null;
          if (Math.abs(distance.current) > SWIPE_DISTANCE) {
            const delta = distance.current;
            swiped.current = false;
            if (delta < 0) choose('skip');
            else back();
            swiped.current = true;
            window.setTimeout(() => {
              swiped.current = false;
            }, 60);
          }
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
