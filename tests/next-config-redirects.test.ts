/*
 * The *.vercel.app -> brand-domain redirect in next.config.ts.
 * Run with `npm test`.
 *
 * Two things matter and are easy to regress: it must be PERMANENT (308) so
 * Google consolidates the deployment hosts onto the brand domain, and it must
 * exist ONLY on the production build, or a preview would bounce its own host
 * and become unreachable.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import nextConfig from '../next.config';

async function redirectsFor(vercelEnv: string | undefined): Promise<Array<Record<string, unknown>>> {
  const prev = process.env.VERCEL_ENV;
  if (vercelEnv === undefined) delete process.env.VERCEL_ENV;
  else process.env.VERCEL_ENV = vercelEnv;
  try {
    const list = await nextConfig.redirects!();
    return list as unknown as Array<Record<string, unknown>>;
  } finally {
    if (prev === undefined) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = prev;
  }
}

function vercelHostRule(list: Array<Record<string, unknown>>) {
  return list.find(
    r =>
      r.source === '/:path*' &&
      Array.isArray(r.has) &&
      (r.has as Array<Record<string, unknown>>).some(h => h.type === 'host' && h.value === '.*\\.vercel\\.app'),
  );
}

test('production emits the *.vercel.app redirect as permanent (308) to the brand domain', async () => {
  const rule = vercelHostRule(await redirectsFor('production'));
  assert.ok(rule, 'production build should emit the vercel.app host redirect');
  assert.equal(rule!.permanent, true);
  assert.equal(rule!.destination, 'https://heirloomcribsandmore.com/:path*');
});

test('preview and local builds do NOT emit the *.vercel.app redirect', async () => {
  assert.equal(vercelHostRule(await redirectsFor('preview')), undefined);
  assert.equal(vercelHostRule(await redirectsFor(undefined)), undefined);
});
