'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { usePathname } from 'next/navigation';
import Modal, { anyModalOpen } from '@/components/ui/Modal';
import TurnstileWidget, {
  type TurnstileHandle,
  type TurnstileStatus,
} from '@/components/checkout/TurnstileWidget';
import { TURNSTILE_ACTIONS } from '@/lib/turnstile-action';
import {
  getConsentServerSnapshot,
  getConsentSnapshot,
  subscribeConsent,
} from '@/lib/consent';
import {
  emailPopupDismissed,
  emailPopupShown,
  emailSubscribed,
  emailSubscribeFailed,
  type SubscribeTrigger,
} from '@/lib/analytics';
import { markSubscribePrompt, subscribePromptSettled } from './subscribeStorage';
import { newsletterCouponActive } from '@/lib/newsletter-promo';

/**
 * The email capture popup.
 *
 * WHAT IT PROMISES IS WHAT WE CAN DELIVER. Outside the current welcome-coupon
 * window (src/lib/newsletter-promo.ts), there is no discount code generated,
 * no code shown on success and no redemption field at checkout - offers are
 * sent by hand from the Resend audience. So the copy invites people onto a
 * list that gets exclusive offers; it does not say a code is on its way,
 * because nothing would send one.
 *
 * Inside the window, POST /api/subscribe actually emails a code (see
 * sendWelcomeCoupon in src/lib/email.ts) - the copy below says so ONLY while
 * newsletterCouponActive() is true, checked at render so it flips off on its
 * own once the coupon's cutoff passes, with no deploy required. The signup
 * itself keeps working either side of that date; only the incentive copy
 * changes.
 *
 * It works for a visitor who DECLINED tracking, deliberately. Subscribing is a
 * first-party transaction they initiated rather than something done to them, so
 * it does not depend on analytics consent - the address goes to a Resend
 * audience server-side either way, and only the analytics half is skipped.
 */

/** 15 seconds. Long enough to have looked at something, short enough to still be here. */
const TIMER_MS = 15_000;

