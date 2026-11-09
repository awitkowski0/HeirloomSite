'use client';

import { requestPanel } from '@/context/selectionsStore';
import { PHONE_DISPLAY, PHONE_HREF } from '@/lib/hours';

/* One help path everywhere: a text chat, with the phone number right beside it. */
export default function TalkToPerson({ piece, label = 'Talk to someone' }: { piece?: string; label?: string }) {
  return (
    <span className="talk">
      <button type="button" className="link" onClick={() => requestPanel({ kind: 'chat', piece })}>{label}</button>
      <a href={PHONE_HREF} className="link">{PHONE_DISPLAY}</a>
    </span>
  );
}
