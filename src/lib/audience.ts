import 'server-only';

/**
 * The marketing list, over plain fetch.
 *
 * No SDK, matching src/lib/email.ts and src/lib/turnstile.ts for the same
 * reason: this is one POST with a bearer token and a JSON body, and the runtime
 * dependency list is nine packages precisely because things like this do not
 * get one added for them.
 *
 * Its own module rather than a function in email.ts, even though both talk to
 * Resend with the same key. Audiences and Emails are different products with
 * different failure semantics, and the difference is the whole point:
 *
 *   email.ts       NEVER throws. By the time it runs the quote is already a
 *                  draft invoice in Stripe, so a failed send loses nothing that
 *                  matters and failing the request would tell a customer their
 *                  order failed when it did not.
 *
 *   this module    THROWS, and the route turns that into a 502. Nothing here is
 *                  durable until Resend accepts the contact - there is no
 *                  Stripe object holding the address, no draft anything. Fail
 *                  soft and the address is gone, while the visitor has been
 *                  told they subscribed and is waiting for an email that can
 *                  never arrive.
 */

const API_BASE = 'https://api.resend.com/audiences';

export class AudienceNotConfiguredError extends Error {
  readonly status = 503;
  constructor() {
    super('The mailing list is not set up yet. Please try again later.');
    this.name = 'AudienceNotConfiguredError';
  }
}

export class AudienceError extends Error {
  readonly status = 502;
  constructor(message = 'We could not sign you up just now. Please try again.') {
    super(message);
    this.name = 'AudienceError';
  }
}

function config(): { key: string; audienceId: string } {
  const key = process.env.RESEND_API_KEY;
  const audienceId = process.env.RESEND_AUDIENCE_ID;
  if (!key || !audienceId) throw new AudienceNotConfiguredError();
  return { key, audienceId };
}

/**
 * Add someone to the list.
 *
 * A DUPLICATE IS A SUCCESS. Resend answers a contact that already exists with a
 * non-2xx, and surfacing that would tell a returning subscriber that signing up
 * failed - so they try again, get the same error, and conclude the site is
 * broken when in fact they are already on the list. The only honest outcome for
 * "you are subscribed" is success.
 */
export async function addToAudience(email: string): Promise<void> {
  const { key, audienceId } = config();

  let res: Response;
  try {
    res = await fetch(`${API_BASE}/${audienceId}/contacts`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${key}`,
        'content-type': 'application/json',
      },
      // Lowercased so the same person signing up twice is one contact.
      body: JSON.stringify({ email: email.trim().toLowerCase(), unsubscribed: false }),
      // Resend being slow must not hang the request behind a popup.
      signal: AbortSignal.timeout(5000),
    });
  } catch (err) {
    console.error('Resend audience unreachable:', err);
    throw new AudienceError();
  }

  if (res.ok) return;

  const detail = await res.text().catch(() => '');
  if (res.status === 409 || /already exists/i.test(detail)) {
    console.info('Audience signup for an address already on the list.');
    return;
  }

  /*
   * Logged with the status but WITHOUT the address. This runs on a public
   * endpoint anyone can post to, so the log would otherwise become a
   * transcript of every address typed into the popup - including the typos and
   * whatever a bot decided to send.
   */
  console.error(`Resend audience rejected a contact: ${res.status} ${detail.slice(0, 200)}`);
  throw new AudienceError();
}
