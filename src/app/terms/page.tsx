import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Terms of Sale',
  description:
    'Terms of Sale for custom made-to-order furniture from Heirloom Cribs and More, including deposits, cancellation, delivery and warranty.',
  alternates: { canonical: '/terms' },
  openGraph: { url: '/terms' },
};

export default function TermsPage() {
  return (
    <div className="container doc-page">
      <p className="label-caps text-on-surface-variant">Legal</p>
      <h1 className="headline-xl">Terms of Sale</h1>
      <p className="body-md text-on-surface-variant">Last updated: October 2026</p>
      <p className="body-lg doc-lede">
        These terms apply to custom (made-to-order) orders. You agree to them before paying your
        deposit.
      </p>

      <section>
        <ol className="doc-list">
          <li>
            <strong>Order review and invoice.</strong> After you place an order, we review it with
            you and send an invoice within 48 hours of the order. Nothing is charged until you pay
            that invoice.
          </li>
          <li>
            <strong>Payment.</strong> We accept credit card and Affirm. Affirm financing is subject
            to Affirm&rsquo;s terms.
          </li>
          <li>
            <strong>Deposit.</strong> Custom orders require a 50% deposit of the order total.
          </li>
          <li>
            <strong>Cancellation.</strong> You may cancel in writing at no cost before the deposit
            is paid. Once the deposit is received we place the order with the builder, the order
            can no longer be cancelled, and the deposit is non-refundable.
          </li>
          <li>
            <strong>All sales final: no returns.</strong> Made-to-order case goods (cribs, dressers,
            nightstands, chests) are built to your specifications and cannot be returned or
            exchanged. Other product types may have a different policy, stated on their product
            page. See{' '}
            <Link href="/returns" className="doc-link">
              Returns, Cancellations &amp; Refunds
            </Link>
            .
          </li>
          <li>
            <strong>Balance.</strong> The remaining balance must be paid before we schedule final
            delivery.
          </li>
          <li>
            <strong>Delivery.</strong> Lead times and delivery dates are estimates, confirmed at
            order time. Delivery areas, options and charges are listed on{' '}
            <Link href="/shipping" className="doc-link">
              Delivery
            </Link>
            .
          </li>
          <li>
            <strong>Inspection, damage and defects.</strong> You must inspect the goods at delivery
            and note any visible damage on the delivery receipt when you sign it. Concealed defects
            must be reported to us in writing within 5 business days of delivery. We coordinate
            repair or replacement with the builder and the claim with the delivery carrier.
          </li>
          <li>
            <strong>Warranty.</strong> Seller makes no independent warranties. The
            manufacturer&rsquo;s warranty passes through to you.
          </li>
        </ol>
        <p>
          Card payments are processed on Stripe&rsquo;s hosted invoice page; card details are never
          entered on this site. See{' '}
          <Link href="/privacy" className="doc-link">
            Privacy
          </Link>
          .
        </p>
      </section>

      <hr className="doc-rule" />

      <section>
        <h2 className="headline-md">Contact</h2>
        <p>
          Heirloom Cribs and More · 421 Manor Dr, Nazareth, PA 18064 (mail only, no showroom) ·{' '}
          <a href="tel:+14842931840" className="doc-link">
            (484) 293-1840
          </a>{' '}
          ·{' '}
          <a href="mailto:heirloomcribs.care@heirloomcribsandmore.com" className="doc-link">
            heirloomcribs.care@heirloomcribsandmore.com
          </a>
        </p>
      </section>
    </div>
  );
}
