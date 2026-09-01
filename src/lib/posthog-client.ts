'use client';

import posthog from 'posthog-js';
import { consentStatus, subscribeConsent } from './consent';

/**
 * PostHog initialisation, owned by one module and safe to call from anywhere.
 *
 * This does not live in providers.tsx any more because of effect ordering:
 * React runs child effects BEFORE parent effects, so any component that
 * captures in its own mount effect - the product page's `product_viewed`, for
 * one - ran before the provider had called init, and posthog silently drops
 * captures made before it is loaded. The top of the funnel was being lost on
 * every page load.
 *
 * Making init idempotent and calling it from the capture path instead means no
 * event can be dropped by mount order, whatever mounts first.
 *
 * IT IS ALSO CONSENT-GATED, and the two things interact in a way that is easy
 * to get wrong - see the queue below the init.
 */
export function initPostHog(): void {
  if (typeof window === 'undefined') return;
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key || posthog.__loaded) return;

  /*
   * Nothing loads until consent is granted, and this check has to be HERE
   * rather than only in capture() because capture() is not the only caller:
   * src/app/providers.tsx and src/lib/useDelistedProducts.ts both call
   * initPostHog directly. Gating only the capture path would leave the feature
   * flag hook loading posthog-js for a visitor staring at the banner - setting
   * cookies and starting the session recorder - which makes the banner
   * decorative.
   *
   * Note what is NOT done here: init with persistence:'memory' and
   * opt_out_capturing(). posthog.init starts the session recorder before any
   * opt-out deterministically takes effect, and opt_out_capturing() itself
   * writes __ph_opt_in_out_<token> to localStorage - a storage write for
   * somebody who has not consented to storage. For a visitor who has not
   * answered, the only defensible thing is to not initialise at all.
   */
  if (consentStatus() !== 'granted') return;

  posthog.init(key, {
    /*
     * In production NEXT_PUBLIC_POSTHOG_HOST is info.heirloomcribsandmore.com,
     * a reverse proxy on our own domain, so events survive the blocklists that
     * drop a request to *.posthog.com outright. next.config.ts reads the same
     * variable to build the CSP - it has to name this origin or the browser
     * blocks the thing the proxy exists to get through.
     *
     * ui_host is not optional once api_host moves. posthog-js builds the
     * toolbar and every "view in PostHog" link from api_host unless told
     * otherwise, and the proxy serves ingestion, not the app.
     */
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
    ui_host: 'https://us.posthog.com',
    person_profiles: 'identified_only',
    // App Router navigates client-side; pageviews are captured explicitly.
    capture_pageview: false,

    /*
     * Autocapture off.
     *
     * It was never configured, so posthog-js defaulted it ON across the whole
     * site including /checkout, sending element text and attributes for every
     * click. src/lib/analytics.ts is a deliberate, complete event vocabulary -
     * eleven named events covering the entire funnel - so autocapture adds
     * noise on top of a checkout form carrying a name, street address and
     * email, and adds nothing that is actually read.
     */
    autocapture: false,

    /*
     * Session recording ON, with the checkout masked.
     *
     * This was off, and the reason it was off still stands: /checkout is
     * nothing but a name, an email and a street address, all of it ordinary
     * DOM that a recorder reads as easily as a person does. Turning recording
     * on without answering that would ship those three fields to a replay
     * anyone with dashboard access can scrub through. So the masking below is
     * not decoration - it is the condition on which this is enabled at all.
     *
     * posthog-js masks input VALUES by default. Both options are stated anyway
     * rather than inherited, because a default that changes upstream would
     * unmask a checkout form silently, in a patch release, with nothing in a
     * diff to notice.
     */
    disable_session_recording: false,
    session_recording: {
      // Every <input> and <textarea> value, not just passwords.
      maskAllInputs: true,
      /*
       * Input masking is NOT enough here, and this is the part that is easy to
       * get wrong: it covers what is typed INTO a field, and nothing else. Two
       * places render the same PII back out as ordinary text, where it would
       * have been recorded in the clear:
       *
       *   AddressAutocomplete.tsx  the Radar suggestion list - full street
       *                            addresses, as <li> text
       *   CheckoutClient.tsx       the success screen's "we've emailed a copy
       *                            to <email>"
       *
       * Both carry `ph-mask`. This is posthog-js's own default class name,
       * repeated here for the same reason as above.
       */
      maskTextClass: 'ph-mask',
    },

    /*
     * Defence in depth for the order token.
     *
     * The `?token=` lookup path is gone, but $current_url is captured on every
     * pageview, so anything that ever puts a credential in a query string ships
     * it here. Strip it on the way out rather than trusting that no future URL
     * carries one.
     */
    sanitize_properties: properties => {
      const scrub = (value: unknown): unknown => {
        if (typeof value !== 'string' || !value.includes('token=')) return value;
        return value.replace(/([?&](?:token|order_token)=)[^&#]*/gi, '$1[redacted]');
      };
      return Object.fromEntries(
        Object.entries(properties).map(([k, v]) => [k, scrub(v)])
      ) as typeof properties;
    },
    // Surface client-side crashes. Console errors stay off - they are
    // dominated by third-party script noise.
    capture_exceptions: {
      capture_unhandled_errors: true,
      capture_unhandled_rejections: true,
      capture_console_errors: false,
    },
    /*
     * Local development sends nothing - unless you ask it to.
     *
     * The opt-out is still the default: dev traffic has no business in the
     * production project. But an unconditional opt-out meant analytics could
     * not be exercised anywhere except production, so the only way to find out
     * a capture was broken was to ship it and wait - which is exactly how a
     * silent gap gets diagnosed days late, against a live site.
     *
     * NEXT_PUBLIC_POSTHOG_DEBUG=1 in .env.local opts back IN and turns on
     * posthog-js's own logging. opt_in is not redundant: opt_out_capturing()
     * persists in localStorage under __ph_opt_in_out_<token>, so a browser that
     * ever loaded dev without the flag stays opted out until something clears
     * it - including, confusingly, after you set the flag.
     *
     * Production returns first and is never affected: NODE_ENV is inlined at
     * build time, so this whole body compiles away to `loaded: () => {}` in a
     * production bundle and setting the variable in Vercel does nothing.
     */
    loaded: ph => {
      if (process.env.NODE_ENV === 'production') return;
      if (process.env.NEXT_PUBLIC_POSTHOG_DEBUG === '1') {
        ph.opt_in_capturing();
        ph.debug();
      } else {
        ph.opt_out_capturing();
      }
    },
  });
}

/**
 * The only capture path in the app.
 *
 * Worth knowing when testing: posthog-js filters bot user agents by default
 * (`opt_out_useragent_filter`), and a headless browser's default UA contains
 * "HeadlessChrome", so capture() silently no-ops under automation. Drive it
 * with a real Chrome UA or every event will look like it vanished.
 */
export function capture(event: string, properties?: Record<string, unknown>): void {
  const status = consentStatus();

  if (status === 'denied') return;

  /*
   * Not yet answered - HOLD IT, do not drop it.
   *
   * This is the whole reason this queue exists, and skipping it would
   * reintroduce the exact bug described at the top of this file, except
   * worldwide. posthog.capture() silently discards anything sent before init,
   * and consent resolution costs a round trip to /api/geo, which is always
   * slower than a component mounting. So a plain `if (!granted) return` would
   * drop the first pageview and every product_viewed for EVERY visitor in EVERY
   * region - including the ungated ones who are granted a few hundred
   * milliseconds later and never see a banner at all.
   */
  if (status !== 'granted') {
    if (pendingCaptures.length < MAX_PENDING_CAPTURES) {
      pendingCaptures.push({ event, properties, timestamp: new Date() });
    }
    return;
  }

  initPostHog();
  posthog.capture(event, properties);
}

/*
 * Bounded because 'pending' can last as long as a visitor ignores the banner,
 * which is indefinitely. Fifty events is far more than the handful the funnel
 * produces before anyone can click, and it stops a long browse against an
 * unanswered banner from growing an array without limit.
 */
const MAX_PENDING_CAPTURES = 50;

interface PendingCapture {
  event: string;
  properties?: Record<string, unknown>;
  timestamp: Date;
}

const pendingCaptures: PendingCapture[] = [];

/**
 * Consent resolved. Send what happened while we were waiting, or bin it.
 *
 * The original timestamps are replayed rather than letting PostHog stamp them
 * on arrival. A product_viewed that happened 900ms before the visitor clicked
 * Accept belongs at the moment it happened; bunching a whole browse onto the
 * instant of the consent click would make every funnel duration read as zero.
 *
 * This works because providers.tsx passes $current_url explicitly instead of
 * letting posthog-js read location at send time - a decision made for an
 * unrelated reason, without which a deferred pageview would be attributed to
 * whatever page the visitor happened to be on when they accepted.
 */
function onConsentResolved(): void {
  const status = consentStatus();
  if (status === 'denied') {
    pendingCaptures.length = 0;
    return;
  }
  if (status !== 'granted') return;

  initPostHog();

  /*
   * Undo a previous WITHDRAWAL, or this whole path is dead.
   *
   * withdrawPostHog() calls opt_out_capturing(), which persists in
   * localStorage as __ph_opt_in_out_<token> and outlives the page. So without
   * this, anyone who ever declined and later changed their mind through the
   * footer would be shown a banner, click Accept, see the banner disappear -
   * and still have every event silently dropped, forever. The UI would say
   * tracking was on while posthog quietly ignored it.
   *
   * Guarded on production because in development the opt-out is DELIBERATE and
   * belongs to a different mechanism entirely: the `loaded` callback in
   * initPostHog opts out unless NEXT_PUBLIC_POSTHOG_DEBUG=1, precisely so dev
   * traffic stays out of the production project. Opting back in here
   * unconditionally would defeat that and start sending local events.
   *
   * NODE_ENV is inlined at build time, so this compiles away in dev.
   */
  if (process.env.NODE_ENV === 'production' && posthog.has_opted_out_capturing()) {
    posthog.opt_in_capturing();
  }

  // Splice rather than iterate-then-clear: a capture during the flush must not
  // be replayed twice or lost.
  const queued = pendingCaptures.splice(0, pendingCaptures.length);
  for (const item of queued) {
    posthog.capture(item.event, item.properties, { timestamp: item.timestamp });
  }
}

/*
 * Subscribed at module scope, deliberately.
 *
 * The alternative is wiring it up in an effect in Providers, which would put
 * the flush behind exactly the mount-ordering problem this file exists to be
 * immune to. This module is the one owner of the posthog instance; it watches
 * consent itself.
 */
if (typeof window !== 'undefined') subscribeConsent(onConsentResolved);

/**
 * Attach the anonymous visitor to a person, keyed on their email address.
 *
 * `person_profiles: 'identified_only'` means no profile exists until this is
 * called, and PostHog stitches the visitor's earlier anonymous events onto the
 * profile retroactively - so a signup at the end of a session brings the whole
 * browse with it.
 *
 * TWO THINGS TO KNOW BEFORE ADDING A CALLER.
 *
 * 1. `sanitize_properties` above scrubs `token=`, NOT email addresses. After
 *    this, PostHog holds real customer email addresses in the clear. That is
 *    the intent - it is what makes the funnel joinable to an order - but it
 *    raises the stakes on the consent gate rather than being free.
 *
 * 2. identify() binds every SUBSEQUENT event on this browser to this person
 *    until reset(). CheckoutClient deliberately clears the stored shipping
 *    details on submit because a browser is something a household shares; this
 *    cuts the other way. It is an accepted trade, not an oversight - and it is
 *    why withdrawal calls reset().
 */
export function identifyPerson(email: string, properties?: Record<string, unknown>): void {
  if (typeof window === 'undefined') return;
  if (consentStatus() !== 'granted') return;
  initPostHog();
  if (!posthog.__loaded) return;
  // Lowercased so the same person from two forms is one profile, not two.
  posthog.identify(email.trim().toLowerCase(), properties);
}

/**
 * Withdrawal, for a visitor who accepted and has now changed their mind.
 *
 * This is the one case where opt_out_capturing() is the right tool rather than
 * the shortcut warned about in initPostHog: posthog is already loaded here, so
 * there is no "don't start it" option left - the recorder is running and has to
 * be told to stop.
 *
 * Order matters. Stop the recorder first, or a fragment of the session between
 * the opt-out and the reset can still be flushed. reset() last, so the person
 * profile is detached and the next visitor on a shared browser does not
 * continue this one's identity.
 */
export function withdrawPostHog(): void {
  pendingCaptures.length = 0;
  if (!posthog.__loaded) return;
  try {
    posthog.stopSessionRecording();
    posthog.opt_out_capturing();
    posthog.reset();
  } catch {
    // Nothing useful to do, and throwing here would break the banner's own
    // click handler - leaving the UI claiming tracking is still on.
  }
}
