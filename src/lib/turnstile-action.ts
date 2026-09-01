/**
 * The Turnstile `action` for each protected surface, shared by both halves.
 *
 * Its own module because src/lib/turnstile.ts is `server-only` - importing
 * these from there would pull the secret-handling code into the client bundle,
 * which is exactly what `server-only` exists to prevent.
 *
 * ONE ACTION PER SURFACE, and this is load-bearing rather than tidiness. A
 * token is minted by the site key, which is public and identical everywhere, so
 * without an action assertion a token solved on the low-friction newsletter
 * popup would be a perfectly valid token for /api/quotes - and the popup is by
 * design the easier of the two to automate against. The action is what stops a
 * token being moved between endpoints.
 *
 * Adding a third protected endpoint means adding a third action here, not
 * borrowing one of these.
 */
export const TURNSTILE_ACTIONS = {
  /** POST /api/quotes - creates Stripe objects and sends mail. */
  checkout: 'checkout',
  /** POST /api/subscribe - writes an address into a marketing audience. */
  subscribe: 'subscribe',
} as const;

export type TurnstileAction = (typeof TURNSTILE_ACTIONS)[keyof typeof TURNSTILE_ACTIONS];
