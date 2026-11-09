'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { HOURS_LABEL, PHONE_DISPLAY, PHONE_HREF, openState } from '@/lib/hours';

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
  const [attachCart, setAttachCart] = useState(false);
  const [callback, setCallback] = useState(false);
  const log = useRef<HTMLDivElement>(null);
  const hours = openState(new Date());

  useEffect(() => {
    if (log.current) log.current.scrollTop = log.current.scrollHeight;
  }, [messages]);

  const send = (e: FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    const context = [attachPiece ? pieceName : null, attachCart ? cartSummary : null].filter(Boolean).join(' · ') || undefined;
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
    setAttachCart(false);
  };

  return (
    <div className="chat">
      <div className="panel-head">
        <h2>Talk to someone</h2>
        <button type="button" className="panel-close" aria-label="Close" onClick={onClose}>×</button>
      </div>
      <p className="chat-hours">
        {HOURS_LABEL}{hours.open ? ' · We’re here now' : ''}<br />
        <a href={PHONE_HREF} className="link">Call {PHONE_DISPLAY}</a>
      </p>
      {!hours.open && <p className="chat-closed">We’re closed right now. Leave a message and someone will reply {hours.next}.</p>}
      <div className="chat-log" ref={log}>
        <p className="bubble">How can I help you?</p>
        {messages.map((m, i) => (
          <p key={i} className={m.mine ? 'bubble bubble--me' : 'bubble'}>
            {m.context && <span className="bubble-context">{m.context}</span>}
            {m.text}
          </p>
        ))}
      </div>
      <div className="chat-attach">
        {pieceName && (
          <button type="button" className="link" aria-pressed={attachPiece} onClick={() => setAttachPiece(v => !v)}>This {pieceName}</button>
        )}
        {cartSummary && (
          <button type="button" className="link" aria-pressed={attachCart} onClick={() => setAttachCart(v => !v)}>My cart</button>
        )}
        <button type="button" className="link" aria-expanded={callback} onClick={() => setCallback(v => !v)}>Have someone call me</button>
      </div>
      {callback && (
        <form
          className="chat-callback"
          onSubmit={e => {
            e.preventDefault();
            setCallback(false);
            setMessages(m => [...m, { mine: false, text: `Preview only, so we didn’t get that. For now, call ${PHONE_DISPLAY}.` }]);
          }}
        >
          <label>Name<input name="name" required autoComplete="name" /></label>
          <label>Phone<input name="phone" required inputMode="tel" autoComplete="tel" /></label>
          <label>Best time<input name="time" /></label>
          <button type="submit" className="btn btn--line">Request a call</button>
        </form>
      )}
      <form className="composer" onSubmit={send}>
        <input
          value={draft}
          onChange={e => setDraft(e.target.value)}
          aria-label="Your message"
          placeholder={hours.open ? 'Type a message' : 'Leave a message'}
          autoComplete="off"
        />
        <button type="submit">Send</button>
      </form>
    </div>
  );
}
