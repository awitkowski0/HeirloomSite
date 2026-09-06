import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Custom Order Timeline',
  description:
    'What to expect when ordering a made-to-order solid hardwood crib: the journey, timing ranges from our docs, deposits, and how to prepare.',
  alternates: { canonical: '/timeline' },
};

export default function TimelinePage() {
  return (
    <div className="container doc-page">
      <p className="label-caps text-on-surface-variant">Owner&rsquo;s guide</p>
      <h1 className="headline-xl">Custom Order Timeline</h1>
      <p className="body-lg doc-lede">If a crib is made to order rather than sitting in a warehouse, the important questions are how the process works and when it will arrive. This guide walks through the custom-order journey for a solid hardwood, US-made convertible crib.</p>

      <section>
        <h2 className="headline-md">Made to order vs. in stock</h2>
        <p>A made-to-order crib is built after a customer places the deposit. Production begins with your order. Because each crib is built after ordering, the lead time depends on current production and your finish choices. We confirm a planning estimate for your specific order and location rather than publishing a one-size-fits-all &ldquo;ships in X days&rdquo; promise.</p>
      </section>

      <hr className="doc-rule" />
      <section>
        <h2 className="headline-md">The order journey</h2>
        <ol className="doc-list">
          <li><strong>Step 1 &mdash; Choose your style, wood, and finish.</strong> Most styles offer wood and stain options on the product page. If you are unsure which finish will match your room, send inspiration photos through <Link href="/contact" className="doc-link">Get Personal Assistance</Link> before you place a deposit.</li>
          <li><strong>Step 2 &mdash; Place a 50% deposit; production begins.</strong> Ordering requires a <strong>50% deposit</strong>, which is non-refundable as stated on the product page. Read the terms on the page you purchase from before depositing; we are happy to answer questions first.</li>
          <li><strong>Step 3 &mdash; Confirm lead time and delivery for your zip code.</strong> After the deposit, we confirm a planning estimate for delivery to your area and the delivery option that fits.</li>
          <li><strong>Step 4 &mdash; Production and finishing.</strong> Your crib is crafted in solid hardwood and finished according to the choices you made. Finish safety details live on our <Link href="/safety" className="doc-link">Safety &amp; Certifications page</Link>. On select collections the finish carries UL GREENGUARD Gold certification for low chemical emissions; others use non-toxic, water-based, lead-free finishes.</li>
          <li><strong>Step 5 &mdash; Balance due before shipping.</strong> The remaining balance is due before the crib ships. Your order confirmation and follow-up communication will state when the balance is due.</li>
          <li><strong>Step 6 &mdash; Delivery to your home.</strong> Delivery options are confirmed for your zip code at order. Standard or white-glove delivery may be available depending on the level of setup and placement you want. Exact options and pricing for your area are confirmed when we plan your shipment.</li>
          <li><strong>Step 7 &mdash; Conversion, not replacement.</strong> As your child grows, the same crib can convert through its stages on styles and configurations that support them. Confirm what is in the box for your SKU, including whether conversion kits are included.</li>
        </ol>
      </section>

      <section>
        <h2 className="headline-md">How long does a custom crib take?</h2>
        <p>The honest answer is that timing depends on your order and when production is scheduled. Current production timing is confirmed when you place the deposit, and a planning estimate is provided for your style and location.</p>
        <p>Share your target delivery month. If you have a hard deadline, such as a due date, nursery-ready date, or moving date, name it explicitly through <Link href="/contact" className="doc-link">Get Personal Assistance</Link> so we can tell you whether it is realistic for the style and finish you want before you commit.</p>
      </section>

      <hr className="doc-rule" />
      <section>
        <h2 className="headline-md">Deposits, cancellation, and balance</h2>
        <ul className="doc-list">
          <li><strong>Deposit:</strong> 50% non-refundable as stated on the product page; production starts with the deposit.</li>
          <li><strong>Cancellation:</strong> Product pages state a 48-hour cancellation window. Because production begins promptly, the deposit is non-refundable as written. Read the terms on the page you purchase from and ask us before depositing if anything is unclear.</li>
          <li><strong>Balance:</strong> Due before shipping, per the confirmation and follow-up communication.</li>
        </ul>
      </section>

      <section>
        <h2 className="headline-md">What to prepare before ordering</h2>
        <ol className="doc-list">
          <li>A shortlist of one to three styles, and the wood or stain you prefer—or inspiration to share.</li>
          <li>Your delivery zip code.</li>
          <li>Your ideal delivery window; the month is enough to start.</li>
          <li>Confirmation of what is included for the SKU, such as whether conversion kits are included.</li>
        </ol>
        <p>For finish, care, and long-term ownership guidance, see our <Link href="/care" className="doc-link">Care guide</Link>.</p>
      </section>

      <section>
        <h2 className="headline-md">Common questions</h2>
        <h3>Is the crib really built after I order?</h3>
        <p>Yes. Each crib is made to order in solid hardwood. The 50% deposit starts production, and timing is confirmed for your specific order and location.</p>
        <h3>Why not publish an exact lead time on every page?</h3>
        <p>Timing depends on current production and finish choices. A confirmed estimate for your order is more honest than a generic promise that may not hold.</p>
        <h3>What if I need the crib by a specific month?</h3>
        <p>Tell us the target month before ordering. We will tell you if it is realistic for the style and finish you want.</p>
        <h3>What happens after I pay the balance?</h3>
        <p>Your crib ships via the delivery option you chose, with the shipping method and window confirmed for your zip code.</p>
        <h3>Are conversion kits included?</h3>
        <p>On select styles, toddler and full conversion kits are included. Confirm what is in the box for the specific SKU on its product page before ordering.</p>
      </section>
    </div>
  );
}
