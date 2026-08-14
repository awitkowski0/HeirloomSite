'use client';

import { useEffect, useRef } from 'react';
import { TURNSTILE_ACTION } from '@/lib/turnstile-action';

/**
 * Cloudflare Turnstile widget.
 *
 * Renders nothing unless NEXT_PUBLIC_TURNSTILE_SITE_KEY is set, so a
 * deployment without Cloudflare configured behaves exactly as before. The
 * server half (src/lib/turnstile.ts) is gated on its own secret and is what
 * actually enforces this - a widget alone protects nothing.
 *
 * Reports a STATUS as well as a token, because the two failures underneath a
 * missing token are not the same problem and must not be presented as one.
 * "Not solved yet" resolves on its own in a moment; "the script never loaded"
 * never resolves, and the customer has to be told to do something about it.
 * Both used to surface as onToken(''), which the checkout ignored entirely -
 * it submitted an empty token and the server answered 403 "Verification
 * failed. Please try again.", to a customer for whom trying again could not
 * possibly work.
 */

export type TurnstileStatus =
  /** No site key: Turnstile is not configured here, so nothing gates checkout. */
  | 'disabled'
  /** Script loading, or rendered and awaiting a solve. Transient. */
  | 'pending'
  /** Token in hand. */
  | 'solved'
  /** Script blocked or the widget errored. Needs the customer to act. */
  | 'error';

/*
 * How long to wait for challenges.cloudflare.com before calling it blocked.
 *
 * A content blocker usually makes the request fail, which fires script.onerror
 * - but some drop it silently, and then onerror never fires and the widget
 * sits at 'pending' forever with the submit button disabled and no explanation.
 * Generous enough not to libel a slow connection.
 */
const LOAD_TIMEOUT_MS = 12_000;

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

interface Props {
  onToken: (token: string) => void;
  onStatus: (status: TurnstileStatus) => void;
}

export default function TurnstileWidget({ onToken, onStatus }: Props) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const boxRef = useRef<HTMLDivElement>(null);
  // Kept in a ref so re-renders never re-run the effect and duplicate the
  // widget. Synced in its own effect: writing a ref during render is a real
  // React violation, not a lint quibble - it can run twice under StrictMode and
  // during an interrupted render that never commits.
  const onTokenRef = useRef(onToken);
  const onStatusRef = useRef(onStatus);
  useEffect(() => {
    onTokenRef.current = onToken;
    onStatusRef.current = onStatus;
  }, [onToken, onStatus]);

  /*
   * Announced from its own effect so it is reported even when there is no site
   * key and the effect below returns immediately. Without this the checkout
   * would wait forever for a widget that was never going to render.
   */
  useEffect(() => {
    onStatusRef.current(siteKey ? 'pending' : 'disabled');
  }, [siteKey]);

  useEffect(() => {
    if (!siteKey || !boxRef.current) return;
    let widgetId: string | undefined;
    const box = boxRef.current;

    let timer: ReturnType<typeof setTimeout> | undefined;
    const fail = () => {
      if (timer) clearTimeout(timer);
      onTokenRef.current('');
      onStatusRef.current('error');
    };

    const render = () => {
      if (timer) clearTimeout(timer);
      if (!window.turnstile || !box || widgetId !== undefined) return;
      widgetId = window.turnstile.render(box, {
        sitekey: siteKey,
        // Asserted server-side, so a token minted by this site key on some
        // other surface cannot be replayed against checkout.
        action: TURNSTILE_ACTION,
        callback: (token: string) => {
          onTokenRef.current(token);
          onStatusRef.current('solved');
        },
        // A stale token is worse than none: it fails siteverify and the
        // customer sees a generic error at the moment they try to pay.
        // Back to 'pending', not 'error': Turnstile refreshes itself, so this
        // resolves without the customer doing anything.
        'expired-callback': () => {
          onTokenRef.current('');
          onStatusRef.current('pending');
        },
        'error-callback': fail,
      });
    };

    if (window.turnstile) {
      render();
    } else {
      window.onTurnstileLoad = render;
      timer = setTimeout(fail, LOAD_TIMEOUT_MS);
      if (!document.getElementById(SCRIPT_ID)) {
        const script = document.createElement('script');
        script.id = SCRIPT_ID;
        script.src = SRC;
        script.async = true;
        script.onerror = fail;
        document.head.appendChild(script);
      }
    }

    return () => {
      if (timer) clearTimeout(timer);
      if (widgetId !== undefined) window.turnstile?.remove(widgetId);
    };
  }, [siteKey]);

  if (!siteKey) return null;
  return <div ref={boxRef} className="turnstile-widget" />;
}
