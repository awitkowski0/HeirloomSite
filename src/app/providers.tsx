'use client';

import { Suspense, useEffect, type ReactNode } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import posthog from 'posthog-js';
import { PostHogProvider } from 'posthog-js/react';
import { CartProvider } from '@/context/CartContext';

/**
 * Idempotent PostHog init.
 *
 * Called from both the provider and the pageview tracker rather than from the
 * provider alone, because React runs child effects BEFORE parent effects: the
 * tracker's effect fires first, and when it merely checked `posthog.__loaded`
 * it found `false`, returned, and never re-ran (its deps only change on
 * navigation). The result was that the first pageview of every visit - the one
 * carrying the entry URL and referrer - was silently dropped, and only
 * subsequent client-side navigations were recorded.
 */
function initPostHog() {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key || posthog.__loaded) return;
  posthog.init(key, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
      person_profiles: 'identified_only',
      // App Router handles navigation client-side; we capture pageviews
      // explicitly in PostHogPageView instead.
      capture_pageview: false,
      // From PR #77 on dev: surface client-side crashes in PostHog. Console
      // errors stay off - they are dominated by third-party script noise.
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
 * PostHog pageview tracking.
 *
 * MUST stay inside <Suspense>. useSearchParams() in an unsuspended component
 * opts every route out of static prerendering, which would silently undo the
 * entire point of this migration - the build would still succeed, it would just
 * mark every page as dynamic and serve Googlebot a spinner again.
 */
function PostHogPageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!pathname) return;
    initPostHog();
    if (!posthog.__loaded) return;
    const qs = searchParams?.toString();
    posthog.capture('$pageview', {
      $current_url: window.origin + pathname + (qs ? `?${qs}` : ''),
    });
  }, [pathname, searchParams]);

  return null;
}

export function Providers({ children }: { children: ReactNode }) {
  useEffect(() => {
    initPostHog();
  }, []);

  return (
    <PostHogProvider client={posthog}>
      <Suspense fallback={null}>
        <PostHogPageView />
      </Suspense>
      <CartProvider>{children}</CartProvider>
    </PostHogProvider>
  );
}
