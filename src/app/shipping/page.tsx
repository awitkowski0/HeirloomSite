import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Delivery',
  description:
    'Where we deliver, Curbside and White Glove options, shipping is charged at checkout, and builder lead times.',
  alternates: { canonical: '/shipping' },
  openGraph: { url: '/shipping' },
};

export default function ShippingPage() {
  return (
    <div className="container doc-page">
      <p className="label-caps text-on-surface-variant">Support</p>
      <h1 className="headline-xl">Delivery</h1>
      <p className="body-md text-on-surface-variant">Last updated: November 2026</p>

      <section>
        <h2 className="headline-md">Where we deliver</h2>
        <p>
          We deliver in Pennsylvania, New Jersey and Maryland. Delivery to some Newark, NJ ZIP codes
          is quoted individually.
        </p>
      </section>

      <hr className="doc-rule" />

      <section>
        <h2 className="headline-md">Delivery options</h2>
        <p>
          Delivery is made by our professional furniture delivery partner. Furniture is
          blanket-wrapped and strapped in transit.
        </p>
        <p>
          <strong>Curbside:</strong> a one-person crew brings your furniture to the curb at your
          address, at the back of the truck. Because it&rsquo;s a one-person crew, you (or someone
          at the address) must be able to help unload the item from the truck and carry it from the
          curb into the home. Curbside does not include carrying items indoors, upstairs, or to
          individual units in an apartment building, and does not include unpacking, assembly or
          placement.
        </p>
        <p>
          <strong>White Glove:</strong> a two-person crew delivers into your home, unpacks,
          assembles, places each piece where you want it, and removes the packing materials. White
          Glove includes up to 3 flights of stairs.
        </p>
      </section>

      <hr className="doc-rule" />

      <section>
        <h2 className="headline-md">Delivery charges</h2>
        <p>
          Shipping is charged separately at checkout. You choose Curbside or White Glove when you
          order. Rates can change with fuel costs, so we do not publish a rate table; the charge
          for your order is shown at checkout.
        </p>
      </section>

      <hr className="doc-rule" />

      <section>
        <h2 className="headline-md">Lead times</h2>
        <p>
          Every piece is made to order. The time to plan for is the builder&rsquo;s build lead plus
          delivery 1 to 10 business days after your piece is ready. Build leads are estimates,
          confirmed at order time:
        </p>
        <ul className="doc-list">
          <li>Old Town Oak: about 6–8 weeks (30–40 business days)</li>
          <li>Kids Comfort: about 8 weeks (about 40 business days)</li>
          <li>Fisher&rsquo;s: 10–14 weeks (50–70 business days)</li>
        </ul>
        <p>
          Your build starts when we receive your deposit (see{' '}
          <Link href="/returns" className="doc-link">
            Returns, Cancellations &amp; Refunds
          </Link>
          ). The balance must be paid before we schedule final delivery.
        </p>
      </section>

      <hr className="doc-rule" />

      <section>
        <h2 className="headline-md">Scheduling</h2>
        <p>We contact you to schedule delivery once your furniture is ready.</p>
        <p>
          Delivery 1 to 10 business days after your piece is ready, for PA/NJ/MD Curbside and White
          Glove.
        </p>
      </section>

      <hr className="doc-rule" />

      <section>
        <h2 className="headline-md">When it arrives</h2>
        <p>
          Inspect your furniture before the driver leaves, and note any visible damage on the
          delivery receipt when you sign it. Report concealed defects to us in writing within 5
          business days. We coordinate repair or replacement with the builder and handle the
          carrier claim. See{' '}
          <Link href="/returns" className="doc-link">
            Returns, Cancellations &amp; Refunds
          </Link>
          .
        </p>
      </section>

      <hr className="doc-rule" />

      <section>
        <h2 className="headline-md">Gifts</h2>
        <p>
          Gift orders are arranged by hand. Please{' '}
          <Link href="/contact" className="doc-link">
            contact us
          </Link>
          .
        </p>
      </section>

      <hr className="doc-rule" />

      <section>
        <h2 className="headline-md">Contact</h2>
        <p>
          <a href="tel:+14842931840" className="doc-link">
            (484) 293-1840
          </a>{' '}
          ·{' '}
          <a href="mailto:heirloomcribs.care@heirloomcribsandmore.com" className="doc-link">
            heirloomcribs.care@heirloomcribsandmore.com
          </a>
        </p>
        <p>Orders ship from our warehouse in Bethlehem, Pennsylvania.</p>
      </section>
    </div>
  );
}
