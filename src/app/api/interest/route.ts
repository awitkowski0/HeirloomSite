import type { NextRequest } from 'next/server';
import { getInterestCatalog } from '@/lib/interest/catalog-server';
import {
  cleanPostedEvents,
  countAccountEvents,
  deleteAccountEvents,
  interestDb,
  mergeAccountEvents,
} from '@/lib/interest/db';

export const runtime = 'nodejs';

const NO_STORE = { 'Cache-Control': 'private, no-store' };
const MAX_BODY_BYTES = 300_000;

function json(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: NO_STORE });
}

/* Accounts are local-only until sign-in has a real email path. See src/lib/auth.ts. */
function unavailable(): Response | null {
  return process.env.VERCEL ? json({ available: false }, 503) : null;
}

async function currentUserId(req: NextRequest): Promise<string | null> {
  const { auth } = await import('@/lib/auth');
  const session = await auth.api.getSession({ headers: req.headers });
  return session?.user.id ?? null;
}

/* This is a cookie-authenticated, state-changing route, so another origin must not reach it. */
function fromOtherOrigin(req: NextRequest): boolean {
  const origin = req.headers.get('origin');
  if (!origin) return false;
  try {
    return new URL(origin).host !== req.headers.get('host');
  } catch {
    return true;
  }
}

/* Whether there is an account to merge into. Anonymous visitors get a plain "no". */
export async function GET(req: NextRequest) {
  const blocked = unavailable();
  if (blocked) return blocked;
  const userId = await currentUserId(req);
  if (!userId) return json({ signedIn: false, accountEvents: 0 });
  return json({ signedIn: true, accountEvents: await countAccountEvents(interestDb(), userId) });
}

/* Merges this device's events into the account and returns the union. */
export async function POST(req: NextRequest) {
  const blocked = unavailable();
  if (blocked) return blocked;
  if (fromOtherOrigin(req)) return json({ error: 'forbidden' }, 403);

  const userId = await currentUserId(req);
  if (!userId) return json({ error: 'sign-in required' }, 401);

  const length = Number(req.headers.get('content-length') ?? 0);
  if (length > MAX_BODY_BYTES) return json({ error: 'too large' }, 413);

  let body: { events?: unknown };
  try {
    body = (await req.json()) as { events?: unknown };
  } catch {
    return json({ error: 'invalid body' }, 400);
  }

  const events = cleanPostedEvents(body.events, getInterestCatalog(), Date.now());
  const merged = await mergeAccountEvents(interestDb(), userId, events);
  return json({ merged: events.length, events: merged });
}

/* The account half of "forget this". */
export async function DELETE(req: NextRequest) {
  const blocked = unavailable();
  if (blocked) return blocked;
  if (fromOtherOrigin(req)) return json({ error: 'forbidden' }, 403);

  const userId = await currentUserId(req);
  if (!userId) return json({ error: 'sign-in required' }, 401);
  return json({ deleted: await deleteAccountEvents(interestDb(), userId) });
}
