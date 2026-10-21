import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Returns, Cancellations & Refunds',
  description:
    'When you can cancel a custom order, how deposits and balances work, and what we do if furniture arrives damaged.',
  alternates: { canonical: '/returns' },
  openGraph: { url: '/returns' },
};

export default function ReturnsPage() {
  return (
    <div className="container doc-page">
      <p className="label-caps text-on-surface-variant">Legal</p>
      <h1 className="headline-xl">Returns, Cancellations &amp; Refunds</h1>
      <p className="body-md text-on-surface-variant">Last updated: October 2026</p>

      <section>
        <h2 className="headline-md">Made-to-order furniture: no returns</h2>
        <p>
          Our cribs, dressers, nightstands, chests and other case goods are made to order to your
          specifications (wood, stain and configuration) by our builders.{' '}
          <strong>Made-to-order case goods cannot be returned, exchanged or refunded.</strong>
        </p>
        <p>
          Other product types may carry a different return policy. Where they do, that policy is
          stated on the product&rsquo;s own page.
        </p>
      </section>

      <hr className="doc-rule" />

      <section>
        <h2 className="headline-md">How an order becomes final</h2>
        <ol className="doc-list">
          <li>You place your order. Nothing is charged at this point.</li>
          <li>
            We review it with you. We go over the order with you, confirm the details and the
            estimated lead time, and send your invoice within 48 hours of the order.
          </li>
          <li>
            You pay the deposit. Custom orders require a 50% deposit, and you must agree to our{' '}
            <Link href="/terms" className="doc-link">
              Terms of Sale
            </Link>
            . You can pay by credit card or Affirm.
          </li>
          <li>
            Your order is placed with the builder. Once we receive the deposit, we place your order
            with the builder, and the order can no longer be cancelled. The deposit is
            non-refundable.
          </li>
        </ol>
        <p>
          Cancelling: You can cancel at no cost at any point before your deposit is paid. Just tell
          us in writing. After the deposit is received, the order cannot be cancelled.
        </p>
      </section>

      <hr className="doc-rule" />

      <section>
        <h2 className="headline-md">Paying with Affirm</h2>
        <p>Affirm financing is subject to Affirm&rsquo;s terms.</p>
      </section>

      <hr className="doc-rule" />

      <section>
        <h2 className="headline-md">Balance</h2>
        <p>The remaining balance must be paid before we schedule final delivery.</p>
      </section>

      <hr className="doc-rule" />

      <section>
        <h2 className="headline-md">Damage in transit and defects</h2>
        <ul className="doc-list">
          <li>
            At delivery: inspect your furniture before the driver leaves. Note any visible damage
            on the delivery receipt when you sign it.
          </li>
          <li>
            Concealed defects: report them to us in writing within 5 business days of delivery.
            Include photos if you can, and please don&rsquo;t assemble a damaged piece.
          </li>
          <li>
            What we do: we coordinate the repair or replacement with the builder, and handle the
            claim with the delivery carrier.
          </li>
          <li>Warranty: the manufacturer&rsquo;s warranty passes through to you.</li>
        </ul>
      </section>

      <hr className="doc-rule" />

      <section>
        <h2 className="headline-md">Contact</h2>
        <p>
          Heirloom Cribs and More ·{' '}
          <a href="tel:+14842931840" className="doc-link">
            (484) 293-1840
          </a>{' '}
          ·{' '}
          <a href="mailto:heirloomcribs.care@heirloomcribsandmore.com" className="doc-link">
            heirloomcribs.care@heirloomcribsandmore.com
          </a>
        </p>
        <p>421 Manor Dr, Nazareth, PA 18064 (business office: mail only, no showroom)</p>
      </section>
    </div>
  );
}
