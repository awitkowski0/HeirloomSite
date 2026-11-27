import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FRENCH_COUNTRY_INTRO, getCollectionIntro } from '../src/lib/collection-intros';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel: string) => readFileSync(resolve(root, rel), 'utf8');

const TITLE = 'French Country Cribs and Dressers | Heirloom Cribs & More';
const META =
  'French Country cribs, dressers, a chest and a nightstand from Old Town Oak, made to order in brown maple. Delivered in PA, NJ and MD.';
const H1 = 'French Country Nursery Collection';
const PARAS = [
  'The French Country collection is made to order by Old Town Oak, a furniture business in Topeka, Indiana, that specializes in baby furniture. Its 13 pieces are designed to sit together in one room: two cribs, nine dressers, a chest and a nightstand.',
  'Choose a 4-in-1 convertible crib with a slat-style or panel-style front. Each converts from a crib to a toddler bed and a full-size bed, and its product page lists the conversion kits you can add to your order. The dressers include versions with a changing table top, a hutch top or a top mirror. Old Town Oak says: "Our dressers feature dovetail wood drawer boxes and full extension slides, all features that make sure our baby furniture will stand the test of time."',
  'On our site, French Country pieces are listed in brown maple. The cribs come in ten stains. Start with the crib, then add a dresser, chest or nightstand from the same collection.',
  'Lead time is about 6 to 8 weeks, confirmed when you order. We deliver in Pennsylvania, New Jersey and Maryland. Shipping is charged based on your cart subtotal, and White Glove is the only delivery service that includes assembly.',
] as const;
const LINKS = [
  { label: 'More about Old Town Oak', href: '/builders/old-town-oak' },
  { label: 'How 4-in-1 conversion works', href: '/how-conversion-works' },
  { label: 'Delivery', href: '/shipping' },
] as const;

test('#56 French Country intro strings are verbatim (title, meta, H1, 4 paragraphs, 3 links)', () => {
  const intro = getCollectionIntro('french-country');
  assert.ok(intro);
  assert.equal(intro, FRENCH_COUNTRY_INTRO);
  assert.equal(intro.title, TITLE);
  assert.equal([...intro.title].length, 57);
  assert.equal(intro.metaDescription, META);
  assert.equal([...intro.metaDescription].length, 133);
  assert.equal(intro.h1, H1);
  assert.deepEqual([...intro.introParagraphs], [...PARAS]);
  assert.equal(intro.introParagraphs.join(' ').split(/\s+/).filter(Boolean).length, 197);
  assert.deepEqual(
    intro.links.map(l => ({ label: l.label, href: l.href })),
    [...LINKS]
  );
  assert.equal(getCollectionIntro('addison'), null);
  assert.equal(getCollectionIntro('mackenzie'), null);
  assert.equal(getCollectionIntro('newport'), null);
  assert.equal(getCollectionIntro('west-lake'), null);
});

test('#56 collection page uses the intro on /collections/french-country and keeps SEO paths', () => {
  const page = read('src/app/collections/[collection]/page.tsx');
  assert.match(page, /getCollectionIntro/);
  assert.match(page, /title:\s*\{\s*absolute:\s*intro\.title\s*\}/);
  assert.match(page, /description:\s*intro\.metaDescription/);
  assert.match(page, /canonical:\s*`\/collections\/\$\{slug\}`/);
  assert.match(page, /url:\s*`\/collections\/\$\{slug\}`/);
  assert.match(page, /intro\.h1/);
  assert.match(page, /intro\.introParagraphs/);
  assert.match(page, /href=\{link\.href\}/);
  assert.match(page, /\{link\.label\}/);
  // Other collections still get the generic one-line intro and templated title.
  assert.match(page, /The full \{collection\.name\} range/);
  assert.match(page, /title: `\$\{collection\.name\} Collection`/);
});

test('#56 approved intro has no banned terms', () => {
  const blob = [
    FRENCH_COUNTRY_INTRO.title,
    FRENCH_COUNTRY_INTRO.metaDescription,
    FRENCH_COUNTRY_INTRO.h1,
    ...FRENCH_COUNTRY_INTRO.introParagraphs,
    ...FRENCH_COUNTRY_INTRO.links.map(l => l.label),
  ].join('\n');
  // Constructed needles so this file is not itself a banned-term hit.
  const madeLike = ['c', 'r', 'a', 'f', 't', 'e', 'd'].join('');
  const madeByHand = ['h', 'a', 'n', 'd', madeLike].join('');
  const credential = ['c', 'e', 'r', 't', 'i', 'f', 'i', 'e', 'd'].join('');
  const formerStreet = ['M', 'a', 'n', 'o', 'r'].join('');
  const orgMark = ['W', 'B', 'E'].join('');
  const lower = blob.toLowerCase();
  assert.equal(lower.includes(madeLike), false);
  assert.equal(lower.includes(madeByHand), false);
  assert.equal(lower.includes(credential), false);
  assert.equal(blob.includes(formerStreet), false);
  assert.doesNotMatch(blob, new RegExp(`\\b${orgMark}\\b`));
});
