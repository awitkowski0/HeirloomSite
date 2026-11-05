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

function wwwHostRule(list: Array<Record<string, unknown>>) {
  return list.find(
    r =>
      r.source === '/:path*' &&
      Array.isArray(r.has) &&
      (r.has as Array<Record<string, unknown>>).some(
        h => h.type === 'host' && h.value === 'www\\.heirloomcribsandmore\\.com',
      ),
  );
}

test('production emits the www -> apex redirect as permanent (308)', async () => {
  const rule = wwwHostRule(await redirectsFor('production'));
  assert.ok(rule, 'production build should emit the www host redirect');
  assert.equal(rule!.permanent, true);
  assert.equal(rule!.destination, 'https://heirloomcribsandmore.com/:path*');
});

test('www host rule matches only the www host (no loop on the apex, previews or localhost)', async () => {
  const rule = wwwHostRule(await redirectsFor('production'))!;
  const value = (rule.has as Array<Record<string, string>>).find(h => h.type === 'host')!.value;
  // Next.js anchors `has` values, so test the anchored pattern.
  const re = new RegExp(`^(?:${value})$`);
  assert.equal(re.test('www.heirloomcribsandmore.com'), true);
  for (const host of [
    'heirloomcribsandmore.com',
    'heirloom-site-zeta.vercel.app',
    'heirloom-site-git-dev-x.vercel.app',
    'localhost',
    'localhost:3000',
    'wwwxheirloomcribsandmore.com',
    'www.heirloomcribsandmore.com.evil.example',
  ]) {
    assert.equal(re.test(host), false, `should not match ${host}`);
  }
  // The destination host is the apex, which the rule does not match: no loop.
  assert.equal(re.test(new URL(String(rule.destination).replace(':path*', '')).host), false);
});

test('preview and local builds do NOT emit the www redirect', async () => {
  assert.equal(wwwHostRule(await redirectsFor('preview')), undefined);
  assert.equal(wwwHostRule(await redirectsFor(undefined)), undefined);
});
