import type { Metadata } from 'next';
import Link from 'next/link';

// Q#-dependent copy, one place each (FQP: Q4, Q7).
const Q = {
  q4: `Fisher's is one of three builders Heirloom resells. We introduce it here in its own words.`,
  q7: `For a Fisher's wood, stain or hardware choice that isn't on our product pages, contact us with what you have in mind.`,
};

export const metadata: Metadata = {
  title: "Fisher's Quality Products Cribs | Heirloom Cribs & More",
  description:
    "Fisher's Quality Products, a shop that describes itself as family-owned, makes convertible cribs and changing tables. Read its story and order with us.",
  alternates: { canonical: '/builders/fishers-quality-products' },
  openGraph: { url: '/builders/fishers-quality-products' },
};

export default function FishersQualityProductsPage() {
  return (
    <div className="container">
      <header className="builder-header">
        <div className="builder-header__text">
          <p className="label-caps text-on-surface-variant">Our builders</p>
          <h1 className="headline-xl">Fisher's Quality Products</h1>
          <p className="body-lg builder-header__sub">
            {`A shop that describes itself as family-owned, which began with one line of cribs in 2010 and now makes convertible cribs, changing tables, chests and nightstands. You order through Heirloom Cribs & More, and we handle everything from the confirmation call to delivery day.`}
          </p>
          <Link href="/contact" className="button-primary">Get Personal Assistance</Link>
          <p className="builder-header__contact">
            <a href="tel:+14842931840">(484) 293-1840</a>
            {` · `}
            <a href="mailto:heirloomcribs.care@heirloomcribsandmore.com">heirloomcribs.care@heirloomcribsandmore.com</a>
          </p>
        </div>
        {/* Photo gate: the FQF-107MA header photo ships only after the /product/changing-table-6-drawer image swap. Until then, a text panel. */}
        <div className="builder-panel">
          <blockquote>
            <p>{`"We started very small out of our home shop, manufacturing just one line of cribs in 2010."`}</p>
            <cite>{`Fisher's Quality Products`}</cite>
          </blockquote>
        </div>
      </header>

      <div className="doc-page">
        <hr className="doc-rule" />
        <section>
          <h2 className="headline-md">How Fisher's started</h2>
          <p>{`Fisher's describes itself as "a family-owned business." This is how it began:`}</p>
          <blockquote>
            <p>{`"While working for a local woodshop for over 10 years, we noticed an increased demand for cribs coming into the shop."`}</p>
          </blockquote>
          <blockquote>
            <p>
              {`"So, owner Joseph Fisher decided to start his own business … We started very small out of our home shop, manufacturing just one line of cribs in 2010. We have worked our way up to manufacturing a full line of convertible cribs, convertible changing tables, chests of drawers, and night stands."`}
            </p>
            <cite>{`Fisher's Quality Products, from its profile on All American Wholesalers`}</cite>
          </blockquote>
          <p>{`Fisher's business address is in Quarryville, Pennsylvania.`}</p>
          <p>{Q.q4}</p>
        </section>

        <section>
          <h2 className="headline-md">Built to change with your child</h2>
          <p>
            {`Fisher's states: "We know how difficult and expensive it can be to transition children from cribs, to toddler beds, to day beds, to full sized beds, so we make it easy."`}
          </p>
          <p>{`Its conversion kits, as Fisher's describes them:`}</p>
          <ul>
            <li>{`"Toddler Bed/Day Bed Conversion Kits include day bed frame, toddler bed rail, and hardware"`}</li>
            <li>{`"Our Full Size Bed Conversion Kit includes bed rails, slats, and hardware"`}</li>
          </ul>
          <p>{`Its catalog marks these "Conversions Sold Separately." Fisher's also says its changing tables have a removable top, so they can later be used as dressers.`}</p>
        </section>

        <section>
          <h2 className="headline-md">Woods and finishes</h2>
          <p>
            {`On our site, Fisher's cribs are listed in brown maple, with eleven stains to choose from: Antique Slate, Driftwood, Frost, Fruitwood, Harvest, MX, Natural, Provincial, Seely, Smoke and Washington.`}
          </p>
          <p>
            {`Fisher's catalog shows pieces in Tundra, Antique Slate, Asbury, Husk and "341 White Paint," and tells buyers to "Ask About Our Stain Color & Hardware Choices."`}
          </p>
          <p>
            {`${Q.q7} More on how woods and stains work: `}
            <Link href="/woods-and-finishes" className="doc-link">Woods and finishes</Link>
            {`.`}
          </p>
        </section>

        <section>
          <h2 className="headline-md">Fisher's pieces on our site</h2>
          <p>{`Seven cribs:`}</p>
          <p>
            <Link href="/product/arched-top" className="doc-link">Arched Top</Link>{` · `}
            <Link href="/product/bloomington" className="doc-link">Bloomington</Link>{` · `}
            <Link href="/product/darlington" className="doc-link">Darlington</Link>{` · `}
            <Link href="/product/hudson" className="doc-link">Hudson</Link>{` · `}
            <Link href="/product/mission" className="doc-link">Mission</Link>{` · `}
            <Link href="/product/moyerton" className="doc-link">Moyerton</Link>{` · `}
            <Link href="/product/princeton" className="doc-link">Princeton</Link>
          </p>
          <p>{`Two case pieces:`}</p>
          <p>
            <Link href="/product/changing-table-6-drawer" className="doc-link">6-drawer changing table</Link>{` · `}
            <Link href="/product/nightstand-2-drawer" className="doc-link">2-drawer nightstand</Link>
          </p>
          <p>
            {`Fisher's lead time is 10 to 14 weeks, the longest of our three builders, and we confirm it when you order. If you're working toward a due date, tell us your target month through Get Personal Assistance before you order.`}
          </p>
        </section>

        <section>
          <h2 className="headline-md">What we handle on a Fisher's order</h2>
          <ul>
            <li>{`We read your order and call to confirm the stain, the kit list and the delivery. Nothing is charged until you pay the deposit invoice.`}</li>
            <li>{`We send a Stripe invoice for the 50% deposit. Once it's paid, we place the order with Fisher's and the build starts.`}</li>
            <li>
              {`When your furniture is ready, we contact you to schedule delivery. Curbside brings it to the curb; White Glove brings it in and assembles it. Shipping is charged by cart subtotal; see `}
              <Link href="/shipping" className="doc-link">Delivery</Link>
              {`.`}
            </li>
            <li>{`If anything arrives damaged, we arrange the repair or replacement with Fisher's and handle the carrier claim.`}</li>
          </ul>
          <p>
            {`The full order steps are on `}
            <Link href="/about-heirloom#how-an-order-works" className="doc-link">About Heirloom</Link>
            {`.`}
          </p>
          <p>
            <Link href="/contact" className="doc-link">Get Personal Assistance</Link>
            {` · `}
            <a href="tel:+14842931840" className="doc-link">(484) 293-1840</a>
            {` · `}
            <a href="mailto:heirloomcribs.care@heirloomcribsandmore.com" className="doc-link">heirloomcribs.care@heirloomcribsandmore.com</a>
          </p>
        </section>
      </div>
    </div>
  );
}
