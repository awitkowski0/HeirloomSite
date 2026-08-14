'use client';

import { useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';

/**
 * Help, as a button that opens Contact, Safety and Care.
 *
 * A disclosure rather than a `role="menu"` widget. A real menu owes the user
 * arrow-key roaming, typeahead and focus wrapping; this is three links, and
 * announcing it as a menu without implementing the keyboard contract is worse
 * for a screen-reader user than not claiming it at all. As a disclosure, Tab
 * moves through the links exactly as it looks like it should.
 *
 * Safety lives in here, which is a compromise worth naming: for a crib shop it
 * is the page that answers the question people are really asking, and it is now
 * one click further away than it was as a top-level link. It stays in the
 * footer, is linked from the product copy, and the button sits in the top-right
 * where support is looked for.
 */

const LINKS = [
  { href: '/contact', label: 'Contact us' },
  { href: '/safety', label: 'Safety & certifications' },
  { href: '/care', label: 'Care & finishes' },
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
      // Focus goes back to the control that opened it, or it lands at the top
      // of the document and a keyboard user has to tab the whole header again.
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
      <button
        ref={buttonRef}
        type="button"
        className="help-button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(v => !v)}
      >
        <span className="material-symbols-outlined" aria-hidden="true">
          help
        </span>
        Help
      </button>

      {open && (
        <div id={panelId} className="help-panel">
          {LINKS.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className="help-panel-link"
              /* Closed from the click, not from a pathname effect. The panel
                 is not remounted by a client-side navigation, so it has to be
                 told - but doing that by watching the route means setting
                 state during an effect and re-rendering the whole header on
                 every navigation to close something that is usually shut. */
              onClick={() => setOpen(false)}
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
