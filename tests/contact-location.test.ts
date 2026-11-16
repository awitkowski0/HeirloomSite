import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MAIL_OFFICE_LINE, SERVICE_AREA_LINE } from '../src/lib/published-contact';

/*
 * Pricing App #59: /contact must show the already-published service area
 * and mail-office lines, copied verbatim from /shipping and /returns.
 * No new customer wording.
 *
 * Folded into #144: /contact now reads those Brand lines from
 * published-contact.ts (SERVICE_AREA_LINE and MAIL_OFFICE_LINE) so the
 * strings are not duplicated in the page source. The expected text is
 * unchanged.
 */

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel: string) => readFileSync(resolve(root, rel), 'utf8');

const SERVICE_AREA = 'We deliver in Pennsylvania, New Jersey and Maryland.';
const MAIL_OFFICE = '421 Manor Dr, Nazareth, PA 18064 (business office: mail only, no showroom)';

test('/contact reuses the /shipping service-area sentence and the /returns mail-office line verbatim', () => {
  const contact = read('src/app/contact/page.tsx');
  const shipping = read('src/app/shipping/page.tsx');
  const returns = read('src/app/returns/page.tsx');

  assert.equal(SERVICE_AREA_LINE, SERVICE_AREA);
  assert.equal(MAIL_OFFICE_LINE, MAIL_OFFICE);
  assert.ok(shipping.includes(SERVICE_AREA), 'service-area sentence missing from /shipping');
  assert.ok(returns.includes(MAIL_OFFICE), 'mail-office line missing from /returns');
  assert.ok(contact.includes('SERVICE_AREA_LINE'), 'service-area line not used on /contact');
  assert.ok(contact.includes('MAIL_OFFICE_LINE'), 'mail-office line not used on /contact');
  assert.equal((contact.match(/SERVICE_AREA_LINE/g) ?? []).length, 2, 'service-area line should appear once in the import and once in the body');
  assert.equal((contact.match(/MAIL_OFFICE_LINE/g) ?? []).length, 2, 'mail-office line should appear once in the import and once in the body');
});
