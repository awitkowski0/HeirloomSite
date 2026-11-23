/**
 * Published phone, email, and footer lines. /contact on this branch still
 * uses the older mail-office and service-area constants; the footer follows
 * ADDR-1 (warehouse street only, in the footer) plus the family-owned line
 * requested for HeirloomSite #158 (Phil t2095u).
 */
export const PUBLISHED_PHONE = '(484) 293-1840';
export const PUBLISHED_PHONE_TEL = '+14842931840';
export const PUBLISHED_EMAIL = 'HeirloomCribs.Care@HeirloomCribsandMore.com';

/** Mail-only office line still referenced by /contact on this branch. */
export const MAIL_OFFICE_LINE =
  '421 Manor Dr, Nazareth, PA 18064 (business office: mail only, no showroom)';

/** Live /shipping service-area sentence. Kept for /contact. */
export const SERVICE_AREA_LINE =
  'We deliver in Pennsylvania, New Jersey and Maryland.';

/** Approved footer replacement from Pricing App #269 / 7064327144 (ADDR-1). */
export const WAREHOUSE_FOOTER_LINE =
  "Warehouse: 4651 A Hanoverville Rd, Bethlehem, PA 18020. This is our warehouse, not a showroom, and we don't offer walk-in shopping or pickup. We deliver in Pennsylvania, New Jersey, and Maryland.";

/**
 * One family-owned line added to the existing footer tagline (Phil t2095u:
 * not more than two lines added). Women-owned is existing approved wording.
 * LanguageTool en-US: 0 matches.
 */
export const FOOTER_FAMILY_OWNED_LINE =
  'Heirloom Cribs & More is a family-owned, women-owned shop.';
