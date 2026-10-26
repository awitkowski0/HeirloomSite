import type { Metadata } from 'next';
import Link from 'next/link';

// Q#-dependent copy, one place each (KC: Q4, Q7, Q8 sub-headline, Q8 ordering).
const Q = {
  q4: `Kids Comfort is one of three builders Heirloom resells. We introduce it here in its own words.`,
  q7: `To ask about the organic finish on a Kids Comfort piece, contact us.`,
  q8Sub: `Kids Comfort pieces aren't listed on our site yet, so there are no prices here. They are available on request through Heirloom Cribs & More.`,
  q8Order: `Tell us which pieces, wood and finish you're interested in, and a real person on our team follows up with options.`,
};

const KC_STAINS = `OCS-100 natural · 101 S-2 · 102 fruitwood · 103 M-X · 104 seely · 106 acres · 107 washington · 110 medium · 111 boston · 112 provincial · 113 michael's · 116 harvest · 117 asbury · 118 antique slate · 119 cappuccino · 121 smoke · 122 cocoa · 131 frost · 132 sand · 133 tundra · 134 argos · 135 driftwood · 226 coffee · 227 rich cherry · 228 rich tobacco · 230 onyx`;
const KC_PAINTS = `Antique White · Black · Celery · Chelsea Grey · Country White · Decorator White · Georgian · Glacier · Grey Sky · Metropolitan · Millington Gold · Panda White · Pearl · Regal Blue · Sand Dollar · White`;

export const metadata: Metadata = {
  title: 'Kids Comfort Cribs & Furniture | Heirloom Cribs & More',
  description:
    'Kids Comfort, a Sugarcreek, Ohio shop, offers cribs and children\'s furniture, with an organic finish option. Available on request from Heirloom Cribs & More.',
  alternates: { canonical: '/builders/kids-comfort' },
  openGraph: { url: '/builders/kids-comfort' },
};

export default function KidsComfortPage() {
  return (
    <div className="container doc-page">
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'flex-start' }}>
        <div style={{ flex: '1 1 320px' }}>
          <p className="label-caps text-on-surface-variant">Our builders</p>
          <h1 className="headline-xl">Kids Comfort</h1>
          <p className="body-lg doc-lede">
            {`Kids Comfort is Joe Troyer's shop in Sugarcreek, Ohio. Its cribs and furniture are meant to follow a child from baby to teenager. ${Q.q8Sub}`}
          </p>
          <p>
            <Link href="/contact" className="doc-link">Get Personal Assistance</Link>
          </p>
        </div>
        <div style={{ flex: '1 1 320px', maxWidth: 600, background: '#C8CEC6', borderRadius: 8, padding: '32px 28px', display: 'flex', alignItems: 'center' }}>
          <blockquote style={{ margin: 0 }}>
            <p className="body-lg">{`"We are real people that answer our phone and personally work with you to accomplish your goals."`}</p>
            <cite>{`Joe Troyer, Kids Comfort catalog, January 2023`}</cite>
          </blockquote>
        </div>
      </div>

      <hr className="doc-rule" />
      <section>
        <h2 className="headline-md">In Joe Troyer's words</h2>
        <p>{`Kids Comfort's catalog carries a letter from its owner headed "To Our Customers." Here are two passages from it:`}</p>
        <blockquote>
          <p>
            {`"We are real people that answer our phone and personally work with you to accomplish your goals. Our objective is to treat our customers the way we expect to be treated and give nothing but complete satisfaction."`}
          </p>
        </blockquote>
        <blockquote>
          <p>{`"As the owner of Kids Comfort … we realize the importance of quality, safety, endurance, and service. In closing my goal is to serve you."`}</p>
          <cite>{`Joe Troyer, owner, Kids Comfort catalog, January 2023`}</cite>
        </blockquote>
        <p>{Q.q4}</p>
      </section>

      <section>
        <h2 className="headline-md">From crib to teenager</h2>
        <p>
          {`The cover of the Kids Comfort catalog puts the idea in one line: "Our transitional furniture will match your child's progressive growth phases, from baby… to toddler… to teenager."`}
        </p>
      </section>

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
        <h2 className="headline-md">Woods and finishes</h2>
        <p>
          <strong>Woods.</strong>
          {` Kids Comfort's catalog says the Haven style "is popular in brown maple wood but also available in any other native wood species." None of these woods are listed on our site yet.`}
        </p>
        <p>
          <strong>Stains.</strong>
          {` The stain sample pages in the January 2023 catalog show 26 Ohio Certified Stains:`}
        </p>
        <p>{KC_STAINS}</p>
        <p>
          <strong>Paints.</strong>
          {` The same catalog shows 16 paints: `}
          {KC_PAINTS}
          {`.`}
        </p>
        <p>{`Screens and printed pages shift color. The catalog says "we recommend using wood samples to select your stain."`}</p>
        <p>
          <strong>Custom work.</strong>
          {` The catalog lists "Custom sizes · Custom furniture · Custom Colors · Custom Hardware · Organic Finish · Organic Construction" as options, with one firm limit: "*Due to federal standards, customization on cribs is not available."`}
        </p>
        <p>
          {`More on how woods and stains work: `}
          <Link href="/woods-and-finishes" className="doc-link">Woods and finishes</Link>
          {`.`}
        </p>
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
          <a href="mailto:heirloomcribs.care@heirloomcribsandmore.com" className="doc-link">heirloomcribs.care@heirloomcribsandmore.com</a>
        </p>
      </section>
    </div>
  );
}
