'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { PHONE_DISPLAY, PHONE_HREF, openState } from '@/lib/hours';

interface Message {
  mine: boolean;
  text: string;
  context?: string;
}

/*
 * A stub: nothing typed here leaves the browser until a chat service is chosen.
 * The auto-reply says so, because a parent waiting on an answer deserves to know.
 */
export default function ChatPanel({
  pieceName,
  cartSummary,
  onClose,
}: {
  pieceName: string | null;
  cartSummary: string | null;
  onClose: () => void;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [attachPiece, setAttachPiece] = useState(Boolean(pieceName));
  const [lastPiece, setLastPiece] = useState(pieceName);
  if (pieceName !== lastPiece) {
    setLastPiece(pieceName);
    setAttachPiece(Boolean(pieceName));
  }
  const log = useRef<HTMLDivElement>(null);
  const hours = openState(new Date());

  useEffect(() => {
    if (log.current) log.current.scrollTop = log.current.scrollHeight;
  }, [messages]);

  const send = (e: FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    const context = [attachPiece ? pieceName : null, cartSummary].filter(Boolean).join(' · ') || undefined;
    setMessages(m => [
      ...m,
      { mine: true, text, context },
      {
        mine: false,
        text: `This is a preview, so no one is reading this yet. For now, call ${PHONE_DISPLAY}.${hours.next ? ` On the real site someone would reply ${hours.next}.` : ''}`,
      },
    ]);
    setDraft('');
    setAttachPiece(false);
  };

  return (
    <div className="chat">
      <div className="panel-head chat-head">
        <h2>Chat</h2>
        <a href={PHONE_HREF} className="chat-phone">{PHONE_DISPLAY}</a>
        <button type="button" className="panel-close" aria-label="Close" onClick={onClose}>×</button>
      </div>
      <div className="chat-log" ref={log}>
        <p className="bubble">How can I help you?</p>
        {messages.map((m, i) => (
          <p key={i} className={m.mine ? 'bubble bubble--me' : 'bubble'}>
            {m.context && <span className="bubble-context">{m.context}</span>}
            {m.text}
          </p>
        ))}
      </div>
      {pieceName && (
        <div className="chat-attach">
          <button type="button" className="link" aria-pressed={attachPiece} onClick={() => setAttachPiece(v => !v)}>
            {attachPiece ? `Re: ${pieceName} ×` : `Ask about ${pieceName}`}
          </button>
        </div>
      )}
      <form className="composer" onSubmit={send}>
        <input
          value={draft}
          onChange={e => setDraft(e.target.value)}
          aria-label="Your message"
          placeholder="Ask a question…"
          autoComplete="off"
        />
        <button type="submit">Send</button>
      </form>
    </div>
  );
}
