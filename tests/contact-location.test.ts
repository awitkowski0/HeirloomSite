import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SERVICE_AREA_LINE } from '../src/lib/published-contact';

/*
 * CONTACT-1 / ADDR-1: /contact keeps the existing service-area sentence and
 * has no mailing address. /shipping and /returns drop the old mail-office
 * line and keep the city-only ship-from sentence; the warehouse street is
 * footer-only.
 */

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel: string) => readFileSync(resolve(root, rel), 'utf8');

const SERVICE_AREA = 'We deliver in Pennsylvania, New Jersey and Maryland.';
const SHIP_FROM = 'Orders ship from our warehouse in Bethlehem, Pennsylvania.';

test('/contact reuses the service-area sentence, has no mailing address, and links to the form', () => {
  const contact = read('src/app/contact/page.tsx');
  const shipping = read('src/app/shipping/page.tsx');
  const returns = read('src/app/returns/page.tsx');

  assert.equal(SERVICE_AREA_LINE, SERVICE_AREA);
  assert.ok(shipping.includes(SERVICE_AREA), 'service-area sentence missing from /shipping');
  assert.ok(shipping.includes(SHIP_FROM), 'city-only ship-from sentence missing from /shipping');
  assert.ok(returns.includes(SHIP_FROM), 'city-only ship-from sentence missing from /returns');
  assert.doesNotMatch(shipping, /4651|Hanoverville/);
  assert.doesNotMatch(returns, /4651|Hanoverville/);
  assert.ok(contact.includes('SERVICE_AREA_LINE'), 'service-area line not used on /contact');
  assert.equal((contact.match(/SERVICE_AREA_LINE/g) ?? []).length, 2, 'service-area line should appear once in the import and once in the body');
  assert.ok(contact.includes('href="#contact-us-form"'), '/contact must link to the Contact Us form');
  assert.doesNotMatch(contact, /4651|Hanoverville|WAREHOUSE_FOOTER_LINE/);
});
