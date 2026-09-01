'use client';

import { Suspense, useEffect, useRef, type ReactNode } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import posthog from 'posthog-js';
import { PostHogProvider } from '@posthog/react';
import { CartProvider } from '@/context/CartContext';
import { initPostHog, capture } from '@/lib/posthog-client';
import { resolveConsent } from '@/lib/consent';
import ConsentBanner from '@/components/consent/ConsentBanner';
import { metaTrack } from '@/lib/meta-pixel';
import EmailCapturePopup from '@/components/marketing/EmailCapturePopup';

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

  /*
   * The FIRST pageview belongs to the Meta pixel's own bootstrap, not to this
   * effect.
   *
   * loadMetaPixel() sends `PageView` as part of fbq('init', ...), which is what
   * Meta's install expects and is also the only way the view is recorded when
   * consent is granted mid-visit. Letting this effect fire on its first run as
   * well would report every landing page twice for any visitor whose consent
   * was already stored - which is most returning visitors.
   *
   * PostHog does not have this problem: its $pageview is manual on both sides,
   * so it is captured here and only here.
   */
  const metaPageViewSent = useRef(false);

  useEffect(() => {
    if (!pathname) return;
    const qs = searchParams?.toString();
    capture('$pageview', {
      $current_url: window.origin + pathname + (qs ? `?${qs}` : ''),
    });

    // App Router navigates client-side, so nothing reloads the pixel: every
    // route change after the first has to be reported by hand.
    if (metaPageViewSent.current) metaTrack('PageView');
    metaPageViewSent.current = true;
  }, [pathname, searchParams]);

  return null;
}

export function Providers({ children }: { children: ReactNode }) {
  useEffect(() => {
    /*
     * Consent first, and note that initPostHog is now a no-op until it
     * resolves. It is still called: resolveConsent settles synchronously for a
     * returning visitor whose decision is already in localStorage, and for a
     * visitor from an ungated region it settles to 'granted' a moment later and
     * posthog-client's own subscription initialises then. Captures made in the
     * gap are queued rather than dropped.
     */
    void resolveConsent();
    initPostHog();
  }, []);

  return (
    <PostHogProvider client={posthog}>
      <Suspense fallback={null}>
        <PostHogPageView />
      </Suspense>
      <CartProvider>{children}</CartProvider>
      {/*
        Outside CartProvider and outside the <Suspense> boundary above. That
        boundary exists solely to isolate useSearchParams so it cannot opt the
        whole app out of static prerendering; putting unrelated UI inside it
        would suspend this on navigation for no reason.
      */}
      <ConsentBanner />
      <EmailCapturePopup />
    </PostHogProvider>
  );
}
