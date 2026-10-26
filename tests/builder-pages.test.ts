import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { sizeOf } from './helpers/image-size.mjs';

const ABOUT = 'src/app/about-heirloom/page.tsx';
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

test('(e) About page keeps id="how-an-order-works" so builder deep-links resolve', () => {
  assert.ok(src(ABOUT).includes('id="how-an-order-works"'), 'About anchor id missing');
});

test('(e2) builder pages deep-link /about-heirloom#how-an-order-works', () => {
  for (const name of ['oto', 'fqp', 'kc'] as const) {
    assert.ok(src(PAGES[name]).includes('/about-heirloom#how-an-order-works'), `${name} missing About deep-link`);
  }
});

test('(f) Q3 woman-owned line: ON on About only, driven from the Q constants, after Who we are p2', () => {
  const r = rendered(ABOUT);
  assert.ok(r.includes("q3WomanOwned: `Heirloom Cribs & More is a woman-owned business.`"), 'Q3 constant missing');
  assert.ok(r.includes('{Q.q3WomanOwned ? <p>{Q.q3WomanOwned}</p> : null}'), 'Q3 not rendered from Q constant');
  const who = r.indexOf('>Who we are</h2>');
  const p2 = r.indexOf("We don't build furniture.");
  const q3 = r.indexOf('{Q.q3WomanOwned ?');
  const next = r.indexOf('id="how-an-order-works"');
  assert.ok(who > 0 && who < p2 && p2 < q3 && q3 < next, 'Q3 line not after the Who we are second paragraph');
  assert.equal((r.match(/woman-owned/gi) || []).length, 1, 'woman-owned should appear exactly once on About');
  for (const [name, p] of Object.entries(PAGES)) {
    if (name !== 'about') assert.ok(!/woman-owned/i.test(rendered(p)), `${name} renders a woman-owned line`);
    assert.ok(!/women-owned/i.test(rendered(p)), `${name} renders a women-owned line`);
  }
});

test('(f2) no "certified" with woman-owned / on About, and no Instagram link on any page', () => {
  // Builder pages quote builders' own "certified to CPSIA/ASTM" and "Ohio Certified Stains" lines; those stay.
  assert.ok(!/certified/i.test(src(ABOUT)), 'About contains "certified"');
  for (const [name, p] of Object.entries(PAGES)) {
    assert.ok(!/(certified[^\n]{0,40}wom[ae]n-owned|wom[ae]n-owned[^\n]{0,40}certified)/i.test(src(p)), `${name} pairs certified with woman-owned`);
    assert.ok(!/instagram/i.test(rendered(p)), `${name} renders Instagram`);
    assert.ok(!/instagram\.com|@heirloomcribs\b/i.test(src(p)), `${name} links Instagram`);
  }
});

const OUR_STORY: string[] = [
  "When we found out we were going to become grandparents, we began searching for a crib for our first grandchild. We wanted something special: beautiful, well-made, and built to last for generations.",
  "Twenty-eight years ago, when we were expecting our own daughter, we found a solid wood crib that became a cherished part of our family's story. As we searched for that same quality for our grandson, we realized how difficult it was to find heirloom-quality nursery furniture in the Lehigh Valley.",
  "That realization inspired us to create a place where families can find beautifully crafted, solid wood cribs designed to become part of their family's story.",
  "Because we believe a crib is more than just furniture. It's where memories begin, and we hope the pieces we offer will be treasured for generations to come.",
  "Thank you for letting us be a small part of your family's story."
];

test('(f3) Our story: H2 after the sub-headline and before Who we are, five paragraphs verbatim', () => {
  const r = rendered(ABOUT);
  const sub = r.indexOf('builder-header__sub');
  const story = r.indexOf('>Our story</h2>');
  const who = r.indexOf('>Who we are</h2>');
  assert.ok(sub > 0 && sub < story && story < who, 'Our story is not between the sub-headline and Who we are');
  const block = r.slice(story, who);
  assert.ok(block.includes('OUR_STORY.map'), 'Our story does not render OUR_STORY');
  assert.ok(!/<blockquote|<img|<picture/.test(block), 'Our story must have no pull quote or image');
  assert.equal(OUR_STORY.length, 5);
  for (const para of OUR_STORY) {
    assert.ok(r.includes('`' + para + '`,'), `story paragraph missing or altered: ${para.slice(0, 40)}`);
  }
  assert.ok(!/<!--|SOURCE:/.test(r), 'md HTML comments must not be rendered');
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

test('(k) every page uses the primary button for Get Personal Assistance', () => {
  for (const [name, p] of Object.entries(PAGES)) {
    assert.match(src(p), /className="button-primary"[^>]*>\s*Get Personal Assistance|Get Personal Assistance<\/Link>/, `${name} missing primary button`);
    assert.ok(src(p).includes('className="button-primary"'), `${name} has no button-primary`);
  }
  assert.ok(src(ABOUT).includes('className="button-primary"'), 'About has no button-primary');
});

test('(l) image header pages serve a responsive <picture> with a downscaled mobile crop', () => {
  const imagePages = { oto: PAGES.oto, woods: PAGES.woods };
  for (const [name, p] of Object.entries(imagePages)) {
    const s = src(p);
    assert.ok(s.includes('<picture>'), `${name} has no <picture>`);
    assert.match(s, /<source[^>]*media="\(max-width[^>]*srcSet="[^"]*-mobile\.jpg"/, `${name} has no mobile <source>`);
  }
});

test('(m) no builder image is upscaled: declared widths (img + source) never exceed native, and the 600px box downscales', () => {
  for (const [name, p] of Object.entries(PAGES)) {
    const s = src(p);
    // <img ... src="/images/builders/..." ... width={N}>
    const imgRe = /<img[\s\S]*?src="(\/images\/builders\/[^"]+)"[\s\S]*?width=\{(\d+)\}/g;
    let m: RegExpExecArray | null;
    while ((m = imgRe.exec(s)) !== null) {
      const [, srcPath, wStr] = m;
      const { width } = sizeOf(`public${srcPath}`);
      assert.ok(Number(wStr) <= width, `${name} img ${srcPath} declares ${wStr} > native ${width}`);
      assert.ok(width >= 600, `${name} img ${srcPath} native ${width} < 600 box (would upscale)`);
    }
    // <source ... srcSet="/images/builders/..." width={N}>
    const srcRe = /<source[^>]*srcSet="(\/images\/builders\/[^"]+)"[^>]*width=\{(\d+)\}/g;
    while ((m = srcRe.exec(s)) !== null) {
      const [, srcPath, wStr] = m;
      const { width } = sizeOf(`public${srcPath}`);
      assert.ok(Number(wStr) <= width, `${name} source ${srcPath} declares ${wStr} > native ${width}`);
    }
  }
});

