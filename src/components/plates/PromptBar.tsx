'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import TalkToPerson from '@/components/layout/TalkToPerson';

export interface PromptPlate {
  id: string;
  number: string;
  title: string;
  keywords: readonly string[];
}

const EXAMPLES = [
  { label: 'A simple, solid crib', plate: 'open-or-solid' },
  { label: 'Something dark', plate: 'light-or-dark' },
  { label: 'A small room', plate: 'wide-or-tall' },
  { label: 'What it becomes later', plate: 'what-it-becomes' },
];

/*
 * Answers by opening the plate that fits. No model is involved here: the words
 * are matched against each plate's keywords, so it can only point at something
 * real. A live AI answer can replace `findPlate` without changing this layout.
 */
function findPlate(query: string, plates: readonly PromptPlate[]): PromptPlate | null {
  const words = query.toLowerCase().split(/[^a-z]+/).filter(w => w.length > 2);
  let best: { plate: PromptPlate; score: number } | null = null;
  for (const plate of plates) {
    const score = plate.keywords.filter(k => words.includes(k)).length;
    if (score > 0 && (!best || score > best.score)) best = { plate, score };
  }
  return best?.plate ?? null;
}

function openPlate(id: string) {
  const element = document.getElementById(id);
  if (!element) return;
  const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  element.scrollIntoView({ behavior: calm ? 'auto' : 'smooth', block: 'start', inline: 'start' });
  element.classList.remove('plate--found');
  // Reading layout restarts the highlight if the same plate is found twice.
  void element.offsetWidth;
  element.classList.add('plate--found');
}

export default function PromptBar({ plates }: { plates: readonly PromptPlate[] }) {
  const [query, setQuery] = useState('');
  const [answer, setAnswer] = useState<{ plate: PromptPlate | null; asked: boolean }>({ plate: null, asked: false });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    const plate = findPlate(query, plates);
    setAnswer({ plate, asked: true });
    if (plate) openPlate(plate.id);
  };

  return (
    <div className="prompt">
      <form className="prompt-form" onSubmit={submit}>
        <label htmlFor="prompt-input" className="visually-hidden">Tell me what you&rsquo;re looking for</label>
        <input
          id="prompt-input"
          value={query}
          maxLength={120}
          autoComplete="off"
          placeholder="What are you looking for?"
          onChange={e => setQuery(e.target.value)}
        />
        <button type="submit" className="button-primary">Show me</button>
      </form>
      <ul className="prompt-examples">
        {EXAMPLES.map(example => (
          <li key={example.plate}>
            <button type="button" onClick={() => openPlate(example.plate)}>{example.label}</button>
          </li>
        ))}
      </ul>
      <p className="prompt-answer" role="status">
        {answer.asked &&
          (answer.plate ? (
            <>Start with Plate {answer.plate.number}, {answer.plate.title}.</>
          ) : (
            <>Nothing in this edition fits that yet. <Link href="/products" className="doc-link">See everything</Link> or <TalkToPerson />.</>
          ))}
      </p>
    </div>
  );
}
