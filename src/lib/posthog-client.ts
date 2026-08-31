'use client';

import posthog from 'posthog-js';

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
 */
export function initPostHog(): void {
  if (typeof window === 'undefined') return;
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key || posthog.__loaded) return;

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
     * Session recording off, explicitly.
     *
     * Leaving it unset does not mean off: it is decided by the PostHog PROJECT
     * setting, so anyone with dashboard access could start recording the
     * checkout form - which is nothing but name, email and street address, all
     * of it ordinary DOM - without any code change or review. Stating it here
     * means turning it on requires a commit.
     */
    disable_session_recording: true,

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
  initPostHog();
  posthog.capture(event, properties);
}
