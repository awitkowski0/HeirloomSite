'use client';

import { useEffect, useImperativeHandle, useRef } from 'react';
import type { TurnstileAction } from '@/lib/turnstile-action';

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
  reset: (id: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
    onTurnstileLoad?: () => void;
  }
}

const SCRIPT_ID = 'cf-turnstile-script';
const SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoad&render=explicit';

/**
 * What the checkout can ask of the widget.
 *
 * A Turnstile token is single-use. /api/quotes verifies it BEFORE it prices the
 * cart, so an order rejected for any other reason - a product hidden since
 * add-to-cart, a stale localStorage cart, a stain no longer sold - comes back
 * 400 with the token already spent. Without a reset the retry resends that dead
 * token, siteverify answers `timeout-or-duplicate`, and the customer is stuck on
 * "Verification failed. Please try again." with trying again being the one thing
 * that cannot work.
 */
export interface TurnstileHandle {
  /** Discard the spent token and ask Cloudflare for a fresh one. */
  reset: () => void;
}

interface Props {
  onToken: (token: string) => void;
  onStatus: (status: TurnstileStatus) => void;
  /** Which surface this token is for. Asserted server-side; see turnstile-action.ts. */
  action: TurnstileAction;
  /**
   * Cloudflare's widget appearance.
   *
   * 'interaction-only' renders NOTHING unless a challenge is actually required,
   * which is what the newsletter popup wants: a visible box inside a popup
   * asking for an email is friction on the one surface that can least afford
   * it, and a widget that errors would disable its only button.
   *
   * Checkout deliberately stays on 'always'. There the visible badge is
   * reassurance rather than friction, and it is the surface where a blocked
   * widget genuinely does need to be surfaced to the customer.
   */
  appearance?: 'always' | 'interaction-only';
  ref?: React.Ref<TurnstileHandle>;
}

export default function TurnstileWidget({
  onToken,
  onStatus,
  action,
  appearance = 'always',
  ref,
}: Props) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const boxRef = useRef<HTMLDivElement>(null);
  /*
   * At component scope, not inside the effect, because the imperative reset
   * below needs the id too. The effect remains the only thing that WRITES it.
   */
  const widgetIdRef = useRef<string | undefined>(undefined);
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
    const box = boxRef.current;

    let timer: ReturnType<typeof setTimeout> | undefined;
    const fail = () => {
      if (timer) clearTimeout(timer);
      onTokenRef.current('');
      onStatusRef.current('error');
    };

    const render = () => {
      if (timer) clearTimeout(timer);
      if (!window.turnstile || !box || widgetIdRef.current !== undefined) return;
      widgetIdRef.current = window.turnstile.render(box, {
        sitekey: siteKey,
        // Asserted server-side, so a token minted by this site key on some
        // other surface cannot be replayed against checkout.
        action,
        appearance,
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
      if (widgetIdRef.current !== undefined) {
        window.turnstile?.remove(widgetIdRef.current);
        widgetIdRef.current = undefined;
      }
    };
    /*
     * `action` and `appearance` belong here even though re-running this effect
     * tears the widget down and rebuilds it. Both are constant literals at
     * every call site, so in practice this never re-runs - and if one ever did
     * become dynamic, rebuilding is exactly right: a widget rendered with the
     * old action would mint tokens the server then rejects.
     */
  }, [siteKey, action, appearance]);

  /*
   * Back to 'pending', not 'error': reset() makes Cloudflare issue a new
   * challenge, whose callback re-fires with a fresh token in a moment. The
   * submit button stays disabled for exactly that long, which is correct - the
   * old token is already worthless.
   */
  useImperativeHandle(
    ref,
    () => ({
      reset: () => {
        if (widgetIdRef.current === undefined || !window.turnstile) return;
        window.turnstile.reset(widgetIdRef.current);
        onTokenRef.current('');
        onStatusRef.current('pending');
      },
    }),
    []
  );

  if (!siteKey) return null;
  return <div ref={boxRef} className="turnstile-widget" />;
}
