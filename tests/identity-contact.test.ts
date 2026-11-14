import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  MAIL_OFFICE_LINE,
  PUBLISHED_EMAIL,
  PUBLISHED_PHONE,
} from '../src/lib/published-contact';
import { organizationJsonLd } from '../src/lib/seo';

/*
 * Pricing App #59 Merchant cause 2: footer, /contact, and Organization
 * JSON-LD use the live /contact phone and email and the Brand-signed
 * Nazareth mail-office line. No hours. No Bethlehem street address.
 */

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel: string) => readFileSync(resolve(root, rel), 'utf8');

test('published contact values match the live /contact phone and email', () => {
  assert.equal(PUBLISHED_PHONE, '(484) 293-1840');
  assert.equal(PUBLISHED_EMAIL, 'HeirloomCribs.Care@HeirloomCribsandMore.com');
  const emailSrc = read('src/lib/email.ts');
  assert.ok(
    emailSrc.includes(`export const SUPPORT_INBOX = '${PUBLISHED_EMAIL}'`),
    'PUBLISHED_EMAIL must match SUPPORT_INBOX exactly',
  );
  assert.equal(
    MAIL_OFFICE_LINE,
    '421 Manor Dr, Nazareth, PA 18064 (business office: mail only, no showroom)',
  );
});

test('footer and /contact include phone, email, and the mail-only office line', () => {
  const footer = read('src/components/layout/Footer.tsx');
  const contact = read('src/app/contact/page.tsx');
  for (const [name, src] of [['footer', footer], ['/contact', contact]] as const) {
    assert.ok(src.includes('PUBLISHED_PHONE') || src.includes(PUBLISHED_PHONE), `${name} missing phone`);
    assert.ok(
      src.includes('SUPPORT_INBOX') || src.includes('PUBLISHED_EMAIL') || src.includes(PUBLISHED_EMAIL),
      `${name} missing email`,
    );
    assert.ok(src.includes('MAIL_OFFICE_LINE') || src.includes(MAIL_OFFICE_LINE), `${name} missing mail-office line`);
    assert.doesNotMatch(src, /Hanoverville|4651/);
    assert.doesNotMatch(src, /openingHours|Monday|hours:/i);
  }
});

test('Organization JSON-LD has telephone, email, and a Nazareth PostalAddress', () => {
  const ld = organizationJsonLd();
  assert.equal(ld.telephone, PUBLISHED_PHONE);
  assert.equal(ld.email, PUBLISHED_EMAIL);
  const address = ld.address as Record<string, string>;
  assert.equal(address['@type'], 'PostalAddress');
  assert.equal(address.streetAddress, '421 Manor Dr');
  assert.equal(address.addressLocality, 'Nazareth');
  assert.equal(address.addressRegion, 'PA');
  assert.equal(address.postalCode, '18064');
  assert.equal(address.addressCountry, 'US');
  assert.equal(address.description, MAIL_OFFICE_LINE);
  assert.equal(ld.openingHours, undefined);
  assert.equal(ld.openingHoursSpecification, undefined);
  const src = read('src/lib/seo.ts');
  assert.doesNotMatch(src, /Hanoverville|4651/);
});
