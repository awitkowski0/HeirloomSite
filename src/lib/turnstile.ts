import 'server-only';

/**
 * Cloudflare Turnstile verification for the payment-intent endpoint.
 *
 * POST /api/stripe/create-payment-intent is anonymous, unauthenticated and
 * unthrottled, and it mints a real Stripe PaymentIntent on demand. That is the
 * standard shape for card-testing abuse - an attacker drives it in a loop and
 * validates stolen cards against the resulting client secrets - and it also
 * lets anyone set `receipt_email` to an address they do not own.
 *
 * Inert until TURNSTILE_SECRET_KEY is set, so a deployment without Cloudflare
 * keeps working. Once set it fails CLOSED: a missing or invalid token is
 * rejected rather than waved through.
 */

const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export function turnstileEnabled(): boolean {
  return Boolean(process.env.TURNSTILE_SECRET_KEY);
}

export class TurnstileError extends Error {
  readonly status = 403;
  constructor(message = 'Verification failed. Please try again.') {
    super(message);
    this.name = 'TurnstileError';
  }
}

export async function verifyTurnstile(token: unknown, ip: string | null): Promise<void> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return;

  if (typeof token !== 'string' || token === '') throw new TurnstileError();

  const body = new URLSearchParams({ secret, response: token });
  if (ip) body.set('remoteip', ip);

  let outcome: { success?: boolean; 'error-codes'?: string[] };
  try {
    const res = await fetch(VERIFY_URL, {
      method: 'POST',
      body,
      // Cloudflare being slow or unreachable must not hang a checkout request.
      signal: AbortSignal.timeout(5000),
    });
    outcome = await res.json();
  } catch (err) {
    // Fail closed. An outage here means we cannot tell a customer from a bot,
    // and the endpoint being protected creates charges.
    console.error('Turnstile verification unreachable:', err);
    throw new TurnstileError('Could not verify your browser. Please try again.');
  }

  if (!outcome.success) {
    console.warn('Turnstile rejected a request:', outcome['error-codes']);
    throw new TurnstileError();
  }
}
