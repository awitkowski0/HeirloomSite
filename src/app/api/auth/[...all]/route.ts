import { toNextJsHandler } from 'better-auth/next-js';

export const runtime = 'nodejs';

/* Imported on demand so a deployment without auth settings still builds. See src/lib/auth.ts. */
async function handle(req: Request): Promise<Response> {
  if (process.env.VERCEL) return new Response(null, { status: 503 });
  const { auth } = await import('@/lib/auth');
  const { GET, POST } = toNextJsHandler(auth);
  return req.method === 'POST' ? POST(req) : GET(req);
}

export { handle as GET, handle as POST };
