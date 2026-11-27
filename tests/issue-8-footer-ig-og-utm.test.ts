import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  FACEBOOK_URL,
  INSTAGRAM_URL,
  WAREHOUSE_FOOTER_LINE,
} from '../src/lib/published-contact';
import {
  BRAND_SITE_URL,
  DEFAULT_OG_IMAGE,
  DEFAULT_OG_IMAGE_PATH,
  DEFAULT_OG_IMAGE_URL,
} from '../src/lib/seo';
import { utmFromSearchParams, presentUtm, UTM_KEYS } from '../src/lib/utm';

/*
 * Pricing App #8 / HSS-15: footer Instagram link, empty Facebook constant,
 * site-wide 1200x630 default og:image from a real product photo, and /contact
 * UTM hidden fields that reach /api/inquiry. ADDR-1 / CONTACT-1 and the
 * L-20261123-7 SEO host guards stay in force. No mailing address is added
 * to /contact.
 */

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel: string) => readFileSync(resolve(root, rel), 'utf8');

function jpegDimensions(buf: Buffer): { width: number; height: number } {
  if (buf[0] !== 0xff || buf[1] !== 0xd8) throw new Error('not a JPEG');
  let i = 2;
  while (i < buf.length - 8) {
    if (buf[i] !== 0xff) {
      i += 1;
      continue;
    }
    const marker = buf[i + 1];
    if (marker === 0xc0 || marker === 0xc1 || marker === 0xc2) {
      return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
    }
    if (marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7)) {
      i += 2;
      continue;
    }
    const len = buf.readUInt16BE(i + 2);
    i += 2 + len;
  }
  throw new Error('JPEG SOF not found');
}

