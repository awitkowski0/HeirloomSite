import type { Metadata } from 'next';
import Link from 'next/link';

// Q#-dependent copy, one place each (OTO: Q4, Q7).
const Q = {
  q4: `Old Town Oak is one of three builders Heirloom resells. We introduce it here in its own words.`,
  q7: `For an Old Town Oak wood or finish that isn't on our product pages, contact us with what you have in mind.`,
};

const OTO_FINISHES = `FC Almond · Shadow FC24427 · Tavern · Golden Brown · Michael's Cherry Low Sheen · FC 30529 · Sealy · Cappuccino · Summit Path · Rich Tobacco · Kona · Oatmilk · Granola · FC 19093 Dark Knight · Butter · S-14 Medium Cherry · OCS-113 Michael's Cherry · Hoosier Special · Harvest · FC19852 Antique Slate · FC Carbon · Amber · Earthtone FC40592 · RR-003 Bernett Slate Paint / Glaze · Muted Gray · Limed Oak · 922 Sealy · 7992 Sealy · 7992 Asbury Brown · 5190 Old World Mission`;

export const metadata: Metadata = {
  title: 'Old Town Oak Cribs & Dressers | Heirloom Cribs & More',
  description:
    'Old Town Oak makes cribs and dressers. Read its own words on construction and safety, see its woods and finishes, then order through us.',
  alternates: { canonical: '/builders/old-town-oak' },
  openGraph: { url: '/builders/old-town-oak' },
};

