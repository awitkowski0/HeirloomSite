'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import PlateSpread from './PlateSpread';
import { CRIB_STYLES } from '@/lib/crib-styles';
import { formatPriceApprox } from '@/lib/format';
import type { LearnCard, Plate } from '@/lib/plates';
import type { ShopItem } from '@/lib/shop';
import { compareOnly, currentSelections, pickRun, requestCompareOpen, resetRun, setAside, setRunAt, useSelections } from '@/context/selectionsStore';

const PICKS_FOR_RESULT = 6;

type Slide = { kind: 'plate'; plate: Plate; plateNumber: number } | { kind: 'learn'; card: LearnCard } | { kind: 'result' };

function calm() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/* The style the picks lean toward, from the real tags on the pieces chosen. */
function resultFor(plates: readonly Plate[], picks: Record<string, 'left' | 'right'>) {
  const chosen = plates.flatMap(p => (picks[p.id] ? [p[picks[p.id]].item] : []));
  const tally = new Map<string, number>();
  for (const item of chosen) if (item.style) tally.set(item.style, (tally.get(item.style) ?? 0) + 1);
  const styleId = [...tally.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const style = CRIB_STYLES.find(s => s.id === styleId) ?? null;
  const tone = picks['light-or-dark'] === 'left' ? 'light finishes' : picks['light-or-dark'] === 'right' ? 'dark finishes' : null;
  const mood = picks['refined-or-rustic'] === 'left' ? 'a traditional room' : picks['refined-or-rustic'] === 'right' ? 'a rustic room' : null;
  const all = new Map(plates.flatMap(p => [p.left.item, p.right.item]).map(i => [i.slug, i]));
  const matching = [...all.values()].filter(i => style && i.style === style.id);
  const pieces: ShopItem[] = [...new Map([...matching, ...chosen].map(i => [i.slug, i])).values()].slice(0, 4);
  return { style, tone, mood, pieces };
}

export default function PlateRun({ plates, cards }: { plates: readonly Plate[]; cards: readonly LearnCard[] }) {
  const { run } = useSelections();
  const track = useRef<HTMLDivElement>(null);
  const [visibleIndex, setVisibleIndex] = useState(0);

  const slides = useMemo<Slide[]>(() => {
    const out: Slide[] = [];
    plates.forEach((plate, index) => {
      out.push({ kind: 'plate', plate, plateNumber: index + 1 });
      for (const card of cards) if (card.after === plate.id) out.push({ kind: 'learn', card });
    });
    out.push({ kind: 'result' });
    return out;
  }, [plates, cards]);

  const goTo = (index: number, instant = false) => {
    const clamped = Math.min(Math.max(index, 0), slides.length - 1);
    const element = track.current?.children[clamped];
    if (!element) return;
    const phone = window.matchMedia('(max-width: 767px)').matches;
    const behavior = instant || calm() ? 'auto' : 'smooth';
    if (phone) {
      // Sideways only, then bring the run's top edge up so the whole pair fits.
      track.current?.scrollTo({ left: track.current.clientWidth * clamped, behavior });
      window.scrollTo({ top: window.scrollY + (track.current?.parentElement?.getBoundingClientRect().top ?? 0), behavior });
    } else {
      element.scrollIntoView({ behavior, block: 'start' });
    }
  };

  /* Resume on a phone, where the run is one slide at a time. */
  useEffect(() => {
    const element = track.current;
    if (!element) return;
    const saved = currentSelections().run.at;
    if (saved > 0 && window.matchMedia('(max-width: 767px)').matches) {
      element.scrollTo({ left: element.clientWidth * saved, behavior: 'auto' });
    }
    const observer = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const index = [...element.children].indexOf(entry.target);
          setVisibleIndex(index);
          if (window.matchMedia('(max-width: 767px)').matches) setRunAt(index);
        }
      },
      { root: null, threshold: 0.6 },
    );
    [...element.children].forEach(child => observer.observe(child));
    return () => observer.disconnect();
  }, []);

  const pick = (slideIndex: number, plate: Plate, side: 'left' | 'right') => {
    pickRun(plate.id, side);
    goTo(slideIndex + 1);
  };

  const picks = run.picks;
  const pickCount = plates.filter(p => picks[p.id]).length;
  const current = slides[visibleIndex];
  const plateNumber = current?.kind === 'plate'
    ? current.plateNumber
    : slides.slice(0, visibleIndex + 1).filter(s => s.kind === 'plate').length;
  const result = resultFor(plates, picks);

  return (
    <section className="run" aria-label="This or That">
      <div className="run-progress">
        <p aria-live="polite">{current?.kind === 'result' ? 'Your look' : `Plate ${plateNumber} of ${plates.length}`}</p>
        <span className="run-bar" aria-hidden="true">
          <span style={{ width: `${((visibleIndex + 1) / slides.length) * 100}%` }} />
        </span>
        <div className="run-buttons">
          <button type="button" disabled={visibleIndex === 0} onClick={() => goTo(visibleIndex - 1)}>Back</button>
          <button type="button" disabled={visibleIndex === slides.length - 1} onClick={() => goTo(visibleIndex + 1)}>Skip</button>
        </div>
      </div>

      <div className="run-track" ref={track}>
        {slides.map((slide, index) => (
          <div className="run-slide" key={slide.kind === 'plate' ? slide.plate.id : slide.kind === 'learn' ? slide.card.title : 'result'}>
            {slide.kind === 'plate' && (
              <PlateSpread plate={slide.plate} priority={index === 0} pick={picks[slide.plate.id] ?? null} onPick={side => pick(index, slide.plate, side)} />
            )}
            {slide.kind === 'learn' && (
              <aside className="learn">
                <p className="label-caps">Good to know</p>
                {slide.card.sketch && (
                  <Image className="learn-sketch" src={slide.card.sketch.src} alt={slide.card.sketch.alt} width={slide.card.sketch.width} height={slide.card.sketch.height} sizes="320px" />
                )}
                <h3>{slide.card.title}</h3>
                <p>{slide.card.body}</p>
                <button type="button" className="plate-compare" onClick={() => goTo(index + 1)}>Continue &rarr;</button>
              </aside>
            )}
            {slide.kind === 'result' && (
              <div className="run-result" id="your-look">
                <p className="label-caps">Your look</p>
                {pickCount < PICKS_FOR_RESULT ? (
                  <>
                    <h2>A Few More to Go</h2>
                    <p>Pick {PICKS_FOR_RESULT - pickCount} more and we&rsquo;ll put your look together.</p>
                    <button type="button" className="plate-compare" onClick={() => goTo(0)}>Back to the start &rarr;</button>
                  </>
                ) : (
                  <>
                    <h2>{result.style?.label ?? 'A Mix of Things'}</h2>
                    {(result.tone || result.mood) && (
                      <p>{[result.tone && `In ${result.tone}`, result.mood && `for ${result.mood}`].filter(Boolean).join(', ')}.</p>
                    )}
                    <ul className="run-pieces">
                      {result.pieces.map(item => (
                        <li key={item.slug}>
                          <Link href={`/product/${item.slug}`}>
                            <span className="run-piece-img">
                              {item.image ? <Image src={item.image} alt="" fill sizes="(max-width: 767px) 45vw, 240px" style={{ objectFit: 'contain', objectPosition: 'bottom' }} /> : null}
                            </span>
                            <span className="plate-name">{item.name}</span>
                            <span className="plate-price">From {formatPriceApprox(item.price)}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                    <div className="run-result-actions">
                      <button type="button" className="button-primary" onClick={() => result.pieces.forEach(setAside)}>Set these aside</button>
                      {result.pieces.length >= 2 && (
                        <button
                          type="button"
                          className="button-secondary"
                          onClick={() => {
                            compareOnly(result.pieces.slice(0, 2));
                            requestCompareOpen();
                          }}
                        >
                          Compare them
                        </button>
                      )}
                    </div>
                    <p className="run-result-more">
                      <button
                        type="button"
                        onClick={() => {
                          resetRun();
                          goTo(0);
                        }}
                      >
                        Play it again
                      </button>
                      {' · '}
                      <Link href="/products">See everything</Link>
                    </p>
                  </>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
