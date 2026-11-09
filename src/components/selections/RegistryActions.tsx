'use client';

import { useState } from 'react';
import { sendToBabylist, type RegistryLine } from '@/lib/babylist';

function Fallback({ line }: { line: RegistryLine }) {
  const [copied, setCopied] = useState(false);
  const url = typeof window === 'undefined' ? line.href : `${window.location.origin}${line.href}`;
  return (
    <p className="registry-fallback" role="status">
      Babylist&rsquo;s button isn&rsquo;t available in this browser. Copy this link and add it on Babylist:{' '}
      <a href={line.href} className="doc-link">{line.title}</a>{' '}
      <button
        type="button"
        className="tray-link"
        onClick={() => {
          void navigator.clipboard?.writeText(url).then(() => setCopied(true), () => setCopied(false));
        }}
      >
        {copied ? 'Copied' : 'Copy link'}
      </button>
    </p>
  );
}

/*
 * Each line is its own call, made by its own click. The whole-list stepper
 * exists because the API takes one item at a time: the shopper advances it, so
 * Babylist's window is never asked to open several times at once.
 */
export default function RegistryActions({ lines }: { lines: RegistryLine[] }) {
  const [sent, setSent] = useState<ReadonlySet<string>>(new Set());
  const [blocked, setBlocked] = useState<string | null>(null);
  const [step, setStep] = useState<number | null>(null);

  if (lines.length === 0) {
    return <p className="tray-empty">Set something aside and you can send it to your Babylist registry from here.</p>;
  }

  const send = (line: RegistryLine) => {
    const result = sendToBabylist(line);
    if (result === 'sent') {
      setSent(prev => new Set(prev).add(line.key));
      setBlocked(null);
    } else {
      setBlocked(line.key);
    }
    return result;
  };
  const current = step === null ? null : lines[step];

  return (
    <div className="registry">
      <ul className="tray-items">
        {lines.map(line => (
          <li key={line.key} className="registry-line">
            <span className="tray-name">{line.title}</span>
            {sent.has(line.key) ? (
              <span className="registry-sent">Sent to Babylist</span>
            ) : (
              <button type="button" className="tray-link" onClick={() => send(line)}>Add to Babylist</button>
            )}
            {blocked === line.key && step === null && <Fallback line={line} />}
          </li>
        ))}
      </ul>
      {lines.length > 1 && step === null && (
        <button type="button" className="button-secondary registry-start" onClick={() => setStep(0)}>
          Send all, one at a time
        </button>
      )}
      {current && step !== null && (
        <div className="registry-stepper">
          <p className="label-caps">Item {step + 1} of {lines.length}</p>
          <p>{current.title}</p>
          {blocked === current.key && <Fallback line={current} />}
          <div className="tray-actions">
            {sent.has(current.key) ? (
              <span className="registry-sent">Sent to Babylist</span>
            ) : (
              <button type="button" className="button-primary" onClick={() => send(current)}>Add to Babylist</button>
            )}
            <button
              type="button"
              className="button-secondary"
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