export default function OldTownOakPage() {
  return (
    <div className="container">
      <header className="builder-header">
        <div className="builder-header__text">
          <p className="label-caps text-on-surface-variant">Our builders</p>
          <h1 className="headline-xl">Old Town Oak</h1>
          <p className="body-lg builder-header__sub">
            {`A furniture business in Topeka, Indiana, that specializes in baby furniture. Its 2026 catalog says it has been in business for 21 years. You order through Heirloom Cribs & More, and we handle the call, the invoice and the delivery.`}
          </p>
          <Link href="/contact" className="button-primary">Get Personal Assistance</Link>
          <p className="builder-header__contact">
            <a href="tel:+14842931840">(484) 293-1840</a>
            {` · `}
            <a href="mailto:heirloomcribs.care@heirloomcribsandmore.com">heirloomcribs.care@heirloomcribsandmore.com</a>
          </p>
        </div>
        <figure className="builder-header__media">
          <picture>
            <source media="(max-width: 899px)" srcSet="/images/builders/oto-west-lake-chest-mobile.jpg" width={800} height={1000} />
            <img
              src="/images/builders/oto-west-lake-chest-desktop.jpg"
              alt="Old Town Oak West Lake chest with six drawers, arched base and metal pulls, in a golden-brown finish"
              width={1200}
              height={1000}
            />
          </picture>
          <figcaption className="label-caps">
            <Link href="/product/west-lake-chest" className="doc-link">West Lake chest, Old Town Oak</Link>
          </figcaption>
        </figure>
      </header>

      <div className="doc-page">
        <hr className="doc-rule" />
        <section>
          <h2 className="headline-md">Who they are</h2>
          <p>
            {`Old Town Oak's catalog cover reads "Specializing in Baby Furniture." Its 2026 catalog says: "Having been in business for 21 years, we can offer you the quality cribs and dressers you expect and deserve."`}
          </p>
          <p>{Q.q4}</p>
        </section>

        <section>
          <h2 className="headline-md">How it's built</h2>
          <p>{`In Old Town Oak's words:`}</p>
          <blockquote>
            <p>
              {`"Our cribs are sturdy and durable with mortise and tenon joints and a substructure made of steel inserts and connector bolts. Our dressers feature dovetail wood drawer boxes and full extension slides, all features that make sure our baby furniture will stand the test of time."`}
            </p>
            <cite>{`Old Town Oak, 2026 catalog`}</cite>
          </blockquote>
          <blockquote>
            <p>
              {`"Tool and hardware kit comes standard attached to every crib spring with easy to read and understand instructions. Panels are specially marked for ease of assembly."`}
            </p>
            <cite>{`Old Town Oak, 2026 catalog`}</cite>
          </blockquote>
          <p>{`Each piece also carries a signature. In the catalog's words, "every piece is signed by the artisan, Marlin Miller."`}</p>
          <p>{`With Curbside delivery, you assemble the crib with that kit and the marked panels. White Glove delivery includes assembly.`}</p>
        </section>

        <section>
          <h2 className="headline-md">Crib, toddler bed, full bed</h2>
          <p>
            {`Old Town Oak states in its 2026 catalog: "Each crib is designed with a unique three stage system that adjusts with the age or size of your child. Use one piece of furniture for your child from newborn into adulthood."`}
          </p>
          <p>
            {`Its catalog calls the third stage a double bed; on our site it is the full bed. The toddler bed and the full bed rail kit are listed as separate pieces in the Addison, Mackenzie, Newport and West Lake collections.`}
          </p>
        </section>

        <section>
          <h2 className="headline-md">Safety and compliance, in Old Town Oak's words</h2>
          <p>
            {`The statements below are Old Town Oak's own, quoted from its 2026 catalog (PDF pages 3 and 4). Heirloom Cribs & More does not build furniture and makes no safety claims of its own.`}
          </p>
          <p>
            {`Old Town Oak states: "All cribs conform to Consumer Product Safety Commission (CPSC) 16CFR1219 and ASTM F1169-19 standards and are up to date with all regulations tested through certified third party labs."`}
          </p>
          <p>
            {`Old Town Oak states: "For the compliancy and safety sake for our customers and each and every one of us, we chose to use a rear mount interlock system along with counterweights as needed to be fully compliant while still maintaining a full extension drawer. Warning and extension labels are applied as needed. A General Certificate of Conformity is filed as we test each style per wood species."`}
          </p>
        </section>

        <section>
          <h2 className="headline-md">Woods and finishes</h2>
          <p>
            {`On our site, Old Town Oak cribs are listed in brown maple with ten stains: Natural, Almond, Asbury Brown, Carbon, Earthtone, Ebony, Harvest, Manchester, Michaels Cherry and Sandstone.`}
          </p>
          <p>
            {`The shop's own range is much wider. Its 2026 catalog names these woods: "Sap Cherry, Cherry, Red Oak, Brown Soft Maple, White Oak Quartersawn, and Grey Elm." Those other woods are not listed on our site.`}
          </p>
          <p>{`Old Town Oak's catalog shows these finishes. Our site lists the ten stains above.`}</p>
          <p>{OTO_FINISHES}</p>
          <p>
            {`${Q.q7} More on how woods and stains work: `}
            <Link href="/woods-and-finishes" className="doc-link">Woods and finishes</Link>
            {`.`}
          </p>
        </section>

        <section>
          <h2 className="headline-md">Old Town Oak on our site</h2>
          <p>{`Five collections, each with a crib, a dresser and a nightstand:`}</p>
          <ul>
            <li><Link href="/collections/addison" className="doc-link">Addison</Link></li>
            <li><Link href="/collections/french-country" className="doc-link">French Country</Link></li>
            <li><Link href="/collections/mackenzie" className="doc-link">Mackenzie</Link></li>
            <li>
              <Link href="/collections/newport" className="doc-link">Newport</Link>
              {`, including the `}
              <Link href="/product/mini-newport-with-mattress" className="doc-link">Mini Newport with Mattress</Link>
            </li>
            <li><Link href="/collections/west-lake" className="doc-link">West Lake</Link></li>
          </ul>
          <p>{`Lead time is about 6 to 8 weeks, confirmed when you order.`}</p>
        </section>

        <section>
          <h2 className="headline-md">What we handle on an Old Town Oak order</h2>
          <ul>
            <li>{`Before anything is built, we call to confirm your stain, the kit list and your delivery.`}</li>
            <li>{`We send a Stripe invoice for the 50% deposit. The build starts when the deposit is in.`}</li>
            <li>
              {`When the furniture is ready, we contact you to schedule delivery, Curbside or White Glove. Shipping is charged by cart subtotal; see `}
              <Link href="/shipping" className="doc-link">Delivery</Link>
              {`.`}
            </li>
            <li>{`If something arrives damaged, we arrange the repair or replacement with Old Town Oak and handle the carrier claim.`}</li>
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
