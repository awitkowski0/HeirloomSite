import { NextResponse } from 'next/server';
import { verifyTurnstile, TurnstileError, TURNSTILE_ACTIONS } from '@/lib/turnstile';
import { looksLikeEmail } from '@/lib/email';
import { addToAudience, AudienceError, AudienceNotConfiguredError } from '@/lib/audience';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Join the mailing list.
 *
 * Order of operations mirrors /api/quotes and is load-bearing for the same
 * reason: Turnstile runs FIRST, so every rejection happens before anything is
 * written anywhere. This endpoint is anonymous and unthrottled and it puts a
 * caller-supplied address into a marketing audience - unprotected it is a
 * list-pollution amplifier, and the complaints from strangers who never signed
 * up land on the reputation of the same domain the order confirmations go out
 * on.
 *
 * The address is stored server-side rather than only captured as an analytics
 * event, and that is the point rather than an implementation detail: a visitor
 * who DECLINED tracking can still subscribe. A subscription is a first-party
 * transaction they initiated, not tracking, so it must not depend on analytics
 * being allowed to run - and PostHog is not a mailing list in any case (no
 * sending, no unsubscribe handling, no deliverability).
 */
export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  try {
    await verifyTurnstile(
      body.turnstileToken,
      req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for'),
      TURNSTILE_ACTIONS.subscribe
    );
  } catch (err) {
    if (err instanceof TurnstileError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }

  if (!looksLikeEmail(body.email)) {
    return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
  }

  try {
    await addToAudience(body.email);
  } catch (err) {
    /*
     * Both of these are deliberately NOT soft failures - see the docblock in
     * src/lib/audience.ts. Nothing is durable until Resend accepts the contact,
     * so answering 200 here would drop the address on the floor while telling
     * the visitor they had subscribed.
     *
     * 503 (unconfigured) and 502 (Resend refused or unreachable) are kept apart
     * because one is a deployment somebody has to finish and the other is an
     * outage that will pass, and the popup says something different for each.
     */
    if (err instanceof AudienceNotConfiguredError || err instanceof AudienceError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }

  return NextResponse.json({ subscribed: true });
}
