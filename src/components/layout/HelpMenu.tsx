'use client';

import { useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import { PHONE_DISPLAY, PHONE_HREF } from '@/lib/hours';

/**
 * Help, as a button that opens the help pages, read in from the live site's menu.
 * A disclosure rather than a role="menu" widget: Tab moves through the links
 * exactly as it looks like it should. Under the header on a desktop, and as a
 * sheet across the screen on a phone. One tree either way.
 */
const LINKS = [
  { href: '/about-heirloom#how-an-order-works', label: 'How an order works' },
  { href: '/shipping', label: 'Delivery' },
  { href: '/returns', label: 'Returns' },
  { href: '/care', label: 'Care & finishes' },
  { href: '/safety', label: 'Safety' },
  { href: '/faq', label: 'FAQ' },
  { href: '/gifts', label: 'Gifts' },
  { href: '/contact', label: 'Contact us' },
];

export default function HelpMenu() {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Escape') return;
      setOpen(false);
      buttonRef.current?.focus();
    }
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div ref={wrapRef} className="help-menu">
      <button ref={buttonRef} type="button" className="head-link help-button" aria-expanded={open} aria-controls={panelId} onClick={() => setOpen(v => !v)}>
        Help
      </button>
      {open && (
        <div id={panelId} className="help-panel">
          <ul>
            {LINKS.map(link => (
              <li key={link.href}>
                <Link href={link.href} onClick={() => setOpen(false)}>{link.label}</Link>
              </li>
            ))}
          </ul>
          <p className="help-phone"><a href={PHONE_HREF}>Call {PHONE_DISPLAY}</a></p>
        </div>
      )}
    </div>
  );
}
