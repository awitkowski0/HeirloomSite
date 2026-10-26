import type { Metadata } from 'next';
import Link from 'next/link';

// Q#-dependent copy, one place each, for easy swapping if Phil's answers change.
// (About: Q1, Q4, Q5, Q7, Q8. Q2/Q3/Q6/Q9 render nothing by decision.)
const Q = {
  q1: `Heirloom Cribs & More brings handcrafted, made-to-order nursery furniture from three builders to families in Pennsylvania, New Jersey and Maryland.`,
  q4: `Each builder is introduced in its own words on its own page.`,
  q5: `our warehouse in Bethlehem, Pennsylvania`,
  q7Babylist: `If you're building a baby registry, pieces on our site can be added to a Babylist registry, and we can also create a custom order that can be added to your personal Babylist registry.`,
  q8Sub: `three builders`,
  q8KidsComfort: `Kids Comfort pieces aren't listed on our site yet; they are available on request.`,
};

export const metadata: Metadata = {
  title: 'About Heirloom Cribs & More | How We Work',
  description:
    'Heirloom Cribs & More brings handcrafted, made-to-order nursery furniture from three builders to families in PA, NJ and MD. See how ordering works.',
  alternates: { canonical: '/about-heirloom' },
  openGraph: { url: '/about-heirloom' },
};

