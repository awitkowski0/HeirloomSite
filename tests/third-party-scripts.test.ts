import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

/*
 * Third-party script on a page can read local storage and the DOM, so anything
 * that can see a shopper's interest notes has to stay off the page unless the
 * shopper asked for it.
 */
const read = (path: string) => readFileSync(path, 'utf8');

test('Babylist add.js is not loaded on every page', () => {
  assert.doesNotMatch(read('src/app/layout.tsx'), /babylist\.com\/add\.js/);
});

test('Babylist is only loaded from the on-demand loader', () => {
  assert.match(read('src/lib/babylist.ts'), /export function preloadBabylist/);
});

test('Meta automatic event collection is off before the pixel starts', () => {
  const src = read('src/lib/meta-pixel.ts');
  const off = src.indexOf("window.fbq('set', 'autoConfig', false, PIXEL_ID)");
  const init = src.indexOf("window.fbq('init', PIXEL_ID)");
  assert.ok(off > -1, 'autoConfig is not turned off');
  assert.ok(off < init, 'autoConfig must be set before init');
});

test('the cookie banner and privacy page disclose the interest notes', () => {
  assert.match(read('src/components/consent/ConsentBanner.tsx'), /suggest/);
  assert.match(read('src/app/privacy/page.tsx'), /180 days/);
});