export default function EmailCapturePopup() {
  const pathname = usePathname();
  const consent = useSyncExternalStore(
    subscribeConsent,
    getConsentSnapshot,
    getConsentServerSnapshot
  );

  const [trigger, setTrigger] = useState<SubscribeTrigger | null>(null);
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'done'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState('');
  const [turnstileStatus, setTurnstileStatus] = useState<TurnstileStatus>('pending');
  /*
   * Has the visitor actually engaged with this popup?
   *
   * Gates the Turnstile widget, which loads a script from
   * challenges.cloudflare.com. This popup appears UNINVITED - on a timer or an
   * exit gesture - so mounting the widget with it would mean an unsolicited
   * third-party request for every visitor who ignores the thing, including one
   * who has just declined tracking. Waiting for a keystroke means the request
   * only happens for somebody who has chosen to sign up, which is the point at
   * which bot protection is a necessary part of what they asked for.
   *
   * Cost is nil in practice: Turnstile solves while the address is still being
   * typed, and the button is disabled until it has.
   */
  const [engaged, setEngaged] = useState(false);
  const shownAt = useRef(0);
  /* Turnstile tokens are single-use; see the note on TurnstileHandle. Without
     resetting on failure, a retry resends the same dead token and every
     subsequent attempt fails with the same unrecoverable "Verification
     failed" message - see CheckoutClient.tsx for the same pattern. */
  const turnstileRef = useRef<TurnstileHandle>(null);

  /*
   * SUPPRESSION, in one place so the rules can be read together.
   *
   * 1. Consent must be RESOLVED. The banner and this popup must never be on
   *    screen at once: this would cover the banner and make the consent choice
   *    physically unreachable, which is itself the compliance failure the
   *    banner exists to avoid. 'unknown' and 'pending' both mean wait.
   * 2. Not on /checkout. A modal over the shipping form would cover the
   *    Turnstile widget and the submit button, on the one page where a
   *    conversion is actually in progress.
   * 3. Not if this browser has already dismissed or subscribed.
   */
  const eligible =
    (consent === 'granted' || consent === 'denied') &&
    pathname !== '/checkout' &&
    !subscribePromptSettled();

  const open = trigger !== null;

  const show = useCallback((next: SubscribeTrigger) => {
    /*
     * Rule 5, checked at the instant of firing rather than in `eligible`:
     * never stack on top of another dialog. CartPopup uses the same Modal, and
     * two open at once means two focus traps fighting over the same page.
     * Not retried - if someone is in the cart popup at second 15, they are
     * doing something more valuable than reading this.
     */
    if (anyModalOpen()) return;
    shownAt.current = Date.now();
    setTrigger(next);
    emailPopupShown({ trigger: next });
  }, []);

  useEffect(() => {
    if (!eligible || open) return;

    /*
     * The timer starts when consent RESOLVES, not on mount - this effect
     * depends on `eligible`, which is false until then. Without that, the
     * popup would slam in the instant the banner closed for anyone who took
     * more than fifteen seconds to answer it.
     */
    const timer = setTimeout(() => show('timer'), TIMER_MS);

    // Exit intent: the cursor leaving through the TOP of the viewport, toward
    // the tab bar and the close button. Desktop only - there is no such gesture
    // on touch, which is why the timer above is the mobile path.
    const onMouseOut = (e: MouseEvent) => {
      if (e.clientY <= 0 && !e.relatedTarget) show('exit_intent');
    };
    document.addEventListener('mouseout', onMouseOut);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mouseout', onMouseOut);
    };
  }, [eligible, open, show]);

  const close = useCallback(() => {
    if (!trigger) return;
    if (status === 'done') {
      setTrigger(null);
      return;
    }
    emailPopupDismissed({
      trigger,
      seconds_visible: Math.round((Date.now() - shownAt.current) / 1000),
    });
    markSubscribePrompt('dismissed');
    setTrigger(null);
  }, [trigger, status]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status === 'sending' || !trigger) return;
    setStatus('sending');
    setError(null);

    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, turnstileToken, source: 'popup' }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? 'Something went wrong. Please try again.');
        setStatus('idle');
        // The token is spent whatever went wrong, since verifyTurnstile runs
        // first server-side - a retry without this resends the dead token.
        turnstileRef.current?.reset();
        emailSubscribeFailed({ reason: data.error ?? 'unknown', status: res.status });
        return;
      }
      /*
       * Marked BEFORE the analytics call. The subscription is the thing that
       * actually happened and the visitor must never be asked again, whether or
       * not anything downstream of this succeeds.
       */
      markSubscribePrompt('subscribed');
      setStatus('done');
      emailSubscribed({ email, source: 'popup', trigger });
    } catch {
      setError('Something went wrong. Please try again.');
      setStatus('idle');
      turnstileRef.current?.reset();
      emailSubscribeFailed({ reason: 'network' });
    }
  }

  if (!open) return null;

  const blocked = engaged && turnstileStatus === 'error';
  /*
   * Not solved yet. Only meaningful once the widget is mounted AND configured -
   * status is 'disabled' when there is no site key, and gating on that would
   * make the form permanently unsubmittable on a deployment without Turnstile.
   */
  const awaitingToken = engaged && turnstileStatus === 'pending';
  // Checked at render, not stored in state: it must flip off on its own the
  // instant the cutoff passes, with no deploy and no stale value from when
  // the popup happened to mount.
  const couponActive = newsletterCouponActive();

  return (
    <Modal
      open
      onClose={close}
      title="Join our list"
      overlayClassName="cart-popup-overlay"
      className="cart-popup-content email-popup"
    >
      {status === 'done' ? (
        <>
          <h3 className="headline-md email-popup-title">You&rsquo;re on the list</h3>
          <p className="email-popup-text">
            {couponActive
              ? "Thank you. We've emailed you a welcome discount code, plus first look at new pieces going forward."
              : 'Thank you. Exclusive offers and first look at new pieces will come straight to your inbox.'}
          </p>
          <button type="button" className="button-primary email-popup-submit" onClick={close}>
            Continue browsing
          </button>
        </>
      ) : (
        <>
          <h3 className="headline-md email-popup-title">
            {couponActive ? 'A welcome gift' : 'Exclusive offers'}
          </h3>
          <p className="email-popup-text">
            {couponActive
              ? "Sign up and we'll email you a welcome discount code today, good through October 31, plus first look at new pieces. No more than a few emails a year, and you can leave whenever you like."
              : 'Join our list for subscriber-only discounts and first look at new pieces. No more than a few emails a year, and you can leave whenever you like.'}
          </p>
          <form onSubmit={onSubmit} className="email-popup-form">
            <label htmlFor="email-popup-input" className="visually-hidden">
              Email address
            </label>
            <input
              id="email-popup-input"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={e => {
                setEmail(e.target.value);
                setEngaged(true);
              }}
              onFocus={() => setEngaged(true)}
              placeholder="you@example.com"
              className="email-popup-input"
              disabled={status === 'sending'}
            />
            {/*
              interaction-only, so Cloudflare renders nothing unless it actually
              wants a challenge. A visible box inside a popup asking for one
              field is friction the checkout can afford and this cannot.
            */}
            {engaged && (
              <TurnstileWidget
                ref={turnstileRef}
                onToken={setTurnstileToken}
                onStatus={setTurnstileStatus}
                action={TURNSTILE_ACTIONS.subscribe}
                appearance="interaction-only"
              />
            )}
            {error && (
              <p className="email-popup-error" role="alert">
                {error}
              </p>
            )}
            {blocked && (
              <p className="email-popup-error" role="alert">
                We couldn&rsquo;t load the browser check. Please disable your ad blocker for this
                site to sign up.
              </p>
            )}
            <button
              type="submit"
              className="button-primary email-popup-submit"
              disabled={status === 'sending' || blocked || awaitingToken}
            >
              {status === 'sending' ? 'Signing up…' : 'Sign me up'}
            </button>
          </form>
          <button type="button" className="email-popup-dismiss" onClick={close}>
            No thanks
          </button>
        </>
      )}
    </Modal>
  );
}
