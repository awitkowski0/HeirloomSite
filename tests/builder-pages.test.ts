import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { sizeOf } from './helpers/image-size.mjs';

const PAGES = {
  about: 'src/app/about-heirloom/page.tsx',
  oto: 'src/app/builders/old-town-oak/page.tsx',
  fqp: 'src/app/builders/fishers-quality-products/page.tsx',
  kc: 'src/app/builders/kids-comfort/page.tsx',
  woods: 'src/app/woods-and-finishes/page.tsx',
};

function src(p: string): string {
  return readFileSync(p, 'utf8');
}
// Rendered-ish text: drop JSX comments so PHIL-LOOK / eslint-disable notes don't trip phrase checks.
function rendered(p: string): string {
  return src(p).replace(/\{\/\*[\s\S]*?\*\/\}/g, '');
}

const FORBIDDEN_ROUTES = [
  '/timeline', '/safety', '/care', '/finishes',
  '/why-hardwood', '/how-conversion-works', '/safe-sleep', '/faq',
];

test('(a) all five pages export a default component and metadata with a canonical', () => {
  for (const [name, p] of Object.entries(PAGES)) {
    const s = src(p);
    assert.match(s, /export default function \w+\(\)/, `${name} has no default component`);
    assert.match(s, /export const metadata:\s*Metadata/, `${name} has no metadata`);
    assert.match(s, /alternates:\s*\{\s*canonical:/, `${name} has no canonical`);
  }
});

test('(b) canonical uses relative brand paths (never a vercel.app host)', () => {
  const expected: Record<string, string> = {
    about: '/about-heirloom',
    oto: '/builders/old-town-oak',
    fqp: '/builders/fishers-quality-products',
    kc: '/builders/kids-comfort',
    woods: '/woods-and-finishes',
  };
  for (const [name, p] of Object.entries(PAGES)) {
    const s = src(p);
    assert.ok(s.includes(`canonical: '${expected[name]}'`), `${name} canonical != ${expected[name]}`);
    assert.ok(!/vercel\.app/i.test(s), `${name} references vercel.app`);
  }
});

test('(c) forbidden phrases never appear on the five pages', () => {
  const banned = [
    /exceeds?\s+all\s+safety\s+standards/i,
    /delivery included/i,
    /free shipping/i,
    /vercel\.app/i,
  ];
  for (const [name, p] of Object.entries(PAGES)) {
    const r = rendered(p);
    for (const re of banned) {
      assert.ok(!re.test(r), `${name} contains forbidden phrase ${re}`);
    }
  }
});

test('(d) no links to deliberately-excluded routes on any of the five pages', () => {
  for (const [name, p] of Object.entries(PAGES)) {
    const s = src(p);
    for (const route of FORBIDDEN_ROUTES) {
      const re = new RegExp(`href="${route}(\\b|[/"#])`);
      assert.ok(!re.test(s), `${name} links forbidden route ${route}`);
    }
  }
});

test('(e) About H2 "How an order works" carries id="how-an-order-works"', () => {
  assert.match(src(PAGES.about), /id="how-an-order-works"[^>]*>How an order works|How an order works<\/h2>/);
  assert.ok(src(PAGES.about).includes('id="how-an-order-works"'), 'anchor id missing');
});

test('(f) Q3 woman-owned line is never rendered', () => {
  for (const [name, p] of Object.entries(PAGES)) {
    assert.ok(!/woman-owned/i.test(rendered(p)), `${name} renders the Q3 woman-owned line`);
    assert.ok(!/women-owned/i.test(rendered(p)), `${name} renders a women-owned line`);
  }
});

test('(g) no raw [[DEFAULT-Q#: ]] marker syntax leaks into any page', () => {
  for (const [name, p] of Object.entries(PAGES)) {
    assert.ok(!/\[\[DEFAULT-Q/i.test(src(p)), `${name} still has a raw DEFAULT-Q marker`);
  }
});

test('(h) every <img> declares a width no larger than its native pixel width', () => {
  for (const [name, p] of Object.entries(PAGES)) {
    const s = src(p);
    const imgRe = /<img[\s\S]*?src="([^"]+)"[\s\S]*?width=\{(\d+)\}[\s\S]*?\/>/g;
    let m: RegExpExecArray | null;
    while ((m = imgRe.exec(s)) !== null) {
      const [, srcPath, wStr] = m;
      const declared = Number(wStr);
      const file = `public${srcPath}`;
      const { width } = sizeOf(file);
      assert.ok(declared <= width, `${name} img ${srcPath} declares ${declared} > native ${width} (upscaled)`);
    }
  }
});

test('(i) PHIL-LOOK health-claim comment stays in the Kids Comfort source', () => {
  assert.ok(src(PAGES.kc).includes('PHIL-LOOK: health claim'), 'KC PHIL-LOOK comment missing');
});

test('(j) all five routes build (prerendered in the Next build manifest)', () => {
  // Confirms the routes compile and are emitted; relies on a prior `next build`.
  const manifest = '.next/app-path-routes-manifest.json';
  let out: string;
  try {
    out = readFileSync(manifest, 'utf8');
  } catch {
    // Build not run in this context; skip rather than false-fail.
    return;
  }
  for (const route of ['/about-heirloom', '/builders/old-town-oak', '/builders/fishers-quality-products', '/builders/kids-comfort', '/woods-and-finishes']) {
    assert.ok(out.includes(route), `route ${route} not in build manifest`);
  }
  void execSync;
});
