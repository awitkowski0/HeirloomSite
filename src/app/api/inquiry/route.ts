import { NextResponse } from 'next/server';
import {
  verifyTurnstile,
  TurnstileError,
  turnstileEnabled,
  TURNSTILE_ACTIONS,
} from '@/lib/turnstile';
import {
  looksLikeEmail,
  sendInquiryAck,
  sendInquiryAlert,
  type InquiryDetails,
} from '@/lib/email';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_NAME = 200;
const MAX_MESSAGE = 5000;
/** Phone / ZIP / style interest / timing - context, not payload. */
const MAX_CONTEXT_FIELD = 300;

/**
 * A contact inquiry.
 *
 * Replaces the `mailto:` hand-off that /contact used to perform client-side,
 * where nothing reached the server unless the visitor's own mail client opened
 * and they pressed send - so a failed or ignored hand-off was invisible, and
 * there was no auto-response to send because there was no submit to trigger
 * one. See the re-scope note in heirloom-cribs-google-optimization
 * `docs/customer-auto-response-basics-vercel-rescope.md`.
 *
 * Order of operations is the same load-bearing order as /api/quotes and
 * /api/subscribe: Turnstile FIRST, because this endpoint mails an address the
 * caller typed and an address on our own inbox - unprotected it is an
 * email-bombing amplifier aimed at both.
 *
 * The recipient is not a request field and never becomes one: the visitor's
 * message goes to SUPPORT_INBOX (src/lib/email.ts) and nowhere else, or the
 * endpoint is a relay instead of a contact form.
 *
 * Returns `{ ok: true, customerAckSent }` and never claims a send that did not
 * happen - the same contract /api/quotes answers with. If the shop alert
 * cannot be delivered nothing exists server-side at all (this endpoint stores
 * nothing), so that case is a 503 rather than a success: the client then keeps
 * its mailto fallback instead of showing a receipt for a message nobody has.
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
      TURNSTILE_ACTIONS.contact
    );
  } catch (err) {
    if (err instanceof TurnstileError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const email = body.email;
  const message = typeof body.message === 'string' ? body.message.trim() : '';

  if (!name) {
    return NextResponse.json({ error: 'Please add your name.' }, { status: 400 });
  }
  if (name.length > MAX_NAME) {
    return NextResponse.json({ error: 'Your name is too long.' }, { status: 400 });
  }
  if (!looksLikeEmail(email)) {
    // Microcopy bank, docs/customer-auto-response-basics.md ┬º8.
    return NextResponse.json(
      { error: 'Please add your email so we can reply.' },
      { status: 400 }
    );
  }
  if (!message) {
    return NextResponse.json(
      { error: 'Tell us a bit about what you need help with.' },
      { status: 400 }
    );
  }
  if (message.length > MAX_MESSAGE) {
    return NextResponse.json(
      { error: 'That message is too long. Please shorten it and send it again.' },
      { status: 400 }
    );
  }

  const context = (key: string): string | undefined => {
    const value = body[key];
    if (typeof value !== 'string') return undefined;
    const trimmed = value.trim().slice(0, MAX_CONTEXT_FIELD);
    return trimmed || undefined;
  };

  const inquiry: InquiryDetails = {
    name,
    email: email.trim(),
    message,
    phone: context('phone'),
    zip: context('zip'),
    interest: context('interest'),
    timing: context('timing'),
  };

  const alertSent = await sendInquiryAlert(inquiry);
  if (!alertSent) {
    console.error(
      'inquiry: the shop alert was not delivered; refusing to tell the visitor we received it.'
    );
    return NextResponse.json(
      { error: 'We could not deliver your message.' },
      { status: 503 }
    );
  }

  /*
   * Same belt-and-braces as /api/quotes: with Turnstile unconfigured in
   * production nothing has verified the address, and mailing an unverified
   * address is exactly what the gate exists to prevent. The shop already has
   * the message; the visitor is told the truth via customerAckSent.
   */
  let ack: Promise<boolean> = Promise.resolve(false);
  if (turnstileEnabled() || process.env.NODE_ENV !== 'production') {
    ack = sendInquiryAck(inquiry);
  } else {
    console.error(
      'Turnstile is not configured; skipping the inquiry acknowledgement for an unverified address.'
    );
  }
  const ackResult = await ack;

  return NextResponse.json({ ok: true, customerAckSent: ackResult });
}
