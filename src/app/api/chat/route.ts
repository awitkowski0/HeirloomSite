import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { answerShopper, parseTurns } from '@/lib/shop-chat';
import { TURNSTILE_ACTIONS, TurnstileError, turnstileEnabled, verifyTurnstile } from '@/lib/turnstile';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UNAVAILABLE = 'Live chat is unavailable right now. You can still use the filters or talk to a person.';

/*
 * Anonymous and paid per message, so a deployed copy refuses to run without
 * Turnstile. Turnstile runs first, before any model call can be billed. Add a
 * Vercel Firewall rate-limit rule on this path for the volumetric case.
 */
export async function POST(req: Request) {
  if (process.env.VERCEL && !turnstileEnabled()) {
    return NextResponse.json({ error: UNAVAILABLE }, { status: 503 });
  }

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
      TURNSTILE_ACTIONS.chat,
    );
  } catch (err) {
    if (err instanceof TurnstileError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }

  const turns = parseTurns(body.messages);
  if (!turns) return NextResponse.json({ error: 'Please shorten your question and try again.' }, { status: 400 });

  try {
    return NextResponse.json(await answerShopper(turns));
  } catch (err) {
    console.error('[chat] model call failed', err);
    if (err instanceof Anthropic.RateLimitError) {
      return NextResponse.json({ error: 'Chat is busy. Please try again in a moment.' }, { status: 429 });
    }
    // Includes missing credentials, which the SDK reports when the request is built.
    return NextResponse.json({ error: UNAVAILABLE }, { status: 503 });
  }
}
