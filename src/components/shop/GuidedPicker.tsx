'use client';

import { useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import TurnstileWidget, {
  type TurnstileHandle,
  type TurnstileStatus,
} from '@/components/checkout/TurnstileWidget';
import { CRIB_STYLES } from '@/lib/crib-styles';
import type { ShopItem } from '@/lib/shop';
import { TURNSTILE_ACTIONS } from '@/lib/turnstile-action';
import { EMPTY_FILTERS, applyFilters, type Filters } from './filters';

/*
 * Two ways to narrow the catalog in one panel: tap-through questions that set
 * real filters, and a typed question answered by /api/chat. The typed answers
 * are AI-generated and labeled so; the tap-through path needs no model.
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
interface LiveMessage {
  role: 'user' | 'assistant';
  content: string;
  pieces?: string[];
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
    ask: 'Which style are you drawn to?',
    when: f => f.type === 'Cribs',
    options: CRIB_STYLES.map(s => ({ label: s.label, apply: { style: s.id } })),
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
  const [live, setLive] = useState<LiveMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  // The Turnstile script loads only once someone starts to type a question.
  const [engaged, setEngaged] = useState(false);
  const [token, setToken] = useState('');
  const [status, setStatus] = useState<TurnstileStatus>('pending');
  const turnstile = useRef<TurnstileHandle>(null);

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
    setLive([]);
    setError('');
    onFilters(EMPTY_FILTERS);
  };

  const send = async (e: FormEvent) => {
    e.preventDefault();
    const content = draft.trim();
    if (!content || busy) return;
    const history: LiveMessage[] = [...live, { role: 'user', content }];
    setLive(history);
    setDraft('');
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: history.map(m => ({ role: m.role, content: m.content })),
          turnstileToken: token,
        }),
      });
      const data = (await res.json()) as { reply?: string; pieces?: string[]; error?: string };
      if (!res.ok || !data.reply) throw new Error(data.error);
      setLive([...history, { role: 'assistant', content: data.reply, pieces: data.pieces ?? [] }]);
    } catch (err) {
      setLive(live);
      setDraft(content);
      setError(err instanceof Error && err.message ? err.message : 'Live chat is unavailable right now.');
    } finally {
      // A token is single-use whether the request worked or not.
      setToken('');
      turnstile.current?.reset();
      setBusy(false);
    }
  };

  const nameOf = (slug: string) => items.find(i => i.slug === slug)?.name;
  const waiting = engaged && status === 'pending';

  return (
    <aside id="help-me-pick" className="guide" aria-label="Help me pick">
      <p className="guide__title">Help me pick</p>
      <p className="guide__note">Tap an answer, or ask anything below.</p>
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
        {live.map((m, i) => (
          <div key={i}>
            <p className={m.role === 'user' ? 'guide__bubble guide__bubble--me' : 'guide__bubble'}>
              {m.content}
            </p>
            {m.pieces && m.pieces.length > 0 && (
              <div className="guide__replies">
                {m.pieces.map(slug => (
                  <Link key={slug} href={`/product/${slug}`} className="shop-chip">
                    {nameOf(slug) ?? slug}
                  </Link>
                ))}
                {m.pieces.length >= 2 && (
                  <button
                    type="button"
                    className="shop-chip shop-chip--solid"
                    onClick={() => onCompare(m.pieces ?? [])}
                  >
                    Compare these
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
        {busy && <p className="guide__bubble">Looking through the catalog&hellip;</p>}
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

      <form className="guide__form" onSubmit={send}>
        <label className="guide__label" htmlFor="guide-question">Ask about the catalog</label>
        <div className="guide__row">
          <input
            id="guide-question"
            value={draft}
            maxLength={600}
            placeholder="Which crib is ready soonest?"
            autoComplete="off"
            onChange={e => setDraft(e.target.value)}
            onFocus={() => setEngaged(true)}
          />
          <button type="submit" className="shop-chip shop-chip--solid" disabled={busy || waiting || !draft.trim()}>
            Ask
          </button>
        </div>
        {engaged && (
          <TurnstileWidget
            ref={turnstile}
            action={TURNSTILE_ACTIONS.chat}
            onToken={setToken}
            onStatus={setStatus}
          />
        )}
        <p className="guide__fine">AI answers from our catalog. It can make mistakes, so confirm details with us. Please don&rsquo;t share personal information.</p>
        {error && <p className="guide__fine guide__fine--error" role="alert">{error}</p>}
      </form>

      {(answers.length > 0 || live.length > 0) && (
        <button type="button" className="shop-clear" onClick={restart}>Start over</button>
      )}
    </aside>
  );
}
