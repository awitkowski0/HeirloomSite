'use client';

import { useState } from 'react';
import { preloadBabylist, sendToBabylist, type RegistryLine } from '@/lib/babylist';

function Fallback({ line }: { line: RegistryLine }) {
  const [copied, setCopied] = useState(false);
  const url = typeof window === 'undefined' ? line.href : `${window.location.origin}${line.href}`;
  return (
    <p className="registry-note" role="status">
      Babylist’s button isn’t available in this browser. Copy this link and add it on Babylist.{' '}
      <button
        type="button"
        className="filter-link"
        onClick={() => {
          void navigator.clipboard?.writeText(url).then(
            () => setCopied(true),
            () => setCopied(false),
          );
        }}
      >
        {copied ? 'Copied' : 'Copy link'}
      </button>
    </p>
  );
}

/**
 * Send cart lines and saved pieces to a Babylist registry.
 *
 * add.js takes one item per call and reports nothing back, so each is its own
 * click, and a sent line reads "Sent to Babylist", never "added". The script
 * itself loads on the first hover or focus of a button (src/lib/babylist.ts).
 */
export default function RegistryActions({ lines }: { lines: RegistryLine[] }) {
  const [sent, setSent] = useState<ReadonlySet<string>>(new Set());
  const [blocked, setBlocked] = useState<string | null>(null);

  if (lines.length === 0) {
    return <p className="side-rail-empty">Save a piece or add one to your cart, and you can send it to your Babylist registry from here.</p>;
  }

  const prepare = () => void preloadBabylist();
  const send = async (line: RegistryLine) => {
    if ((await sendToBabylist(line)) === 'sent') {
      setSent(prev => new Set(prev).add(line.key));
      setBlocked(null);
    } else {
      setBlocked(line.key);
    }
  };

  return (
    <ul className="side-rail-lines">
      {lines.map(line => (
        <li key={line.key} className="side-rail-line side-rail-line--plain">
          <div className="side-rail-line-body">
            <span className="side-rail-line-name">{line.title}</span>
            {sent.has(line.key) ? (
              <span className="side-rail-line-meta">Sent to Babylist</span>
            ) : (
              <span className="side-rail-line-meta">
                <button type="button" className="side-rail-remove" onPointerEnter={prepare} onFocus={prepare} onClick={() => void send(line)}>
                  Add to Babylist
                </button>
              </span>
            )}
            {blocked === line.key && <Fallback line={line} />}
          </div>
        </li>
      ))}
    </ul>
  );
}
