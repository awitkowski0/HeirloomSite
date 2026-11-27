import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import nextConfig from '../next.config';

/*
 * Pricing App #38 Q1: permanent 308 from /about to /about-heirloom.
 * SEO guards (L-20261123-7 as applied to this alias): sitemap lists only the
 * destination; /about-heirloom canonical and og:url are self + brand path.
 */

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel: string) => readFileSync(resolve(root, rel), 'utf8');

async function redirects(): Promise<Array<Record<string, unknown>>> {
  const list = await nextConfig.redirects!();
  return list as unknown as Array<Record<string, unknown>>;
}

function aboutRule(list: Array<Record<string, unknown>>) {
  return list.find(r => r.source === '/about' && !r.has);
}

test('/about-heirloom exists as a real page', () => {
  assert.ok(existsSync(resolve(root, 'src/app/about-heirloom/page.tsx')));
});

test('/about permanently redirects (308) to /about-heirloom on every build, including preview', async () => {
  const prev = process.env.VERCEL_ENV;
  try {
    for (const env of ['production', 'preview', undefined] as const) {
      if (env === undefined) delete process.env.VERCEL_ENV;
      else process.env.VERCEL_ENV = env;
      const rule = aboutRule(await redirects());
      assert.ok(rule, `/about redirect missing when VERCEL_ENV=${env}`);
      assert.equal(rule!.destination, '/about-heirloom');
      assert.equal(rule!.permanent, true);
    }
  } finally {
    if (prev === undefined) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = prev;
  }
});

test('sitemap lists /about-heirloom and does not list /about', () => {
  const src = read('src/app/sitemap.ts');
  assert.match(src, /\$\{SITE_URL\}\/about-heirloom/);
  assert.doesNotMatch(src, /\$\{SITE_URL\}\/about(?!-[a-z])/);
});

test('/about-heirloom canonical and og:url are self (brand path)', () => {
  const src = read('src/app/about-heirloom/page.tsx');
  assert.match(src, /alternates:\s*\{\s*canonical:\s*'\/about-heirloom'\s*\}/);
  assert.match(src, /openGraph:[\s\S]*url:\s*'\/about-heirloom'/);
});
