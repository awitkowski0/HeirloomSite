'use client';

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import posthog from 'posthog-js';
import { initPostHog } from './posthog-client';
import { getConsentSnapshot, getConsentServerSnapshot, subscribeConsent } from './consent';

/**
 * PostHog-controlled DE-LISTING, which is not the same thing as hiding.
 *
 * A flag named `product-<slug>` set to false removes that product from
 * listings, grids, search results and recommendations, without a deploy.
 *
 * What it does NOT do, and must not be relied on to do:
 *
 *   /product/<slug>          still loads
 *   sitemap.xml              still lists it
 *   POST /api/quotes            still prices and invoices it
 *
 * The reason is structural rather than an oversight. Every content route here
 * is statically prerendered, which AGENTS.md calls the one thing this site
 * cannot trade away, and flags are evaluated in the browser after that HTML has
 * already been built and served. Evaluating them on the server would need
 * posthog-node and dynamic rendering, which is the trade being refused.
 *
 * When a product genuinely must not be sold, set `"hidden": true` in its
 * product.json. That drops it from pricing.json, and src/lib/pricing.ts
 * rejects any line missing from that table - so it cannot be bought even by
 * posting a hand-made cart at the API. This module cannot make that promise.
 *
 * Two consequences worth stating plainly:
 *
 * 1. A de-listed product is in the prerendered HTML and disappears when flags
 *    arrive, so it flashes. Unavoidable while the page is prerendered and the
 *    flag is read in the browser. It only affects de-listed products, which
 *    are by definition the few.
 *
 * 2. This fails OPEN. An unknown flag, a PostHog outage or a blocked script
 *    all leave `isFeatureEnabled` undefined, and undefined means visible. That
 *    is deliberate: failing closed would empty the catalogue the moment
 *    analytics broke, which is far worse than a de-listed product reappearing.
 *    It is also the second reason this is not a security control.
 *
 * 3. IT NOW HAS A THIRD CAUSE OF FAILING OPEN: consent. A visitor who declines
 *    tracking never loads posthog-js, so no flag ever arrives, `ready` stays
 *    false and NOTHING is de-listed for them - permanently, not just until the
 *    network catches up. Every de-listed product is fully visible to every
 *    visitor who said no.
 *
 *    This does not change the guidance, it sharpens it: `"hidden": true` is the
 *    only thing that makes a product unsellable, and the population this leaks
 *    to is no longer hypothetical.
 */

/** Flag name for a product. Kept in one place so the dashboard and the code agree. */
export function productFlagKey(slug: string): string {
  return `product-${slug}`;
}

export interface DelistedProducts {
  /** True once flags have arrived. Before that nothing is de-listed. */
  ready: boolean;
  isDelisted: (slug: string) => boolean;
}

export function useDelistedProducts(): DelistedProducts {
  const [ready, setReady] = useState(false);

  /*
   * Consent is a dependency of this effect, not just a guard inside it.
   *
   * initPostHog() is a no-op until consent is granted, and consent resolves
   * asynchronously (a fetch to /api/geo) - so on first mount this effect
   * essentially always finds posthog unloaded and bails. Without re-running
   * when the answer arrives, flags would never load for ANYONE, in any region,
   * and every de-listed product would silently come back.
   */
  const consent = useSyncExternalStore(
    subscribeConsent,
    getConsentSnapshot,
    getConsentServerSnapshot
  );

  useEffect(() => {
    if (consent !== 'granted') return;
    initPostHog();
    if (!posthog.__loaded) return;
    // Fires on load and again whenever flags are re-evaluated.
    return posthog.onFeatureFlags(() => setReady(true));
  }, [consent]);

  /*
   * Stable across renders, and that is load-bearing rather than tidiness.
   *
   * Callers list `isDelisted` in useMemo dependency arrays - src/lib/search.ts
   * twice and GalleryBrowser once. A fresh arrow function every render made
   * every one of those memos miss, so the MiniSearch result mapping re-ran on
   * each keystroke and the whole gallery re-filtered on every render. Keyed on
   * `ready` because that is the only thing that changes the answer.
   */
  const isDelisted = useCallback(
    (slug: string) => {
      if (!ready || !posthog.__loaded) return false;
      /*
       * Explicitly false, not falsy. `isFeatureEnabled` returns undefined for
       * a flag that does not exist, and treating that as "hidden" would hide
       * all 59 products on any deployment where nobody has created flags -
       * which is every deployment today.
       */
      return posthog.isFeatureEnabled(productFlagKey(slug)) === false;
    },
    [ready]
  );

  return { ready, isDelisted };
}
