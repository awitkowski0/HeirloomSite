'use client';

import { useState } from 'react';
import { recordInterest } from '@/lib/interest/store';
import { preloadBabylist, sendToBabylist, type RegistryLine } from '@/lib/babylist';

function Fallback({ line }: { line: RegistryLine }) {
  const [copied, setCopied] = useState(false);
  const url = typeof window === 'undefined' ? line.href : `${window.location.origin}${line.href}`;
  return (
    <p className="registry-note" role="status">
      Babylist’s button isn’t available in this browser. Copy this link and add it on Babylist.{' '}
      <button
        type="button"
        className="link"
        onClick={() => {
          void navigator.clipboard?.writeText(url).then(() => setCopied(true), () => setCopied(false));
        }}
      >
        {copied ? 'Copied' : 'Copy link'}
      </button>
    </p>
  );
}

/* add.js takes one item per call and reports nothing back, so each is its own click. */
export default function RegistryActions({ lines }: { lines: RegistryLine[] }) {
  const [sent, setSent] = useState<ReadonlySet<string>>(new Set());
  const [blocked, setBlocked] = useState<string | null>(null);
  const [step, setStep] = useState<number | null>(null);

  if (lines.length === 0) {
    return <p className="panel-empty">Save a piece and you can send it to your Babylist registry from here.</p>;
  }

  const prepare = () => void preloadBabylist();
  const send = async (line: RegistryLine) => {
    const result = await sendToBabylist(line);
    if (result === 'sent') {
      setSent(prev => new Set(prev).add(line.key));
      setBlocked(null);
      const slug = line.href.split('/')[2];
      if (slug) recordInterest({ kind: 'babylist', slug });
    } else {
      setBlocked(line.key);
    }
  };
  const current = step === null ? null : lines[step];

  return (
    <div>
      <ul className="lines">
        {lines.map(line => (
          <li key={line.key} className="line line--plain">
            <span className="line-name">{line.title}</span>
            {sent.has(line.key) ? (
              <span className="line-meta">Sent to Babylist</span>
            ) : (
              <button type="button" className="link" onPointerEnter={prepare} onFocus={prepare} onClick={() => void send(line)}>Add to Babylist</button>
            )}
            {blocked === line.key && step === null && <Fallback line={line} />}
          </li>
        ))}
      </ul>
      {lines.length > 1 && step === null && (
        <p className="panel-row"><button type="button" className="link" onClick={() => setStep(0)}>Send all, one at a time</button></p>
      )}
      {current && step !== null && (
        <div className="registry-step">
          <p className="small">{step + 1} of {lines.length}: {current.title}</p>
          {blocked === current.key && <Fallback line={current} />}
          <div className="panel-row">
            {sent.has(current.key) ? (
              <span className="line-meta">Sent to Babylist</span>
            ) : (
              <button type="button" className="link" onPointerEnter={prepare} onFocus={prepare} onClick={() => void send(current)}>Add to Babylist</button>
            )}
            <button
              type="button"
              className="link"
              onClick={() => {
                setBlocked(null);
                setStep(step + 1 < lines.length ? step + 1 : null);
              }}
            >
              {step + 1 < lines.length ? 'Next' : 'Done'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
