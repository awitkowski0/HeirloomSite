/**
 * The Turnstile `action` for the checkout widget, shared by both halves.
 *
 * Its own module because src/lib/turnstile.ts is `server-only` - importing the
 * constant from there would pull the secret-handling code into the client
 * bundle, which is exactly what `server-only` exists to prevent.
 */
export const TURNSTILE_ACTION = 'checkout';
