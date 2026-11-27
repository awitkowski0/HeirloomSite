/**
 * Published phone, email, and the ADDR-1 warehouse footer line from
 * Pricing App #269 comment 7064181111 (Director PROOF-2 7064327144;
 * Phil t2095u / CONTACT-1). The warehouse street is shown only in the
 * footer.  The service-area sentence is reused on /contact (no street).
 */
export const PUBLISHED_PHONE = '(484) 293-1840';
export const PUBLISHED_PHONE_TEL = '+14842931840';
export const PUBLISHED_EMAIL = 'HeirloomCribs.Care@HeirloomCribsandMore.com';

/** Approved footer replacement (#269 / 7064327144). Includes the delivery sentence. */
export const WAREHOUSE_FOOTER_LINE =
  "Warehouse: 4651 A Hanoverville Rd, Bethlehem, PA 18020. This is our warehouse, not a showroom, and we don't offer walk-in shopping or pickup. We deliver in Pennsylvania, New Jersey, and Maryland.";

/** Existing /shipping service-area sentence (no street). Kept for /contact. */
export const SERVICE_AREA_LINE =
  'We deliver in Pennsylvania, New Jersey and Maryland.';

/** Public Instagram profile. Used as a footer link only. */
export const INSTAGRAM_URL = 'https://www.instagram.com/heirloomcribs/';

/**
 * Public Facebook Page URL. Unset until Phil decides the Page.
 * Empty/null must render nothing in the footer (no placeholder, no comment cue).
 */
export const FACEBOOK_URL: string | null = null;