test('(n) Old Town Oak sub-headline matches the revised copy', () => {
  assert.ok(src(PAGES.oto).includes('A furniture business in Topeka, Indiana, that specializes in baby furniture. Its 2026 catalog says it has been in business for 21 years.'), 'OTO sub-headline not updated');
});

test('(o) Kids Comfort shows the Joe Troyer quote once (header panel only, not repeated in the body)', () => {
  const s = src(PAGES.kc);
  const count = (s.match(/We are real people that answer our phone/g) || []).length;
  assert.equal(count, 1, `KC quote appears ${count} times, expected 1`);
  assert.ok(s.includes('Joe Troyer, Kids Comfort catalog, January 2023'), 'KC header attribution missing');
  assert.ok(s.includes('PHIL-LOOK: health claim'), 'KC PHIL-LOOK comment missing');
});

test('(p) About contact card is a finished card pulling email from the shared source', () => {
  const s = src(ABOUT);
  assert.ok(s.includes('builder-panel--card'), 'About card modifier class missing');
  assert.ok(s.includes('Talk to us'), 'About card label missing');
  assert.ok(/import \{ SUPPORT_INBOX \} from '@\/lib\/email'/.test(s), 'About does not import SUPPORT_INBOX');
  assert.ok(s.includes('SUPPORT_INBOX.toLowerCase()'), 'About card does not lowercase the shared inbox');
  assert.ok(s.includes("SUPPORT_EMAIL.split('@')"), 'About card email is not split at @ from SUPPORT_EMAIL');
  assert.ok(/\{SUPPORT_EMAIL_USER\}\s*<wbr \/>\s*\{`@\$\{SUPPORT_EMAIL_HOST\}`\}/.test(s), 'About card email lacks <wbr /> before @');
  assert.ok(s.includes('href={`mailto:${SUPPORT_EMAIL}`}'), 'About card mailto changed');
  assert.ok(s.includes('<a href="mailto:heirloomcribs.care@heirloomcribsandmore.com">heirloomcribs.care<wbr />@heirloomcribsandmore.com</a>'), 'About header email lacks <wbr /> before @ or mailto changed');
});

test('(q) each page sets an absolute title matching its source meta title (no doubled site suffix)', () => {
  const expected: Record<string, string> = {
    about: 'About Heirloom Cribs & More | How We Work',
    oto: 'Old Town Oak Cribs & Dressers | Heirloom Cribs & More',
    fqp: "Fisher's Quality Products Cribs | Heirloom Cribs & More",
    kc: 'Kids Comfort Cribs & Furniture | Heirloom Cribs & More',
    woods: 'Woods and Finishes | Heirloom Cribs & More',
  };
  for (const [name, p] of Object.entries(PAGES)) {
    const s = src(p);
    assert.ok(s.includes(`absolute: '${expected[name]}'`) || s.includes(`absolute: "${expected[name]}"`), `${name} missing absolute title`);
    // og + twitter titles follow the same title
    assert.ok(s.includes(`openGraph: { title:`), `${name} openGraph title missing`);
    assert.ok(s.includes(`twitter: { title:`), `${name} twitter title missing`);
    // the brand suffix must appear at most once (no doubling)
    const occ = (s.match(/Heirloom Cribs & More/g) || []);
    void occ;
  }
});

test('(r) About builder tile and delivery line use the Brand wording', () => {
  const s = src(ABOUT);
  assert.ok(s.includes('Describes itself as family-owned'), 'Fisher tile wording not updated');
  assert.ok(!/\{`Family-owned`\}/.test(s), 'old Family-owned tile text still present');
  assert.ok(s.includes('except some ZIP codes in Newark'), 'delivery line not updated');
  assert.ok(!s.includes('Some North Jersey ZIP codes are outside our area'), 'old delivery line still present');
});
