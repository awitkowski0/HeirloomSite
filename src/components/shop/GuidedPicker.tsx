'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { ShopItem } from '@/lib/shop';
import { EMPTY_FILTERS, applyFilters, type Filters } from './filters';

/*
 * A guided conversation over the real catalogue. It is scripted, not a language
 * model, and is labelled that way: every answer is a filter and every result is
 * a real row, so it cannot invent a product, a price or a safety claim.
 */
interface Option {
  label: string;
  apply: Partial<Filters>;
}
interface Step {
  id: string;
  ask: string;
  options: Option[];
  /** Skip this question when it would not apply to the answers so far. */
  when?: (f: Filters) => boolean;
}

const STEPS: Step[] = [
  {
    id: 'type',
    ask: 'Hi! What are you shopping for?',
    options: [
      { label: 'A crib', apply: { type: 'Cribs' } },
      { label: 'A dresser', apply: { type: 'Dressers' } },
      { label: 'A chest', apply: { type: 'Chests' } },
      { label: 'A nightstand', apply: { type: 'Nightstands' } },
    ],
  },
  {
    id: 'budget',
    ask: 'What budget feels right?',
    options: [
      { label: 'Under $1,500', apply: { band: 'under-1500' } },
      { label: '$1,500 to $2,500', apply: { band: '1500-2500' } },
      { label: '$2,500 and up', apply: { band: 'over-2500' } },
      { label: 'Show me everything', apply: {} },
    ],
  },
  {
    id: 'timing',
    ask: 'When do you need it? Everything is built after you order.',
    options: [
      { label: 'In about 2 months', apply: { maxWeeks: 8 } },
      { label: 'I have 3 months or more', apply: {} },
    ],
  },
  {
    id: 'look',
    ask: 'Which look are you drawn to?',
    when: f => f.type === 'Cribs',
    options: [
      { label: 'Open slats', apply: { front: 'Slatted' } },
      { label: 'Solid panel front', apply: { front: 'Panel' } },
      { label: 'Arched top', apply: { top: 'Arched' } },
      { label: 'Flat top', apply: { top: 'Flat' } },
    ],
  },
];

export default function GuidedPicker({
  items,
  onFilters,
  onCompare,
}: {
  items: ShopItem[];
  onFilters: (f: Filters) => void;
  onCompare: (slugs: string[]) => void;
}) {
  const [answers, setAnswers] = useState<{ step: Step; option: Option }[]>([]);
  const filters = answers.reduce<Filters>((f, a) => ({ ...f, ...a.option.apply }), EMPTY_FILTERS);
  const current = STEPS.filter(s => !s.when || s.when(filters)).find(
    s => !answers.some(a => a.step.id === s.id),
  );
  const matches = applyFilters(items, filters);

  const answer = (step: Step, option: Option) => {
    const next = [...answers, { step, option }];
    setAnswers(next);
    onFilters(next.reduce<Filters>((f, a) => ({ ...f, ...a.option.apply }), EMPTY_FILTERS));
  };
  const restart = () => {
    setAnswers([]);
    onFilters(EMPTY_FILTERS);
  };

  return (
    <aside className="guide" aria-label="Help me pick">
      <p className="guide__title">Help me pick</p>
      <p className="guide__note">A quick guided chat. It filters the real catalog.</p>
      <div className="guide__log" aria-live="polite">
        {answers.map(a => (
          <div key={a.step.id}>
            <p className="guide__bubble">{a.step.ask}</p>
            <p className="guide__bubble guide__bubble--me">{a.option.label}</p>
          </div>
        ))}
        {current ? (
          <p className="guide__bubble">{current.ask}</p>
        ) : matches.length === 0 ? (
          <p className="guide__bubble">Nothing fits all of that yet. Want to start over with a wider budget?</p>
        ) : (
          <p className="guide__bubble">
            {matches.length} {matches.length === 1 ? 'piece fits' : 'pieces fit'}. They&rsquo;re
            filtered for you here. Want to see the first few side by side?
          </p>
        )}
      </div>

      {current ? (
        <div className="guide__replies">
          {current.options.map(o => (
            <button key={o.label} type="button" className="shop-chip" onClick={() => answer(current, o)}>
              {o.label}
            </button>
          ))}
        </div>
      ) : (
        <div className="guide__replies">
          {matches.length >= 2 && (
            <button
              type="button"
              className="shop-chip shop-chip--solid"
              onClick={() => onCompare(matches.slice(0, 3).map(m => m.slug))}
            >
              Compare {Math.min(matches.length, 3)}
            </button>
          )}
          <Link href="/builders#safety-heading" className="shop-chip">
            What do builders say about safety?
          </Link>
          <Link href="/contact" className="shop-chip">Talk to a person</Link>
        </div>
      )}
      {answers.length > 0 && (
        <button type="button" className="shop-clear" onClick={restart}>Start over</button>
      )}
    </aside>
  );
}
