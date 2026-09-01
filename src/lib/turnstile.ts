import 'server-only';

/**
 * Cloudflare Turnstile verification for the quote endpoint.
 *
 * POST /api/quotes is anonymous, unauthenticated and unthrottled, and it
 * creates a Stripe Customer and a draft invoice on demand AND sends email from
 * our verified domain to an address the caller supplies. Unprotected, that is
 * an email-bombing amplifier: it burns the sending domain's reputation and
 * fills the shop's own inbox, and it litters the Stripe account with junk
 * customers that poison the find-by-email reuse the invoicing flow depends on.
 *
 * POST /api/subscribe is guarded for the same reason in a different currency:
 * it writes a caller-supplied address into a marketing audience, so unprotected
 * it pollutes the list with addresses nobody owns - and the complaints land on
 * the reputation of the same sending domain the order mail goes out on.
 *
 * siteverify is called from here and only from here. It takes the secret key,
 * so a browser can never be trusted to make this call.
 *
 * Inert until TURNSTILE_SECRET_KEY is set, so a deployment without Cloudflare
 * keeps working. Once set it fails CLOSED: a missing, invalid, replayed or
 * mismatched token is rejected rather than waved through.
 */

import type { TurnstileAction } from './turnstile-action';

const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

/**
 * The widget `action`s, asserted on both ends. Defined in their own non-
 * server-only module so the client half can import them without dragging this
 * file - and the secret handling in it - into the browser bundle.
 */
export { TURNSTILE_ACTIONS, type TurnstileAction } from './turnstile-action';

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

/**
 * Hostnames a token may legitimately come from.
 *
 * Derived from configuration rather than hardcoded: the production domain is
 * not known to this repo, and a stale literal here would reject every real
 * customer. Mirrors the SITE_URL derivation in src/lib/seo.ts.
 *
 * Preview deployments need their own entries. NODE_ENV is 'production' on a
 * Vercel preview, so the localhost branch below does not apply, and the host is
 * a generated *.vercel.app name that matches neither NEXT_PUBLIC_SITE_URL nor
 * VERCEL_PROJECT_PRODUCTION_URL. Without VERCEL_BRANCH_URL / VERCEL_URL every
 * preview 403s on submit - which is precisely where checkout most needs testing
 * before launch. The Turnstile widget must also list the preview domain, or
 * Cloudflare refuses to render at all and the button never enables.
 */
function allowedHostnames(): Set<string> {
  const hosts = new Set<string>();

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (siteUrl) {
    try {
      hosts.add(new URL(siteUrl).hostname);
    } catch {
      // A malformed SITE_URL is a config error elsewhere; do not fail here.
    }
  }

  for (const key of [
    'VERCEL_PROJECT_PRODUCTION_URL',
    'VERCEL_BRANCH_URL',
    'VERCEL_URL',
  ] as const) {
    const host = process.env[key];
    if (host) hosts.add(host);
  }

  if (process.env.NODE_ENV !== 'production') {
    hosts.add('localhost');
    hosts.add('127.0.0.1');
  }

  return hosts;
}

interface SiteverifyOutcome {
  success?: boolean;
  action?: string;
  hostname?: string;
  'error-codes'?: string[];
  metadata?: { result_with_testing_key?: boolean };
}

/**
 * Cloudflare's published always-pass / always-block key pairs, used in local
 * development so the full path runs in dev exactly as it does in production.
 *
 * They need their own branch because siteverify answers them differently from
 * a real key: `action` is absent entirely and `hostname` is the literal
 * "example.com". Both assertions below would therefore reject every request,
 * which is worse than not having them - it would make the checkout untestable
 * locally and send whoever hit it hunting for a bug that is not there.
 *
 * Trusting this flag is not a hole. It is echoed by Cloudflare over TLS in
 * response to OUR secret, and a real secret never produces it - the only way
 * to see it is to have configured a testing secret, which is a misconfiguration
 * rather than an attack, and one that shouts on the line below.
 */
let warnedTestingKey = false;

/**
 * Half-configured is the dangerous state.
 *
 * With a site key but no secret, the widget renders, the customer solves it,
 * and nothing on the server checks the result - the protection looks present
 * in the UI and does not exist. That is worse than no widget at all, because
 * it reads as done. Warned once per process rather than per request.
 */
let warnedHalfConfigured = false;

/**
 * @param expectedAction which surface this token must have been minted for.
 *   Required rather than defaulted: a default would silently accept a
 *   newsletter token at checkout the first time somebody forgot to pass it.
 */
export async function verifyTurnstile(
  token: unknown,
  ip: string | null,
  expectedAction: TurnstileAction
): Promise<void> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    if (process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && !warnedHalfConfigured) {
      warnedHalfConfigured = true;
      console.error(
        'Turnstile is HALF-CONFIGURED: NEXT_PUBLIC_TURNSTILE_SITE_KEY is set but ' +
          'TURNSTILE_SECRET_KEY is not. The widget renders and is never verified, ' +
          'so /api/quotes has no bot protection.'
      );
    }
    return;
  }

  if (typeof token !== 'string' || token === '') throw new TurnstileError();

  const body = new URLSearchParams({ secret, response: token });
  if (ip) body.set('remoteip', ip);

  let outcome: SiteverifyOutcome;
  try {
    const res = await fetch(VERIFY_URL, {
      method: 'POST',
      body,
      // Cloudflare being slow or unreachable must not hang a checkout request.
      signal: AbortSignal.timeout(5000),
    });
    outcome = (await res.json()) as SiteverifyOutcome;
  } catch (err) {
    // Fail closed. An outage here means we cannot tell a customer from a bot,
    // and the endpoint being protected creates charges.
    console.error('Turnstile verification unreachable:', err);
    throw new TurnstileError('Could not verify your browser. Please try again.');
  }

  // Turnstile is boolean - there is no reCAPTCHA-style score to threshold on.
  if (outcome.success !== true) {
    console.warn('Turnstile rejected a token:', outcome['error-codes']);
    throw new TurnstileError();
  }

  if (outcome.metadata?.result_with_testing_key === true) {
    if (!warnedTestingKey) {
      warnedTestingKey = true;
      const where =
        process.env.NODE_ENV === 'production'
          ? 'THIS IS A PRODUCTION BUILD: checkout has no bot protection at all. ' +
            'Set the real TURNSTILE_SECRET_KEY.'
          : 'Fine for local development.';
      console.warn(`Turnstile is using a Cloudflare TESTING key, which passes anything. ${where}`);
    }
    // The action and hostname assertions cannot be made against a testing key.
    return;
  }

  if (outcome.action !== expectedAction) {
    console.warn(`Turnstile action mismatch: expected ${expectedAction}, got ${outcome.action}`);
    throw new TurnstileError();
  }

  const allowed = allowedHostnames();
  // An empty allowlist means nothing is configured to compare against; failing
  // every request would be worse than the check being absent, so skip it and
  // say so rather than silently passing a check that never ran.
  if (allowed.size === 0) {
    console.warn(
      'Turnstile hostname check skipped: neither NEXT_PUBLIC_SITE_URL nor ' +
        'VERCEL_PROJECT_PRODUCTION_URL is set.'
    );
  } else if (!outcome.hostname || !allowed.has(outcome.hostname)) {
    console.warn(`Turnstile hostname not allowed: ${outcome.hostname}`);
    throw new TurnstileError();
  }
}
