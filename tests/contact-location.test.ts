import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/*
 * Pricing App #59: /contact must show the already-published service area
 * and mail-office lines, copied verbatim from /shipping and /returns.
 * No new customer wording.
 */

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel: string) => readFileSync(resolve(root, rel), 'utf8');

const SERVICE_AREA = 'We deliver in Pennsylvania, New Jersey and Maryland.';
const MAIL_OFFICE = '421 Manor Dr, Nazareth, PA 18064 (business office: mail only, no showroom)';

test('/contact reuses the /shipping service-area sentence and the /returns mail-office line verbatim', () => {
  const contact = read('src/app/contact/page.tsx');
  const shipping = read('src/app/shipping/page.tsx');
  const returns = read('src/app/returns/page.tsx');

  assert.ok(shipping.includes(SERVICE_AREA), 'service-area sentence missing from /shipping');
  assert.ok(returns.includes(MAIL_OFFICE), 'mail-office line missing from /returns');
  assert.ok(contact.includes(SERVICE_AREA), 'service-area sentence not reused on /contact');
  assert.ok(contact.includes(MAIL_OFFICE), 'mail-office line not reused on /contact');
});
