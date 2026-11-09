import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

/*
 * The layer's promises, checked in two ways: the source cannot reach a third
 * party, and at runtime it does not try to. Together with the real consent
 * module, driven below.
 */

const LAYER_DIRS = ['src/lib/interest', 'src/components/interest', 'src/app/your-taste', 'src/app/api/interest'];

function files(dir: string): string[] {
  return readdirSync(dir).flatMap(name => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : /\.(ts|tsx)$/.test(name) ? [path] : [];
  });
}

const LAYER_FILES = LAYER_DIRS.flatMap(files);

function codeOnly(path: string): string {
  return readFileSync(path, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/^\s*\/\/.*$/gm, '');
}

test('the layer imports no analytics, ad, HeyCatch or Babylist code', () => {
  const forbidden = /(posthog|@heycatch|heycatch|meta-pixel|fbevents|lib\/analytics|babylist)/i;
  for (const path of LAYER_FILES) {
    const imports = [...codeOnly(path).matchAll(/from\s+['"]([^'"]+)['"]|import\s+['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g)]
      .map(m => m[1] ?? m[2] ?? m[3]);
    for (const spec of imports) {
      assert.doesNotMatch(spec, forbidden, `${path} imports ${spec}`);
    }
  }
});

test('nothing that talks to a third party imports the layer', () => {
  const senders = [
    'src/lib/analytics.ts',
    'src/lib/posthog-client.ts',
    'src/lib/meta-pixel.ts',
    'src/lib/shop-chat.ts',
    'src/app/api/chat/route.ts',
    'src/app/api/quotes/route.ts',
  ];
  for (const path of senders) {
    assert.doesNotMatch(codeOnly(path), /lib\/interest/, `${path} must not read the interest profile`);
  }
});

test('the only network calls in the layer go to our own /api/interest', () => {
  const callers: string[] = [];
  for (const path of LAYER_FILES) {
    const code = codeOnly(path);
    if (/\bfetch\(|sendBeacon|XMLHttpRequest|new WebSocket|EventSource/.test(code)) callers.push(path);
    assert.doesNotMatch(code, /https?:\/\//, `${path} names a URL`);
  }
  assert.deepEqual(callers, ['src/lib/interest/account-client.ts']);
  const account = codeOnly('src/lib/interest/account.ts');
  assert.match(account, /const ENDPOINT = '\/api\/interest'/);
  assert.equal(account.match(/fetcher\(/g)?.length, account.match(/fetcher\(ENDPOINT/g)?.length, 'every call targets ENDPOINT');
});

test('the event model and database have no field for anything sensitive', () => {
  const sensitive = /(due[_ ]?date|pregnan|trimester|gender|birth|conception|health|family[_ ]?status|marital|\bip\b|ip_address|user_agent|fingerprint|device_id|visitor_id)/i;
  assert.doesNotMatch(codeOnly('src/lib/interest/events.ts'), sensitive);
  const schema = readFileSync('db/schema.sql', 'utf8');
  const interestTable = schema.slice(schema.indexOf('CREATE TABLE IF NOT EXISTS interest_event'));
  assert.doesNotMatch(interestTable.replace(/--.*$/gm, ''), sensitive);
  assert.match(interestTable, /REFERENCES "user" \(id\) ON DELETE CASCADE/);
});

test('personal text on the page is masked from session replay and autocapture', () => {
  const source = readFileSync('src/components/interest/WhatWeLearned.tsx', 'utf8');
  assert.match(source, /INTEREST_PRIVATE_CLASS/);
  assert.match(readFileSync('src/lib/interest/uses.ts', 'utf8'), /INTEREST_PRIVATE_CLASS = 'ph-mask ph-no-capture'/);
});

test('the page stays statically prerendered', () => {
  const page = codeOnly('src/app/your-taste/page.tsx');
  assert.doesNotMatch(page, /searchParams|cookies\(|headers\(|force-dynamic|'use client'/);
  assert.match(page, /robots: \{ index: false, follow: false \}/);
});

// --- Runtime, against the real consent module and a stubbed browser -------

const networkCalls: string[] = [];
const storage = new Map<string, string>();
const listeners = new Map<string, Set<(e: Event) => void>>();

before(() => {
  const windowStub = {
    localStorage: {
      getItem: (k: string) => storage.get(k) ?? null,
      setItem: (k: string, v: string) => void storage.set(k, v),
      removeItem: (k: string) => void storage.delete(k),
    },
    addEventListener: (type: string, fn: (e: Event) => void) => {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type)!.add(fn);
    },
    removeEventListener: (type: string, fn: (e: Event) => void) => void listeners.get(type)?.delete(fn),
    dispatchEvent: (event: Event) => {
      for (const fn of listeners.get(event.type) ?? []) fn(event);
      return true;
    },
    location: { search: '' },
  };
  (globalThis as unknown as { window: unknown }).window = windowStub;
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    networkCalls.push(String(input));
    return new Response('{}');
  }) as typeof fetch;
  Object.defineProperty(globalThis, 'navigator', {
    value: {
      sendBeacon: (url: string) => {
        networkCalls.push(`beacon:${url}`);
        return true;
      },
    },
    configurable: true,
  });
  (globalThis as unknown as { XMLHttpRequest: unknown }).XMLHttpRequest = class {
    open(_method: string, url: string) {
      networkCalls.push(`xhr:${url}`);
    }
    send() {}
  };
});

test('recording, reading and clearing make no network call of any kind', async () => {
  const consent = await import('../src/lib/consent');
  const { recordInterest, recordCompare, clearInterests, getInterestState, setInterestLearning } = await import('../src/lib/interest/store');
  const { synthesizeProfile } = await import('../src/lib/interest/profile');
  const { tasteLine, rankSuggestions, chooseNextPair } = await import('../src/lib/interest/uses');
  const { CATALOG } = await import('./helpers/interest-fixture');

  // Exercised through the real consent module, from its initial 'unknown'.
  recordInterest({ kind: 'view', slug: 'arched-a' });
  assert.equal(consent.consentStatus(), 'unknown');
  assert.equal(getInterestState().status, 'waiting');
  assert.equal(storage.has('heirloom_interest_v1'), false, 'no write before consent');

  consent.grantConsent();
  assert.equal(getInterestState().status, 'learning');
  assert.equal(getInterestState().events.length, 1, 'the queued view flushed on grant');

  recordCompare(['arched-a', 'arched-b']);
  recordInterest({ kind: 'add_to_cart', slug: 'arched-a', finish: 'Harvest' });
  const profile = synthesizeProfile(getInterestState().events, CATALOG);
  tasteLine(profile);
  rankSuggestions(profile, CATALOG);
  chooseNextPair(profile, CATALOG);

  consent.denyConsent();
  assert.equal(storage.has('heirloom_interest_v1'), false, 'withdrawal erases the log');
  recordInterest({ kind: 'view', slug: 'arched-b' });
  assert.equal(storage.has('heirloom_interest_v1'), false);

  consent.grantConsent();
  recordInterest({ kind: 'view', slug: 'arched-b' });
  setInterestLearning(false);
  clearInterests();

  assert.deepEqual(networkCalls, [], 'the layer made no network call');
});
