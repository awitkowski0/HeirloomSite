import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { liveChatEnabled, openLiveChat } from '../src/lib/live-chat';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel: string) => readFileSync(resolve(root, rel), 'utf8');

test('live chat is inert without NEXT_PUBLIC_CRISP_WEBSITE_ID', () => {
  assert.equal(process.env.NEXT_PUBLIC_CRISP_WEBSITE_ID ?? '', '');
  assert.equal(liveChatEnabled, false);
  assert.equal(openLiveChat(), false);
});

test('the side rail is in the root layout and hidden below 1200px', () => {
  assert.match(read('src/app/layout.tsx'), /<SideRail \/>/);
  const css = read('src/app/globals.css');
  assert.match(css, /\.side-rail \{\s*display: none;\s*\}/);
  assert.match(css, /@media \(min-width: 1200px\) \{\s*body \{\s*--rail-w:/);
});

test('the side rail never loads Crisp on render, only on click', () => {
  const src = read('src/components/rail/SideRail.tsx');
  assert.match(src, /onClick=\{\(\) => \{[\s\S]*?openLiveChat\(\);/);
  assert.doesNotMatch(src, /useEffect/);
});

test('the CSP permits Crisp in every directive it uses', () => {
  const cfg = read('next.config.ts');
  for (const origin of [
    'https://client.crisp.chat',
    'wss://client.relay.crisp.chat',
    'https://game.crisp.chat',
  ]) {
    assert.ok(cfg.includes(origin), `CSP missing ${origin}`);
  }
  assert.match(cfg, /\$\{CRISP_SCRIPT_ORIGINS\}`/);
  assert.match(cfg, /\$\{CRISP_CONNECT_ORIGINS\}`/);
});

test('/privacy names Crisp', () => {
  assert.match(read('src/app/privacy/page.tsx'), /<strong>Crisp<\/strong>/);
});
