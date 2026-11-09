import type { Metadata } from 'next';
import Link from 'next/link';

// Q#-dependent copy, one place each (KC: Q4, Q7, Q8 sub-headline, Q8 ordering).
const Q = {
  q7: `To ask about the organic finish on a Kids Comfort piece, contact us.`,
  q8Sub: `Kids Comfort pieces aren't listed on our site yet, so there are no prices here. They are available on request through Heirloom Cribs & More.`,
  q8Order: `Tell us which pieces, wood and finish you're interested in, and a real person on our team follows up with options.`,
};

export const metadata: Metadata = {
  title: { absolute: 'Kids Comfort Cribs & Furniture | Heirloom Cribs & More' },
  description:
    'Kids Comfort, a Sugarcreek, Ohio shop, offers cribs and children\'s furniture, with an organic finish option. Available on request from Heirloom Cribs & More.',
  alternates: { canonical: '/builders/kids-comfort' },
  openGraph: { title: 'Kids Comfort Cribs & Furniture | Heirloom Cribs & More', url: '/builders/kids-comfort' },
  twitter: { title: 'Kids Comfort Cribs & Furniture | Heirloom Cribs & More' },
};

export default function KidsComfortPage() {
  return (
    <div className="container">
      <header className="builder-header">
        <div className="builder-header__text">
          <p className="label-caps text-on-surface-variant">Our builders</p>
          <h1 className="headline-xl">Kids Comfort</h1>
          <p className="body-lg builder-header__sub">
            {`Kids Comfort is Joe Troyer's shop in Sugarcreek, Ohio. Its cribs and furniture are meant to follow a child from baby to teenager. ${Q.q8Sub}`}
          </p>
          <Link href="/contact" className="button-primary">Get Personal Assistance</Link>
          <p className="builder-header__contact">
            <a href="tel:+14842931840">(484) 293-1840</a>
            {` · `}
            <a href="mailto:heirloomcribs.care@heirloomcribsandmore.com">heirloomcribs.care<wbr />@heirloomcribsandmore.com</a>
          </p>
        </div>
        {/* No clean, confirmed-real Kids Comfort photo on file (IMAGE-PICKS.md): owner-quote panel on the right. */}
        <div className="builder-panel">
          <blockquote>
            <p className="body-lg">{`"We are real people that answer our phone and personally work with you to accomplish your goals."`}</p>
            <cite>{`Joe Troyer, Kids Comfort catalog, January 2023`}</cite>
          </blockquote>
        </div>
      </header>

      <div className="doc-page">
        <hr className="doc-rule" />
        <section>
          <h2 className="headline-md">Safety and compliance, in Kids Comfort's words</h2>
          <p>
            {`The statements below are Kids Comfort's own, quoted from its January 2023 catalog. Heirloom Cribs & More does not build furniture and makes no safety claims of its own.`}
          </p>
          <p>{`Kids Comfort states: "As always all Kids Comfort cribs are fully convertible, and are tested and certified to CPSIA and ASTM federal standards."`}</p>
          <p>{`Kids Comfort states: "All furniture pieces come with a wall anchor to prevent tipping hazards in your nursery."`}</p>
          <p>{`Kids Comfort states: "All our standard products are created with child safe varnishes and meet ASTM standards and consumer safety product standards."`}</p>
        </section>

        <section>
          <h2 className="headline-md">The organic finish</h2>
          {/* PHIL-LOOK: health claim. The quote below contains "non toxic", "100% VOC free" and "food safe" in the builder's words. Phil sees this before it ships. Never repeat these words in Heirloom's voice, the meta, headings, alt text, the feed, Instagram or ads. */}
          <p>{`Kids Comfort offers an organic option it calls Kid's Comfort Organic. Kids Comfort's January 2023 catalog describes the finish this way:`}</p>
          <blockquote>
            <p>
              {`"Our Organic finish is a linseed oil derived from natural flaxseed. This product is non toxic, 100% VOC free, has no chemical driers, is non flammable, compostable, and environmentally & food safe. Two applications of this organic finish is hand rubbed onto raw wood, preserving the natural beauty and appearance of your furniture."`}
            </p>
          </blockquote>
          <p>{`The same catalog explains the glue it uses:`}</p>
          <blockquote>
            <p>
              {`"The glue used in assembling Kid's Comfort Organic products is not totally chemical free but it is water-based with a very low chemical content. The only reason we use this glue is lack of any organic wood glues. We are committed to upgrading as organic glues are developed."`}
            </p>
            <cite>{`Kids Comfort catalog, January 2023`}</cite>
          </blockquote>
          <p>{Q.q7}</p>
        </section>

        <section>
          <h2 className="headline-md">Ordering Kids Comfort through Heirloom</h2>
          <p>{Q.q8Order}</p>
          <p>
            {`Our `}
            <Link href="/shipping" className="doc-link">Delivery</Link>
            {` page lists Kids Comfort's lead time as about 8 weeks, confirmed when you order. From there, it works like every order with us: a confirmation call, a Stripe invoice for the 50% deposit, the build, then delivery. Shipping is charged by cart subtotal, and only White Glove includes assembly. The steps are on `}
            <Link href="/about-heirloom#how-an-order-works" className="doc-link">About Heirloom</Link>
            {`.`}
          </p>
          <p>
            <Link href="/contact" className="doc-link">Get Personal Assistance</Link>
            {` · `}
            <a href="tel:+14842931840" className="doc-link">(484) 293-1840</a>
            {` · `}
            <a href="mailto:heirloomcribs.care@heirloomcribsandmore.com" className="doc-link">heirloomcribs.care<wbr />@heirloomcribsandmore.com</a>
          </p>
        </section>
      </div>
    </div>
  );
}
