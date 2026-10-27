import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Delivery',
  description:
    'Where we deliver, Curbside and White Glove options, delivery charges by cart subtotal, and builder lead times.',
  alternates: { canonical: '/shipping' },
  openGraph: { url: '/shipping' },
};

const RATES = [
  { subtotal: 'Under $2,500', curbside: '$175', whiteGlove: '$299' },
  { subtotal: '$2,500 – $3,499.99', curbside: '$325', whiteGlove: '$425' },
  { subtotal: '$3,500 – $4,499.99', curbside: '$425', whiteGlove: '$550' },
  { subtotal: '$4,500 – $5,999.99', curbside: '$575', whiteGlove: '$725' },
  { subtotal: '$6,000 – $7,499.99', curbside: '$725', whiteGlove: '$925' },
  { subtotal: '$7,500 – $8,999.99', curbside: '$850', whiteGlove: '$1,100' },
  { subtotal: '$9,000 and up', curbside: '$1,150', whiteGlove: '$1,475' },
] as const;

export default function ShippingPage() {
  return (
    <div className="container doc-page">
      <p className="label-caps text-on-surface-variant">Support</p>
      <h1 className="headline-xl">Delivery</h1>
      <p className="body-md text-on-surface-variant">Last updated: October 2026</p>

      <section>
        <h2 className="headline-md">Where we deliver</h2>
        <p>
          We deliver in Pennsylvania, New Jersey and Maryland; delivery to some ZIP codes in Newark
          is quoted individually. Additional delivery areas may be available; contact us
          through{' '}
          <Link href="/contact" className="doc-link">
            Get Personal Assistance
          </Link>{' '}
          for details and a quote.
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
          Delivery is charged separately at checkout and is based on your cart subtotal:
        </p>
        <div className="doc-table-wrap">
          <table className="doc-table">
            <thead>
              <tr>
                <th scope="col">Cart subtotal</th>
                <th scope="col">Curbside</th>
                <th scope="col">White Glove</th>
              </tr>
            </thead>
            <tbody>
              {RATES.map(row => (
                <tr key={row.subtotal}>
                  <td>{row.subtotal}</td>
                  <td>{row.curbside}</td>
                  <td>{row.whiteGlove}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <hr className="doc-rule" />

      <section>
        <h2 className="headline-md">Lead times</h2>
        <p>Every piece is made to order. Lead times are estimates, confirmed at order time:</p>
        <ul className="doc-list">
          <li>Old Town Oak: about 6–8 weeks</li>
          <li>Kids Comfort: about 8 weeks</li>
          <li>Fisher&rsquo;s: 10–14 weeks</li>
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
          </a>{' '}
          · 421 Manor Dr, Nazareth, PA 18064 (mail only, no showroom)
        </p>
      </section>
    </div>
  );
}
