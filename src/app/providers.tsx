'use client';

import { Suspense, useEffect, type ReactNode } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import posthog from 'posthog-js';
import { PostHogProvider } from '@posthog/react';
import { CartProvider } from '@/context/CartContext';
import { initPostHog, capture } from '@/lib/posthog-client';

/**
 * PostHog pageview tracking.
 *
 * MUST stay inside <Suspense>. useSearchParams() in an unsuspended component
 * opts every route out of static prerendering, which would silently undo the
 * entire point of this migration - the build would still succeed, it would just
 * mark every page as dynamic and serve Googlebot a spinner again.
 *
 * capture() initialises PostHog itself, so this no longer depends on the
 * provider's effect having run first. React fires child effects before parent
 * effects, and the earlier version tested posthog.__loaded, found it false,
 * returned, and never re-ran - dropping the first pageview of every visit.
 */
function PostHogPageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!pathname) return;
    const qs = searchParams?.toString();
    capture('$pageview', {
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
