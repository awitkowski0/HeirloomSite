'use client';

import { consentStatus, subscribeConsent } from './consent';

/**
 * The Meta (Facebook) Pixel, loaded lazily and only with consent.
 *
 * WHY THIS IS NOT A <Script> IN layout.tsx, which is what Meta's own install
 * instructions tell you to do: the layout renders before consent is known, and
 * `strategy="afterInteractive"` would fetch fbevents.js and set an _fbp cookie
 * for a visitor who is at that moment still looking at the banner. The pixel is
 * the single most consent-relevant thing on this site - it is advertising
 * rather than operations - so it is the one that must not be in the HTML at
 * all until someone says yes.
 *
 * Everything here is a no-op when NEXT_PUBLIC_META_PIXEL_ID is unset, which is
 * the case in local development and preview by design (see .env.example): test
 * traffic does not merely add noise to a pixel, it teaches Meta's optimiser to
 * chase people who behave like whoever was clicking around a dev server.
 */

/*
 * The `fbq` stub, typed.
 *
 * fbq is a function that also carries state, which is why this is an interface
 * with a call signature rather than a plain function type. Meta ships this as a
 * minified one-liner to paste into a script tag; it is written out here instead
 * because a hand-written stub is inspectable, does not need a
 * dangerouslySetInnerHTML, and does not lean on the CSP's 'unsafe-inline' for
 * something we control.
 */
interface Fbq {
  (...args: unknown[]): void;
  callMethod?: (...args: unknown[]) => void;
  queue: unknown[][];
  push: Fbq;
  loaded: boolean;
  version: string;
}

declare global {
  interface Window {
    fbq?: Fbq;
    _fbq?: Fbq;
  }
}

const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;
const SCRIPT_SRC = 'https://connect.facebook.net/en_US/fbevents.js';

function installStub(): Fbq {
  const fbq = function (this: unknown, ...args: unknown[]) {
    /*
     * Before fbevents.js arrives, calls pile up in `queue`; the real library
     * drains it on load. This is what makes a track() in the same tick as
     * loadMetaPixel() safe - though the app-level queue in posthog-client
     * handles the much longer window BEFORE the stub exists at all.
     */
    if (fbq.callMethod) fbq.callMethod.apply(this, args);
    else fbq.queue.push(args);
  } as Fbq;

  fbq.push = fbq;
  fbq.loaded = true;
  fbq.version = '2.0';
  fbq.queue = [];
  return fbq;
}

/**
 * Load the pixel. Idempotent, and called from exactly one place: the consent
 * subscription at the bottom of this file.
 */
export function loadMetaPixel(): void {
  if (typeof window === 'undefined' || !PIXEL_ID) return;
  if (consentStatus() !== 'granted') return;

  if (!window.fbq) {
    const fbq = installStub();
    window.fbq = fbq;
    if (!window._fbq) window._fbq = fbq;

    const script = document.createElement('script');
    script.async = true;
    script.src = SCRIPT_SRC;
    document.head.appendChild(script);

    window.fbq('init', PIXEL_ID);
    window.fbq('track', 'PageView');
    return;
  }

  // Already stubbed: this is a re-grant after a withdrawal, so the library is
  // present but was told to stop. Turn it back on rather than re-injecting.
  window.fbq('consent', 'grant');
  window.fbq('track', 'PageView');
}

/**
 * Send a standard Meta event.
 *
 * `eventID` is not decoration and is worth the one line it costs. It is the
 * only thing that lets a future server-side Conversions API call be
 * DEDUPLICATED against the browser event - Meta matches the two by this id, and
 * without it the same conversion is counted twice. Retrofitting it later means
 * a period of double-counted history that cannot be repaired, so it goes in now
 * even though the CAPI half is explicitly deferred.
 */
export function metaTrack(event: string, properties?: Record<string, unknown>): void {
  if (typeof window === 'undefined' || !PIXEL_ID) return;
  if (consentStatus() !== 'granted') return;
  if (!window.fbq) return;
  /*
   * randomUUID() exists only in a secure context. Production, preview and
   * localhost all qualify, so this fallback should never run - but metaTrack is
   * called from inside productViewed, productAddedToCart and checkoutStarted,
   * and a throw here would take the PostHog capture down with it on whatever
   * odd context did not qualify. An analytics id is not worth that risk.
   */
  const eventID =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  window.fbq('track', event, properties ?? {}, { eventID });
}

/**
 * Withdrawal. Called from the consent banner alongside withdrawPostHog().
 *
 * `fbq('consent','revoke')` stops the library sending anything further, but it
 * does NOT remove what is already on the device, so the cookies are cleared by
 * hand. _fbp is the browser id and _fbc the click id; between them they are the
 * whole of what the pixel stores locally.
 *
 * Expiring them on the bare hostname and on a dot-prefixed parent covers both
 * the way the pixel sets them and an apex/subdomain split, since a cookie can
 * only be deleted with the domain it was written with.
 */
export function withdrawMetaPixel(): void {
  if (typeof window === 'undefined') return;
  try {
    window.fbq?.('consent', 'revoke');
    const { hostname } = window.location;
    const domains = [hostname, `.${hostname}`, `.${hostname.split('.').slice(-2).join('.')}`];
    for (const name of ['_fbp', '_fbc']) {
      for (const domain of new Set(domains)) {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${domain}`;
      }
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
    }
  } catch {
    // Never let this break the banner's click handler - the UI would be left
    // claiming tracking is still on when the decision has already been stored.
  }
}

/*
 * Subscribed at module scope, mirroring src/lib/posthog-client.ts.
 *
 * Both trackers therefore react to the same event from the same place, and the
 * banner does not have to remember to call two loaders in the right order. This
 * module is imported by src/lib/analytics.ts, which every capture path already
 * goes through, so the subscription is always registered.
 */
if (typeof window !== 'undefined') subscribeConsent(loadMetaPixel);