export default function AboutHeirloomPage() {
  return (
    <div className="container">
      <header className="builder-header">
        <div className="builder-header__text">
          <p className="label-caps text-on-surface-variant">About Heirloom Cribs &amp; More</p>
          <h1 className="headline-xl">One team from your first question to delivery day</h1>
          <p className="body-lg builder-header__sub">
            {`Heirloom Cribs & More sells handcrafted cribs and nursery furniture, made to order by ${Q.q8Sub}. We take your order, answer your calls, send your invoice, schedule your delivery and sort out any damage with the builder and the carrier.`}
          </p>
          <Link href="/contact" className="button-primary">Get Personal Assistance</Link>
          <p className="builder-header__contact">
            <a href="tel:+14842931840">(484) 293-1840</a>
            {` · `}
            <a href="mailto:heirloomcribs.care@heirloomcribsandmore.com">heirloomcribs.care@heirloomcribsandmore.com</a>
          </p>
        </div>
        {/* About has no photo (no Heirloom photos exist): contact card on the right. */}
        <div className="builder-panel">
          <div>
            <p style={{ margin: 0 }}>
              {`Phone: `}
              <a href="tel:+14842931840">(484) 293-1840</a>
            </p>
            <p style={{ margin: '8px 0 0' }}>
              {`Email: `}
              <a href="mailto:heirloomcribs.care@heirloomcribsandmore.com">heirloomcribs.care@heirloomcribsandmore.com</a>
            </p>
            <p style={{ margin: '8px 0 0' }}>{`Pennsylvania, New Jersey and Maryland`}</p>
          </div>
        </div>
      </header>

      <div className="doc-page">
        <hr className="doc-rule" />
        <section>
          <h2 className="headline-md">Who we are</h2>
          <p>{Q.q1}</p>
          <p>
            {`We don't build furniture. Old Town Oak, Fisher's Quality Products and Kids Comfort do, and we resell their work. Everything between you and the workshop is ours: the questions before you order, the confirmation call, the invoice, the delivery and any damage claim after your furniture arrives.`}
          </p>
        </section>

        <section>
          <h2 className="headline-md" id="how-an-order-works">How an order works</h2>
          <p>
            {`Every piece is made to order. Placing an order is a commitment, not a charge: nothing is billed until we've checked the details with you, and nothing is built until the deposit is in.`}
          </p>
          <ol>
            <li>
              <strong>You choose.</strong>{` Pick the piece, then the wood and stain where the product page offers them, and place the order. No card is taken at checkout.`}
            </li>
            <li>
              <strong>We call you.</strong>{` We read the order and call to confirm the stain, the kit list and the delivery before anything is built.`}
            </li>
            <li>
              <strong>You pay a 50% deposit.</strong>{` We send a secure Stripe invoice. You can pay by credit card or Affirm.`}
            </li>
            <li>
              <strong>The builder makes it.</strong>{` Once the deposit is in, we place the order with the builder and the build starts. Our current estimates are about 6 to 8 weeks for Old Town Oak, about 8 weeks for Kids Comfort and 10 to 14 weeks for Fisher's. We confirm yours when you order.`}
            </li>
            <li>
              <strong>We schedule delivery.</strong>{` When your furniture is ready, we contact you to set a delivery date. The balance is paid before we schedule final delivery.`}
            </li>
          </ol>
          <div style={{ background: 'rgba(200,179,167,0.45)', borderRadius: 8, padding: '16px 20px' }}>
            <p style={{ margin: 0 }}>
              {`Until the deposit is paid, you can cancel at no cost. Just tell us in writing. Once it's paid, the order is with the builder: it can't be cancelled, the deposit is non-refundable, and made-to-order furniture can't be returned. The full terms are on `}
              <Link href="/returns" className="doc-link">Returns, Cancellations &amp; Refunds</Link>
              {` and `}
              <Link href="/terms" className="doc-link">Terms of Sale</Link>
              {`.`}
            </p>
          </div>
        </section>

        <section>
          <h2 className="headline-md">Delivery</h2>
          <p>
            {`Orders ship from ${Q.q5} with our professional furniture delivery partner, blanket-wrapped and strapped in transit. We deliver in Pennsylvania, New Jersey and Maryland. Some North Jersey ZIP codes are outside our area, so confirm yours with us.`}
          </p>
          <p>{`You choose one of two services:`}</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
            <div style={{ flex: '1 1 260px', border: '1px solid #C8CEC6', borderRadius: 8, padding: '16px 20px' }}>
              <h3>Curbside</h3>
              <p style={{ marginBottom: 0 }}>
                {`A one-person crew brings the furniture to the curb at your address. Someone there needs to help unload it and carry it inside. Curbside does not include unpacking, assembly or placement.`}
              </p>
            </div>
            <div style={{ flex: '1 1 260px', border: '1px solid #C8CEC6', borderRadius: 8, padding: '16px 20px' }}>
              <h3>White Glove</h3>
              <p style={{ marginBottom: 0 }}>
                {`A two-person crew brings the furniture into your home, unpacks it, assembles it, sets each piece where you want it and takes the packing away. Up to 3 flights of stairs are included. `}
                <strong>White Glove is the only service that includes assembly.</strong>
              </p>
            </div>
          </div>
          <p>
            {`Shipping is charged on every order, based on your cart subtotal. Under $2,500, Curbside is $175 and White Glove is $299. The full table is on our `}
            <Link href="/shipping" className="doc-link">Delivery</Link>
            {` page.`}
          </p>
        </section>

        <section>
          <h2 className="headline-md">If something arrives damaged</h2>
          <p>
            {`Check the furniture before the driver leaves, and note any visible damage on the delivery receipt when you sign it. If you find hidden damage later, tell us in writing within 5 business days. We arrange the repair or replacement with the builder and handle the claim with the carrier, so you aren't chasing anyone.`}
          </p>
          <p>{`The builder's warranty passes through to you.`}</p>
        </section>

        <section>
          <h2 className="headline-md">The builders we resell</h2>
          <p>{`Each builder runs its own shop. Here are a few details. Words in quotation marks are the builders' own.`}</p>
          <ul>
            <li>
              <Link href="/builders/old-town-oak" className="doc-link">Old Town Oak</Link>
              {` says in its 2026 catalog that it has been in business for 21 years. The catalog describes cribs with mortise and tenon joints and steel inserts and dressers with dovetail drawer boxes, and says "every piece is signed by the artisan, Marlin Miller."`}
            </li>
            <li>
              <Link href="/builders/fishers-quality-products" className="doc-link">Fisher's Quality Products</Link>
              {` describes itself as family-owned. It "started very small out of our home shop, manufacturing just one line of cribs in 2010," and now makes convertible cribs, changing tables, chests and nightstands.`}
            </li>
            <li>
              <Link href="/builders/kids-comfort" className="doc-link">Kids Comfort</Link>
              {` is Joe Troyer's shop in Sugarcreek, Ohio. ${Q.q8KidsComfort}`}
            </li>
          </ul>
          <p>
            {`${Q.q4} All three describe their cribs as convertible, so a crib can keep working as your child grows. On most cribs, conversion rail kits are sold separately. Wood and stain choices are explained on `}
            <Link href="/woods-and-finishes" className="doc-link">Woods and finishes</Link>
            {`.`}
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 16 }}>
            <Link href="/builders/old-town-oak" style={{ flex: '1 1 220px', textDecoration: 'none', maxWidth: 400 }}>
              {/* eslint-disable-next-line @next/next/no-img-element -- tile reuses the 1200x1000 West Lake chest crop, downscaled to <=400 CSS px. */}
              <img
                src="/images/builders/oto-west-lake-chest-desktop.jpg"
                alt="Old Town Oak West Lake chest with six drawers, arched base and metal pulls, in a golden-brown finish"
                width={1200}
                height={1000}
                style={{ width: '100%', height: 'auto', maxWidth: 400, display: 'block', borderRadius: 8 }}
              />
              <span className="label-caps">Old Town Oak</span>
            </Link>
            <div style={{ flex: '1 1 220px', background: '#C8CEC6', borderRadius: 8, padding: '24px 20px', maxWidth: 400 }}>
              <Link href="/builders/fishers-quality-products" className="doc-link"><strong>Fisher's Quality Products</strong></Link>
              <p style={{ margin: '8px 0 0' }}>{`Family-owned`}</p>
            </div>
            <div style={{ flex: '1 1 220px', background: '#C8CEC6', borderRadius: 8, padding: '24px 20px', maxWidth: 400 }}>
              <Link href="/builders/kids-comfort" className="doc-link"><strong>Kids Comfort</strong></Link>
              <p style={{ margin: '8px 0 0' }}>{`Available on request`}</p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="headline-md">Help before you order</h2>
          <p>
            {`Use Get Personal Assistance if you're between two cribs or unsure which stain suits the room. Tell us the style you like, your finish ideas, your ZIP code and your timing, and send inspiration photos if you have them. A real person follows up with options. We reply the same or next business day.`}
          </p>
          <p>{`Gift orders are arranged by hand. Call or email us and we'll set it up.`}</p>
          <p>{Q.q7Babylist}</p>
        </section>

        <section>
          <h2 className="headline-md">Talk to us</h2>
          <p>
            <Link href="/contact" className="doc-link">Get Personal Assistance</Link>
          </p>
          <p style={{ margin: 0 }}>
            {`Phone: `}
            <a href="tel:+14842931840" className="doc-link">(484) 293-1840</a>
          </p>
          <p style={{ margin: '4px 0 0' }}>
            {`Email: `}
            <a href="mailto:heirloomcribs.care@heirloomcribsandmore.com" className="doc-link">
              heirloomcribs.care@heirloomcribsandmore.com
            </a>
          </p>
        </section>
      </div>
    </div>
  );
}
