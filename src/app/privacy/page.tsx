import type { Metadata } from 'next';
import Link from 'next/link';

/*
 * IMPORTANT, for whoever maintains this page:
 *
 * This is not boilerplate. It exists because the consent banner has to link
 * somewhere, and a banner that cannot tell you what you are consenting to does
 * not do its job. Every third party named below is one this site actually
 * loads or sends data to - the list was taken from next.config.ts's CSP, which
 * is the only exhaustive inventory of them that exists.
 *
 * SO: IF YOU ADD A THIRD-PARTY SCRIPT, ADD IT HERE. The CSP will force you to
 * name the origin anyway; this page is the same change, one file over. A
 * privacy policy that has silently drifted out of date is worse than none,
 * because it is a written claim rather than an omission.
 *
 * Not legal advice and not reviewed by a lawyer. It describes what the code
 * does, accurately, which is the part engineering can be responsible for.
 */

export const metadata: Metadata = {
  title: 'Privacy',
  description:
    'What we collect, who we share it with, and how to change your tracking choices.',
  alternates: { canonical: '/privacy' },
};

export default function PrivacyPage() {
  return (
    <div className="container doc-page">
      <p className="label-caps text-on-surface-variant">Legal</p>
      <h1 className="headline-xl">Privacy</h1>
      <p className="body-md text-on-surface-variant">Last updated: September 1, 2026</p>
      <p className="body-lg doc-lede">
        What we collect, who processes it on our behalf, and how to change your mind. We sell
        furniture; we do not sell data.
      </p>

      <section>
        <h2 className="headline-md">What we collect</h2>
        <ul className="doc-list">
          <li>
            <strong>What you tell us.</strong> When you request a quote we collect your name,
            email address, shipping address and phone number, along with the items you configured.
            When you subscribe to our list we collect your email address and nothing else.
          </li>
          <li>
            <strong>How you use the site.</strong> Pages viewed, products opened, finishes chosen,
            searches run and items added to the cart. This is tied to a random identifier in your
            browser, not to your name — until you give us your email at checkout or in the signup
            form, at which point the two are linked.
          </li>
          <li>
            <strong>Session recordings.</strong> We record how pages are used so we can see where
            the site is confusing. <strong>Checkout is masked:</strong> everything typed into a
            form field, the address suggestions, and the confirmation email address are stripped
            out before the recording leaves your browser. We do not take payment card details
            anywhere on this site.
          </li>
        </ul>
      </section>

      <hr className="doc-rule" />

      <section>
        <h2 className="headline-md">Who processes it</h2>
        <ul className="doc-list">
          <li>
            <strong>PostHog</strong> — product analytics and session recording, configured as
            above. Sent through our own domain rather than PostHog&rsquo;s, so it survives tracker
            blocklists; the data goes to the same place either way.
          </li>
          <li>
            <strong>Meta (Facebook) Pixel</strong> — tells us which of our ads led to a quote, and
            lets Meta show our ads to people who have visited. This is the one on this list that
            is genuinely advertising rather than operations, and it is the reason the consent
            banner exists.
          </li>
          <li>
            <strong>Stripe</strong> — invoicing and payment. Payment happens on Stripe&rsquo;s own
            hosted invoice page, on Stripe&rsquo;s domain. No card details are ever entered on,
            or pass through, this site.
          </li>
          <li>
            <strong>Resend</strong> — order emails, and the mailing list if you subscribe.
          </li>
          <li>
            <strong>Cloudflare Turnstile</strong> — checks that quote requests and list signups
            come from a person rather than a script.
          </li>
          <li>
            <strong>Radar</strong> — address autocomplete on the checkout street field.
          </li>
          <li>
            <strong>Vercel</strong> — hosting. Vercel tells us the country a request came from,
            which is how we know whether to ask for consent before anything above loads.
          </li>
          <li>
            <strong>Babylist</strong> — lets our products be added to a Babylist registry.
          </li>
          <li>
            <strong>Google Fonts</strong> — typefaces, served to your browser.
          </li>
        </ul>
        <p>
          We do not sell personal information, and we do not share it with anyone beyond the
          processors listed here.
        </p>
      </section>

      <hr className="doc-rule" />

      <section>
        <h2 className="headline-md">Cookies and your choices</h2>
        <p>
          If you are in the EU, the EEA, the UK, Switzerland, Canada or California, analytics and
          advertising load only after you accept them. Nothing on the list above runs, and no
          cookie from it is set, until you do — if you decline, the site works normally and we
          learn nothing about your visit beyond the request our server had to answer anyway.
          Elsewhere they run by default and you can turn them off at any time.
        </p>
        <p>
          Either way, the choice is yours to change whenever you like, using{' '}
          <strong>Cookie settings</strong> at the bottom of any page. Turning tracking off stops
          session recording immediately and clears the advertising cookies.
        </p>
        <p>
          The cart, your saved shipping details and your cookie choice itself are kept in your
          browser&rsquo;s own storage. They never leave your device until you submit an order, and
          they are not analytics.
        </p>
      </section>

      <hr className="doc-rule" />

      <section>
        <h2 className="headline-md">Keeping and deleting</h2>
        <p>
          Order records are kept as long as we need them for the order, our accounts and our tax
          obligations. Analytics data is kept for as long as it is useful and no longer. You can
          unsubscribe from the mailing list using the link in any email we send.
        </p>
      </section>

      <hr className="doc-rule" />

      <section>
        <h2 className="headline-md">Your rights</h2>
        <p>Depending on where you live, you may have the right to:</p>
        <ul className="doc-list">
          <li>
            <strong>Know or access</strong> what personal information we hold about you.
          </li>
          <li>
            <strong>Correct</strong> inaccurate personal information.
          </li>
          <li>
            <strong>Delete</strong> personal information we hold about you.
          </li>
          <li>
            <strong>Get a copy</strong> of your personal information in a portable form.
          </li>
          <li>
            <strong>Opt out</strong> of the sharing described above under Meta Pixel, which some
            laws classify as a &ldquo;sale&rdquo; or &ldquo;sharing&rdquo; of information for
            targeted advertising. Use <strong>Cookie settings</strong> at the bottom of any page —
            it stops immediately, and we do not sell information in any other sense.
          </li>
        </ul>
        <p>
          To exercise any of these,{' '}
          <Link href="/contact" className="doc-link">
            get in touch
          </Link>{' '}
          and tell us which — we will need the email address you used so we can find the right
          records, and may need to verify it&rsquo;s you before acting on the request. We will not
          treat you differently for asking. If you are not satisfied with our response, you may
          have the right to appeal our decision or to complain to your local data protection
          authority.
        </p>
      </section>

      <hr className="doc-rule" />

      <section>
        <h2 className="headline-md">A few more things</h2>
        <ul className="doc-list">
          <li>
            <strong>Children.</strong> This site is not directed at children, and we do not
            knowingly collect personal information from them. If you are a parent or guardian and
            believe your child has given us information, contact us and we will delete it.
          </li>
          <li>
            <strong>International transfers.</strong> The processors listed above operate
            globally, so your information may be processed in a country other than the one you
            live in.
          </li>
        </ul>
      </section>

      <hr className="doc-rule" />

      <section>
        <h2 className="headline-md">Contact</h2>
        <p>
          Questions about this policy, or want to exercise one of the rights above? Call{' '}
          <a href="tel:+14842931840" className="doc-link">
            (484) 293-1840
          </a>
          , email{' '}
          <a href="mailto:heirloomcribs.care@heirloomcribsandmore.com" className="doc-link">
            heirloomcribs.care@heirloomcribsandmore.com
          </a>
          , or write to us at 421 Manor Dr, Nazareth, PA 18064, United States.
        </p>
      </section>
    </div>
  );
}
