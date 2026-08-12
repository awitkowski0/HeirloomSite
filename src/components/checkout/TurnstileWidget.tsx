'use client';

import { useEffect, useRef } from 'react';

/**
 * Cloudflare Turnstile widget.
 *
 * Renders nothing unless NEXT_PUBLIC_TURNSTILE_SITE_KEY is set, so a
 * deployment without Cloudflare configured behaves exactly as before. The
 * server half (src/lib/turnstile.ts) is gated on its own secret and is what
 * actually enforces this - a widget alone protects nothing.
 */

interface TurnstileApi {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  remove: (id: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
    onTurnstileLoad?: () => void;
  }
}

const SCRIPT_ID = 'cf-turnstile-script';
const SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoad&render=explicit';

export default function TurnstileWidget({ onToken }: { onToken: (token: string) => void }) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const boxRef = useRef<HTMLDivElement>(null);
  // Kept in a ref so re-renders never re-run the effect and duplicate the
  // widget. Synced in its own effect: writing a ref during render is a real
  // React violation, not a lint quibble - it can run twice under StrictMode and
  // during an interrupted render that never commits.
  const onTokenRef = useRef(onToken);
  useEffect(() => {
    onTokenRef.current = onToken;
  }, [onToken]);

  useEffect(() => {
    if (!siteKey || !boxRef.current) return;
    let widgetId: string | undefined;
    const box = boxRef.current;

    const render = () => {
      if (!window.turnstile || !box || widgetId !== undefined) return;
      widgetId = window.turnstile.render(box, {
        sitekey: siteKey,
        callback: (token: string) => onTokenRef.current(token),
        // A stale token is worse than none: it fails siteverify and the
        // customer sees a generic error at the moment they try to pay.
        'expired-callback': () => onTokenRef.current(''),
        'error-callback': () => onTokenRef.current(''),
      });
    };

    if (window.turnstile) {
      render();
    } else {
      window.onTurnstileLoad = render;
      if (!document.getElementById(SCRIPT_ID)) {
        const script = document.createElement('script');
        script.id = SCRIPT_ID;
        script.src = SRC;
        script.async = true;
        document.head.appendChild(script);
      }
    }

    return () => {
      if (widgetId !== undefined) window.turnstile?.remove(widgetId);
    };
  }, [siteKey]);

  if (!siteKey) return null;
  return <div ref={boxRef} className="turnstile-widget" />;
}