test('footer Instagram URL is set and Facebook is unset', () => {
  assert.equal(INSTAGRAM_URL, 'https://www.instagram.com/heirloomcribs/');
  assert.equal(FACEBOOK_URL, null);

  const footer = read('src/components/layout/Footer.tsx');
  const published = read('src/lib/published-contact.ts');
  assert.ok(footer.includes('INSTAGRAM_URL'), 'footer missing Instagram constant');
  assert.match(footer, /href=\{INSTAGRAM_URL\}/);
  assert.match(footer, /\{INSTAGRAM_URL \? \(/);
  assert.match(footer, /\{FACEBOOK_URL \? \(/);
  assert.doesNotMatch(footer, /TODO/i);
  assert.doesNotMatch(published, /TODO/i);
  assert.doesNotMatch(footer, /facebook\.com/i);
  assert.ok(footer.includes('WAREHOUSE_FOOTER_LINE'), 'footer lost the warehouse line');
  assert.match(
    WAREHOUSE_FOOTER_LINE,
    /4651 A Hanoverville Rd, Bethlehem, PA 18020/,
  );
});

test('default og:image is a 1200x630 real product photo on the brand host', () => {
  assert.equal(DEFAULT_OG_IMAGE_PATH, '/og-default.jpg');
  assert.equal(DEFAULT_OG_IMAGE_URL, 'https://heirloomcribsandmore.com/og-default.jpg');
  assert.equal(DEFAULT_OG_IMAGE_URL, `${BRAND_SITE_URL}${DEFAULT_OG_IMAGE_PATH}`);
  assert.equal(DEFAULT_OG_IMAGE.url, DEFAULT_OG_IMAGE_URL);
  assert.equal(DEFAULT_OG_IMAGE.width, 1200);
  assert.equal(DEFAULT_OG_IMAGE.height, 630);
  assert.doesNotMatch(DEFAULT_OG_IMAGE_URL, /vercel\.app/);

  const layout = read('src/app/layout.tsx');
  const contact = read('src/app/contact/page.tsx');
  assert.ok(layout.includes('DEFAULT_OG_IMAGE'), 'layout missing default og:image');
  assert.ok(layout.includes('DEFAULT_OG_IMAGE_URL'), 'layout missing twitter og image');
  assert.doesNotMatch(layout, /logo-wide\.png/);
  assert.ok(contact.includes('DEFAULT_OG_IMAGE'), '/contact missing default og:image');
  assert.match(contact, /alternates:\s*\{\s*canonical:\s*'\/contact'\s*\}/);
  assert.match(contact, /url:\s*'\/contact'/);
  assert.ok(layout.includes("url: '/'"));

  const jpeg = readFileSync(resolve(root, 'public/og-default.jpg'));
  const size = jpegDimensions(jpeg);
  assert.deepEqual(size, { width: 1200, height: 630 });
});

test('utm_source, utm_medium, utm_campaign, and utm_content are read from the URL', () => {
  assert.deepEqual(UTM_KEYS, ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content']);

  const fromObject = utmFromSearchParams({
    utm_source: 'ig',
    utm_medium: 'social',
    utm_campaign: ['spring'],
    utm_content: 'link_in_bio',
    other: 'ignore-me',
  });
  assert.deepEqual(fromObject, {
    utm_source: 'ig',
    utm_medium: 'social',
    utm_campaign: 'spring',
    utm_content: 'link_in_bio',
  });

  const params = new URLSearchParams(
    'utm_source=ig&utm_medium=social&utm_content=link_in_bio',
  );
  assert.deepEqual(utmFromSearchParams(params), {
    utm_source: 'ig',
    utm_medium: 'social',
    utm_campaign: '',
    utm_content: 'link_in_bio',
  });

  const dirty = utmFromSearchParams({ utm_source: '  ig\nbot  ', utm_medium: '' });
  assert.equal(dirty.utm_source, 'igbot');
  assert.deepEqual(presentUtm(dirty), { utm_source: 'igbot' });
});

test('/contact stays static and UTM fields reach submitInquiry and the shop alert', () => {
  const page = read('src/app/contact/page.tsx');
  const form = read('src/components/contact/ContactPageForm.tsx');
  const route = read('src/app/api/inquiry/route.ts');
  const email = read('src/lib/email.ts');
  const client = read('src/lib/api-client.ts');

  // /contact must stay statically prerendered (AGENTS.md): no searchParams.
  assert.doesNotMatch(page, /searchParams/, '/contact reads searchParams, which makes it dynamic');
  assert.doesNotMatch(page, /4651|Hanoverville|WAREHOUSE_FOOTER_LINE/);

  assert.ok(
    form.includes('utmFromSearchParams(new URLSearchParams(window.location.search))'),
    'form does not read UTM tags from the URL at submit time',
  );
  assert.ok(form.includes('...presentUtm('), 'submitInquiry is not given the UTM values');

  for (const key of UTM_KEYS) {
    assert.ok(client.includes(`${key}?: string`), `InquiryRequest missing ${key}`);
    assert.ok(route.includes(`utm_${key.slice(4)}`) || route.includes(`${key}: context('${key}')`), `route missing ${key}`);
    assert.ok(email.includes(`inquiry.${key}`), `shop alert missing ${key}`);
  }
});

test('L-20261123-7 SEO guards: canonical, sitemap, and feed stay on the brand host', () => {
  const sitemap = read('src/app/sitemap.ts');
  const robots = read('src/app/robots.ts');
  const seo = read('src/lib/seo.ts');
  const feed = read('src/lib/merchant-feed.ts');
  assert.ok(sitemap.includes("import { SITE_URL } from '@/lib/seo'"));
  assert.ok(sitemap.includes('${SITE_URL}/'));
  assert.doesNotMatch(sitemap, /vercel\.app/);
  assert.doesNotMatch(robots, /vercel\.app/);
  assert.ok(feed.includes('BRAND_SITE_URL'));
  assert.doesNotMatch(feed, /vercel\.app/);
  assert.ok(seo.includes("export const BRAND_SITE_URL = 'https://heirloomcribsandmore.com'"));
  assert.doesNotMatch(DEFAULT_OG_IMAGE_URL, /vercel\.app/);
});
