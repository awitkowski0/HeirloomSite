/**
 * The current newsletter-signup incentive: a coupon code emailed to new
 * subscribers, offered only through its own cutoff date.
 *
 * Deliberately NOT `server-only`: the cutoff decides which copy
 * EmailCapturePopup.tsx (a client component) shows, and the code itself is
 * looked up fresh against Stripe by the server on every send anyway (see
 * src/lib/coupon.ts's lookupCouponTerms) - nothing here is a secret, and
 * nothing here is trusted as the coupon's actual terms.
 *
 * After the cutoff, the popup reverts to its original plain "exclusive
 * offers" copy and no code is emailed - the newsletter signup itself keeps
 * working, only the incentive goes away. Update both constants together for
 * the next promotion; there is no mechanism here for scheduling one in
 * advance.
 */
export const NEWSLETTER_COUPON_CODE = 'ZFWHE2W2';

/** Midnight ET, the morning after: the promo runs through end-of-day Oct 31. */
export const NEWSLETTER_COUPON_CUTOFF = new Date('2026-11-01T00:00:00-04:00');

export function newsletterCouponActive(): boolean {
  return Date.now() < NEWSLETTER_COUPON_CUTOFF.getTime();
}
