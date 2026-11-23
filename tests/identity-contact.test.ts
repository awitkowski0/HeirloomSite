import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  FOOTER_FAMILY_OWNED_LINE,
  MAIL_OFFICE_LINE,
  PUBLISHED_EMAIL,
  PUBLISHED_PHONE,
  SERVICE_AREA_LINE,
  WAREHOUSE_FOOTER_LINE,
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
  assert.equal(
    SERVICE_AREA_LINE,
    'We deliver in Pennsylvania, New Jersey and Maryland.',
  );
});

test('/contact includes phone, email, and the existing mail-office and service-area lines', () => {
  const contact = read('src/app/contact/page.tsx');
  assert.ok(contact.includes('PUBLISHED_PHONE') || contact.includes(PUBLISHED_PHONE), '/contact missing phone');
  assert.ok(
    contact.includes('SUPPORT_INBOX') || contact.includes('PUBLISHED_EMAIL') || contact.includes(PUBLISHED_EMAIL),
    '/contact missing email',
  );
  assert.ok(contact.includes('MAIL_OFFICE_LINE') || contact.includes(MAIL_OFFICE_LINE), '/contact missing mail-office line');
  assert.ok(contact.includes('SERVICE_AREA_LINE') || contact.includes(SERVICE_AREA_LINE), '/contact missing service-area line');
  assert.doesNotMatch(contact, /openingHours|Monday|hours:/i);
});

test('footer includes phone, email, the warehouse line, and the family-owned line', () => {
  const footer = read('src/components/layout/Footer.tsx');
  assert.ok(footer.includes('PUBLISHED_PHONE') || footer.includes(PUBLISHED_PHONE), 'footer missing phone');
  assert.ok(
    footer.includes('PUBLISHED_EMAIL') || footer.includes(PUBLISHED_EMAIL),
    'footer missing email',
  );
  assert.ok(footer.includes('WAREHOUSE_FOOTER_LINE'), 'footer missing warehouse line');
  assert.ok(footer.includes('FOOTER_FAMILY_OWNED_LINE'), 'footer missing family-owned line');
  assert.equal(
    WAREHOUSE_FOOTER_LINE,
    "Warehouse: 4651 A Hanoverville Rd, Bethlehem, PA 18020. This is our warehouse, not a showroom, and we don't offer walk-in shopping or pickup. We deliver in Pennsylvania, New Jersey, and Maryland.",
  );
  assert.equal(
    FOOTER_FAMILY_OWNED_LINE,
    'Heirloom Cribs & More is a family-owned, women-owned shop.',
  );
  assert.ok(
    footer.includes('Solid hardwood nursery furniture, made to order. Choose Curbside or White Glove delivery.'),
    'existing footer tagline was dropped',
  );
  assert.doesNotMatch(footer, /MAIL_OFFICE_LINE/);
  assert.doesNotMatch(footer, /openingHours|Monday|hours:/i);
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

test('header and footer use the updated logo with the full company name as the accessible label', () => {
  const header = read('src/components/layout/Header.tsx');
  const footer = read('src/components/layout/Footer.tsx');
  const logo = read('src/components/layout/BrandLogo.tsx');
  assert.ok(header.includes('<BrandLogo className="wordmark"'), 'header missing BrandLogo');
  assert.ok(footer.includes('<BrandLogo className="footer-brand"'), 'footer missing BrandLogo');
  assert.ok(logo.includes('/brand/logo-wide.png'), 'desktop logo path missing');
  assert.ok(logo.includes('/brand/logo-text.png'), 'phone logo path missing');
  assert.ok(logo.includes('aria-label="Heirloom Cribs & More, home"'), 'accessible name must be the full company name');
  assert.doesNotMatch(logo, /aria-label="Heirloom"/);
});

test('Organization JSON-LD lists areaServed for PA, NJ and MD and is injected site-wide once', () => {
  const ld = organizationJsonLd();
  const served = ld.areaServed as { '@type': string; name: string }[];
  assert.ok(Array.isArray(served));
  assert.deepEqual(
    served.map((s) => s.name),
    ['Pennsylvania', 'New Jersey', 'Maryland'],
  );
  for (const entry of served) assert.equal(entry['@type'], 'State');

  const layout = read('src/app/layout.tsx');
  const home = read('src/app/page.tsx');
  assert.ok(layout.includes('organizationJsonLd()'), 'layout must inject Organization JSON-LD');
  assert.ok(!home.includes('organizationJsonLd()'), 'home must not also emit Organization JSON-LD');
  assert.equal(layout.split('organizationJsonLd()').length - 1, 1);
});
