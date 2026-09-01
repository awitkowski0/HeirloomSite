'use client';

import { reopenConsent } from '@/lib/consent';

/**
 * "Cookie settings" in the footer.
 *
 * Its own client component because Footer is a server component and this needs
 * an onClick - the same split as any other island in this layout.
 *
 * Shown to EVERYONE, including visitors whose region never triggered the
 * banner. Those visitors are tracked by default and this is the only way they
 * have to turn it off, so hiding it behind the same geo check as the banner
 * would leave them with a policy page that describes a control that does not
 * exist.
 *
 * It reopens the banner rather than toggling anything directly, so there is one
 * place where a consent decision is made and one set of copy describing it.
 */
export default function CookieSettingsLink() {
  return (
    <button type="button" className="footer-link-button" onClick={reopenConsent}>
      Cookie settings
    </button>
  );
}
