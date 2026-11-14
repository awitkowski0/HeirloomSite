import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/*
 * Pricing App #25 About package (comment 6870905179, CoS PASS 6871203805)
 * plus #59 location wording (comment 6871041828). Applied verbatim.
 */

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel: string) => readFileSync(resolve(root, rel), 'utf8');

const ADDRESS_LINE =
  '421 Manor Dr, Nazareth, PA 18064 (business office: mail only, no showroom). Orders ship from our warehouse in Bethlehem, Pennsylvania.';

const ABOUT_LOCATION_1 =
  'Orders ship from our warehouse in Bethlehem, Pennsylvania, with our professional furniture delivery partner, blanket-wrapped and strapped in transit.';
const ABOUT_LOCATION_2 =
  'The warehouse has no showroom, and our Nazareth office accepts mail only.';

const META_DESCRIPTION =
  'Heirloom Cribs & More sells nursery furniture made to order by independent builders, made in the U.S. by craftspeople. See how ordering works.';

const Q10_A = 'made to order by independent builders';
const Q10_B = 'made in the U.S. by craftspeople';

test('/shipping and /returns contain the identical #59 address line', () => {
  const shipping = read('src/app/shipping/page.tsx');
  const returns = read('src/app/returns/page.tsx');
  assert.ok(shipping.includes(ADDRESS_LINE), 'missing identical address line on /shipping');
  assert.ok(returns.includes(ADDRESS_LINE), 'missing identical address line on /returns');
  assert.equal(
    shipping.split(ADDRESS_LINE).length - 1,
    1,
    '/shipping should contain the address line once',
  );
  assert.equal(
    returns.split(ADDRESS_LINE).length - 1,
    1,
    '/returns should contain the address line once',
  );
});

test('About contains the #59 location sentences and key #25 lines', () => {
  const about = read('src/app/about-heirloom/page.tsx');
  assert.ok(about.includes(ABOUT_LOCATION_1), 'missing #59/#25 first Delivery sentence');
  assert.ok(about.includes(ABOUT_LOCATION_2), 'missing #59 second Delivery sentence');
  assert.ok(about.includes(META_DESCRIPTION), 'missing #25 meta description');
  assert.ok(about.includes(Q10_A), 'missing Q10 phrase "made to order by independent builders"');
  assert.ok(about.includes(Q10_B), 'missing Q10 phrase "made in the U.S. by craftspeople"');
  assert.ok(
    about.includes(
      "we don't bill you until we've confirmed the details with you, and nothing is built until the deposit is in.",
    ),
    'missing accepted #25 order-intro wording',
  );
});

test("About source has no Hanoverville and no 'handcrafted', 'Amish' or 'American hardwood'", () => {
  const about = read('src/app/about-heirloom/page.tsx');
  for (const phrase of ['Hanoverville', 'handcrafted', 'Amish', 'American hardwood']) {
    assert.ok(!about.includes(phrase), `About contains "${phrase}"`);
  }
  // Warehouse is city-only: no Bethlehem street address, map pin, or "visit us".
  assert.doesNotMatch(about, /4651/);
  assert.doesNotMatch(about, /map pin|visit us/i);
});
