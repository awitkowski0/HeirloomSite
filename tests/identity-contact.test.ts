import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  FOOTER_FAMILY_OWNED_LINE,
  PUBLISHED_EMAIL,
  PUBLISHED_PHONE,
  SERVICE_AREA_LINE,
  WAREHOUSE_FOOTER_LINE,
} from '../src/lib/published-contact';
import { organizationJsonLd } from '../src/lib/seo';

/*
 * Pricing App #243 / #269 / CONTACT-1 / ADDR-1: footer shows the approved
 * warehouse line plus the family-owned line and BrandLogo; /contact has
 * phone, email, the service-area sentence and the Contact Us form, and no
 * mailing address. Organization JSON-LD is a Bethlehem PostalAddress with
 * no street and the approved description.
 */

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel: string) => readFileSync(resolve(root, rel), 'utf8');

const WAREHOUSE_FOOTER =
  "Warehouse: 4651 A Hanoverville Rd, Bethlehem, PA 18020. This is our warehouse, not a showroom, and we don't offer walk-in shopping or pickup. We deliver in Pennsylvania, New Jersey, and Maryland.";

const JSON_LD_DESCRIPTION =
  'Online retailer of hardwood nursery furniture. The Bethlehem location is a warehouse and fulfillment site and is not open to the public. No showroom or walk-in shopping. We deliver in Pennsylvania, New Jersey, and Maryland.';

test('published contact values match the live /contact phone and email', () => {
  assert.equal(PUBLISHED_PHONE, '(484) 293-1840');
  assert.equal(PUBLISHED_EMAIL, 'HeirloomCribs.Care@HeirloomCribsandMore.com');
  const emailSrc = read('src/lib/email.ts');
  assert.ok(
    emailSrc.includes(`export const SUPPORT_INBOX = '${PUBLISHED_EMAIL}'`),
    'PUBLISHED_EMAIL must match SUPPORT_INBOX exactly',
  );
  assert.equal(WAREHOUSE_FOOTER_LINE, WAREHOUSE_FOOTER);
  assert.equal(
    SERVICE_AREA_LINE,
    'We deliver in Pennsylvania, New Jersey and Maryland.',
  );
});

test('footer has phone, email, the warehouse line, and the family-owned line; /contact has no mailing address and links to the form', () => {
  const footer = read('src/components/layout/Footer.tsx');
  const contact = read('src/app/contact/page.tsx');

  assert.ok(footer.includes('PUBLISHED_PHONE') || footer.includes(PUBLISHED_PHONE), 'footer missing phone');
  assert.ok(
    footer.includes('PUBLISHED_EMAIL') || footer.includes(PUBLISHED_EMAIL),
    'footer missing email',
  );
  assert.ok(footer.includes('WAREHOUSE_FOOTER_LINE'), 'footer missing warehouse line');
  assert.ok(footer.includes('FOOTER_FAMILY_OWNED_LINE'), 'footer missing family-owned line');
  assert.equal(WAREHOUSE_FOOTER_LINE, WAREHOUSE_FOOTER);
  assert.equal(
    FOOTER_FAMILY_OWNED_LINE,
    'Heirloom Cribs & More is a family-owned, women-owned shop.',
  );
  assert.ok(
    footer.includes('Solid hardwood nursery furniture, made to order. Choose Curbside or White Glove delivery.'),
    'existing footer tagline was dropped',
  );
  assert.doesNotMatch(footer, /openingHours|Monday|hours:/i);

  assert.ok(contact.includes('PUBLISHED_PHONE') || contact.includes(PUBLISHED_PHONE), '/contact missing phone');
  assert.ok(
    contact.includes('SUPPORT_INBOX') || contact.includes('PUBLISHED_EMAIL') || contact.includes(PUBLISHED_EMAIL),
    '/contact missing email',
  );
  assert.ok(contact.includes('SERVICE_AREA_LINE'), '/contact missing service-area line');
  assert.ok(contact.includes('href="#contact-us-form"'), '/contact missing link to the Contact Us form');
  assert.ok(contact.includes('<ContactPageForm'), '/contact missing the Contact Us form');
  assert.doesNotMatch(contact, /WAREHOUSE_FOOTER_LINE|4651|Hanoverville/);
  assert.doesNotMatch(contact, /openingHours|Monday|hours:/i);
});

test('Organization JSON-LD has telephone, email, a Bethlehem PostalAddress, and no street', () => {
  const ld = organizationJsonLd();
  assert.equal(ld.telephone, PUBLISHED_PHONE);
  assert.equal(ld.email, PUBLISHED_EMAIL);
  assert.equal(ld['@type'], 'Organization');
  assert.notEqual(ld['@type'], 'LocalBusiness');
  assert.equal(ld.description, JSON_LD_DESCRIPTION);
  const address = ld.address as Record<string, unknown>;
  assert.equal(address['@type'], 'PostalAddress');
  assert.equal(address.streetAddress, undefined);
  assert.equal(address.addressLocality, 'Bethlehem');
  assert.equal(address.addressRegion, 'PA');
  assert.equal(address.postalCode, '18020');
  assert.equal(address.addressCountry, 'US');
  assert.equal(address.description, undefined);
  assert.ok(!Object.prototype.hasOwnProperty.call(address, 'streetAddress'));
  assert.equal(ld.openingHours, undefined);
  assert.equal(ld.openingHoursSpecification, undefined);
  assert.equal(ld.geo, undefined);
  assert.equal(ld.hasMap, undefined);
  const raw = JSON.stringify(ld);
  assert.ok(!/"streetAddress"/.test(raw), 'street key must not appear in Organization JSON-LD');
  assert.ok(!/"LocalBusiness"/.test(raw), 'LocalBusiness must not appear in Organization JSON-LD');
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
