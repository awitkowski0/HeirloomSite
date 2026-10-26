import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Custom Order Timeline',
  description:
    'How a made-to-order hardwood crib moves from Choose to Confirm Order, deposit, hand finishing, and regional delivery—with a planning estimate for your order.',
  alternates: { canonical: '/timeline' },
  openGraph: { url: '/timeline' },
};

export default function TimelinePage() {
  return (
    <div className="container doc-page">
      <p className="label-caps text-on-surface-variant">Owner&rsquo;s guide</p>
      <h1 className="headline-xl">Custom Order Timeline</h1>
      <p className="body-lg doc-lede">
        If a crib is made to order rather than sitting in a warehouse, the important questions are
        how the process works and when it will arrive. This guide follows the same path as our
        homepage.
      </p>

      <section>
        <h2 className="headline-md">Made to order vs. in stock</h2>
        <p>
          Each hardwood crib we offer is made to order by Amish and independent US craftspeople —
          Heirloom Cribs and More is the reseller, not the factory. Nothing is pulled from a
          finished-goods warehouse for your configuration.
        </p>
        <p>
          Because each piece is built after Confirm Order and deposit, timing depends on the
          builder and your finish choices. Lead times are estimates we confirm at order time, per
          builder: Old Town Oak about <strong>6–8 weeks</strong>, Kids Comfort about{' '}
          <strong>8 weeks</strong>, Fisher&rsquo;s <strong>10–14 weeks</strong>. See{' '}
          <Link href="/shipping" className="doc-link">Delivery</Link> for areas, options and
          charges.
        </p>
      </section>

      <hr className="doc-rule" />
      <section>
        <h2 className="headline-md">The order journey</h2>
        <ol className="doc-list">
          <li>
            <strong>01 Choose and Customize.</strong> Pick the silhouette first; hardwood and
            finish follow. Every crib converts through four stages and arrives with the rails to do
            it. Most styles offer wood and stain options on the product page. If you&rsquo;re unsure
            which finish will match your room, ask us before you place an order — share inspiration
            photos through <Link href="/contact" className="doc-link">Get Personal Assistance</Link>.
          </li>
          <li>
            <strong>02 Confirm Order (this is the quality check).</strong> Nothing is charged when
            you place an order. We read it, check the details with you, and only then ask for
            anything. No card is taken at checkout — the order is a commitment, not a charge. We
            call to confirm the stain, the kit list, and the delivery before anything is built. A
            secure Stripe invoice follows within 48 hours of the order. Custom orders require a{' '}
            <strong>50% deposit</strong>. You can pay by credit card or Affirm.
          </li>
          <li>
            <strong>03 Built and Finishing by Hand.</strong> Your piece is cut, joined, and
            finished to order in solid American hardwood by Amish and independent US craftspeople.
            Lead times are estimates confirmed at order time: Old Town Oak about 6–8 weeks, Kids
            Comfort about 8 weeks, Fisher&rsquo;s 10–14 weeks. The remaining balance must be paid{' '}
            <strong>before we schedule final delivery</strong>.
          </li>
          <li>
            <strong>04 Delivered to Your Nursery.</strong> You choose Curbside (to the curb) or
            White Glove (into your home, with unpacking, assembly and placement). White Glove
            includes up to 3 flights of stairs. We deliver in{' '}
            <strong>Pennsylvania, New Jersey and Maryland</strong>, except some ZIP codes in Newark;
            other areas may be available by request and are quoted individually. See{' '}
            <Link href="/shipping" className="doc-link">Delivery</Link>.
          </li>
        </ol>
      </section>

      <section>
        <h2 className="headline-md">How long does a custom crib take?</h2>
        <p>
          Lead times are estimates we confirm at order time, per builder: Old Town Oak about{' '}
          <strong>6–8 weeks</strong>, Kids Comfort about <strong>8 weeks</strong>, Fisher&rsquo;s{' '}
          <strong>10–14 weeks</strong>. Share your target month when you reach out if you have a
          nursery deadline.
        </p>
      </section>

      <hr className="doc-rule" />
      <section>
        <h2 className="headline-md">Deposits, cancellation, and balance</h2>
        <ul className="doc-list">
          <li><strong>Before deposit:</strong> Nothing is charged at checkout. You can cancel at
            no cost until the deposit is paid — tell us in writing.</li>
          <li><strong>Deposit:</strong> Custom orders require a 50% deposit. Once the deposit is
            received, the order goes to the builder and cannot be cancelled, and the deposit is
            non-refundable. See{' '}
            <Link href="/terms" className="doc-link">Terms of Sale</Link>
            {' '}and{' '}
            <Link href="/returns" className="doc-link">Returns, Cancellations &amp; Refunds</Link>.</li>
          <li><strong>Balance:</strong> The remaining balance must be paid{' '}
            <strong>before we schedule final delivery</strong>.</li>
        </ul>
      </section>

      <section>
        <h2 className="headline-md">What to prepare before ordering</h2>
        <ol className="doc-list">
          <li>Preferred crib style (or a few you&rsquo;re comparing).</li>
          <li>Wood / stain ideas if you have them.</li>
          <li>Delivery ZIP code — we deliver in Pennsylvania, New Jersey and Maryland, except some
            ZIP codes in Newark.</li>
          <li>Ideal delivery window; a month is fine.</li>
          <li>What&rsquo;s included for your SKU (rails / conversion parts — check the product page;
            we&rsquo;ll confirm the kit list on the Confirm Order call).</li>
        </ol>
        <p>
          For finish and long-term ownership guidance, see our <Link href="/care" className="doc-link">Care
          guide</Link>. For product standards and setup, see <Link href="/safety" className="doc-link">Safety
          &amp; Certifications</Link>.
        </p>
      </section>

      <section>
        <h2 className="headline-md">Common questions</h2>
        <h3>Is the crib really made after I order?</h3>
        <p>Yes. Makers build it to order in solid American hardwood after Confirm Order and deposit
          — not pulled from stock.</p>
        <h3>Can I hit a specific month?</h3>
        <p>Tell us the target month before you order. We&rsquo;ll tell you if it&rsquo;s realistic for the
          style and finish you want.</p>
        <h3>Are conversion kits included?</h3>
        <p>Homepage: every crib arrives with the rails for the four-stage path. Safety page: some
          conversion parts are sold separately so you can buy them when you reach that stage. Check
          your product page; we&rsquo;ll confirm the kit list on Confirm Order.</p>
      </section>
    </div>
  );
}
