'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import TalkToPerson from '@/components/layout/TalkToPerson';
import { filtersToHash, parseIntent } from '@/lib/intent';

const EXAMPLES = [
  ['Grows with them', 'crib that grows'],
  ['Light wood', 'light crib'],
  ['Something dark', 'dark crib'],
  ['A gift', 'gift'],
  ['Not sure yet', 'not sure'],
] as const;

/* The site's main line, so its heading is the page's h1. */
export default function IntentBox() {
  const router = useRouter();
  const [miss, setMiss] = useState('');

  const run = (text: string) => {
    const intent = parseIntent(text);
    if (intent.kind === 'gift') router.push('/gifts');
    else if (intent.kind === 'pick') router.push('/pick');
    else if (intent.kind === 'filter') router.push(`/products${filtersToHash(intent.filters)}`);
    else setMiss(text.trim() ? `We couldn’t match “${text.trim()}” to anything we carry.` : 'Tell us a little about what you want.');
  };

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    run(String(new FormData(e.currentTarget).get('q') ?? ''));
  };

  return (
    <div className="intent">
      <h1>What are you looking for?</h1>
      <p className="intent-sub">Solid wood cribs and nursery furniture, made to order.</p>
      <form className="ask" onSubmit={submit}>
        <input name="q" aria-label="What are you looking for?" placeholder="A pale crib with slats" autoComplete="off" />
        <button type="submit">Find it</button>
      </form>
      {miss ? (
        <div className="intent-miss" role="status">
          <p>{miss} Try one of these, or ask a person.</p>
          <p className="intent-row"><Link href="/products" className="link">See every piece</Link> <TalkToPerson /></p>
        </div>
      ) : null}
      <div className="intent-examples">
        {EXAMPLES.map(([label, query]) => (
          <button key={label} type="button" className="link link--quiet" onClick={() => run(query)}>{label}</button>
        ))}
      </div>
    </div>
  );
}
