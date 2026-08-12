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
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
    person_profiles: 'identified_only',
    // App Router navigates client-side; pageviews are captured explicitly.
    capture_pageview: false,
    // Surface client-side crashes. Console errors stay off - they are
    // dominated by third-party script noise.
    capture_exceptions: {
      capture_unhandled_errors: true,
      capture_unhandled_rejections: true,
      capture_console_errors: false,
    },
    loaded: ph => {
      // Do not pollute production analytics with local development traffic.
      if (process.env.NODE_ENV !== 'production') ph.opt_out_capturing();
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
