'use client';

import { useSyncExternalStore } from 'react';
import Link from 'next/link';
import {
  consentCountry,
  consentWasPrompted,
  denyConsent,
  getConsentServerSnapshot,
  getConsentSnapshot,
  grantConsent,
  subscribeConsent,
} from '@/lib/consent';
import { consentGranted } from '@/lib/analytics';
import { withdrawPostHog } from '@/lib/posthog-client';
import { withdrawMetaPixel } from '@/lib/meta-pixel';

/**
 * The consent banner. Shown only to visitors we have to ask.
 *
 * A BAR, NOT A MODAL, and not built on ui/Modal. A dialog would trap focus and
 * lock scrolling for a visitor who has not asked for anything, on every page,
 * and the cookie-wall pattern that produces is exactly what regulators have
 * spent years objecting to. The site stays fully usable while this is up.
 *
 * Accept and Decline are the same size, the same shape and equally prominent,
 * for the same reason: a decline that is visibly harder to click is not a free
 * choice, and dark-patterned consent is invalid consent - so the banner would
 * be doing nothing except adding a click.
 *
 * There is no "manage preferences" step because there is nothing to manage:
 * PostHog and the Meta Pixel go on together or not at all. A category
 * breakdown that always toggles as one is theatre.
 */
export default function ConsentBanner() {
  const status = useSyncExternalStore(
    subscribeConsent,
    getConsentSnapshot,
    getConsentServerSnapshot
  );

  /*
   * No `mounted` flag, and no effect to set one.
   *
   * useSyncExternalStore already provides the guarantee one would be for:
   * React renders getConsentServerSnapshot() - always 'unknown' - on the server
   * AND for the hydrating client render, then re-renders with the live value.
   * So the banner cannot appear in prerendered HTML and cannot mismatch on
   * hydration. It also cannot flash for an ungated visitor, because 'unknown'
   * is not 'pending' and the status only becomes 'pending' once /api/geo has
   * actually said this visitor must be asked.
   *
   * The obvious alternative - a useState + useEffect pair - is a
   * react-hooks/set-state-in-effect lint error here, for the same reason the
   * cart reads its `hydrated` flag from its store rather than from an effect.
   */
  if (status !== 'pending') return null;

  return (
    <div className="consent-banner" role="region" aria-label="Cookie consent">
      <div className="consent-banner-inner">
        <p className="consent-banner-text">
          We use analytics and advertising cookies to see how the site is used and to measure our
          ads. Decline and the site works exactly the same — we just learn nothing about your
          visit.{' '}
          <Link href="/privacy" className="consent-banner-link">
            What we collect
          </Link>
        </p>
        <div className="consent-banner-actions">
          <button
            type="button"
            className="button-secondary consent-banner-button"
            onClick={() => {
              /*
               * Withdrawal, not just a flag flip. Someone reaching this banner
               * through the footer link may have accepted previously, in which
               * case posthog is loaded and recording right now and has to be
               * told to stop, and the advertising cookies have to be cleared.
               * Both withdrawals no-op when nothing was ever loaded, which is
               * the common case here.
               *
               * Withdrawal runs BEFORE denyConsent() on purpose: denyConsent
               * flips the status, and both withdrawal functions are written to
               * act on a live tracker. Ordering them the other way would leave
               * the recorder running and the cookies in place.
               */
              withdrawPostHog();
              withdrawMetaPixel();
              denyConsent();
            }}
          >
            Decline
          </button>
          <button
            type="button"
            className="button-primary consent-banner-button"
            onClick={() => {
              /*
               * Grant BEFORE capturing, so the event goes out live rather than
               * into the pre-consent queue to be flushed a tick later. Reading
               * `prompted` first is not optional either - grantConsent does not
               * change it today, but the read is cheap and the alternative is a
               * silent dependency on that staying true.
               */
              const country = consentCountry();
              const prompted = consentWasPrompted();
              grantConsent();
              consentGranted({ country, prompted });
            }}
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
