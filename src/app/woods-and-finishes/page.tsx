import type { Metadata } from 'next';
import Link from 'next/link';

// Q#-dependent copy, one place each (Woods: Q7 x3 blocks, Q8 KC range).
const Q = {
  q7Lists: `For a wood or finish from these lists that isn't on our product pages, contact us with what you have in mind.`,
  q7Designer: `Interior designers, and families working with one, can contact us with the full vision for a custom order: the pieces, the wood, the finish, and the room it's going into. A real person follows up with options.`,
  q7Babylist: `Pieces on our site can be added to a Babylist registry, and we can also create a custom order that can be added to your personal Babylist registry.`,
  q8Kc: `Kids Comfort pieces aren't listed on our site yet; they are available on request.`,
};

export const metadata: Metadata = {
  title: { absolute: 'Woods and Finishes | Heirloom Cribs & More' },
  description:
    "Our cribs are listed in brown maple with a choice of stains. Other woods and finishes are available by request.",
  alternates: { canonical: '/woods-and-finishes' },
  openGraph: { title: 'Woods and Finishes | Heirloom Cribs & More', url: '/woods-and-finishes' },
  twitter: { title: 'Woods and Finishes | Heirloom Cribs & More' },
};

export default function WoodsAndFinishesPage() {
  return (
    <div className="container">
      <header className="builder-header">
        <div className="builder-header__text">
          <p className="label-caps text-on-surface-variant">Woods and finishes</p>
          <h1 className="headline-xl">Woods and finishes</h1>
          <p className="body-lg builder-header__sub">
            {`Our cribs are listed in brown maple with a choice of stains. Other woods and finishes are available by request.`}
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
            <source media="(max-width: 899px)" srcSet="/images/builders/woods-mackenzie-chest-mobile.jpg" width={800} height={1000} />
            <img
              src="/images/builders/woods-mackenzie-chest-desktop.jpg"
              alt="Old Town Oak Mackenzie chest with six drawers in brown maple, finished in a soft taupe-brown stain"
              width={1200}
              height={1000}
            />
          </picture>
          <figcaption className="label-caps">
            <Link href="/product/mackenzie-chest" className="doc-link">Mackenzie chest by Old Town Oak, in brown maple</Link>
          </figcaption>
        </figure>
      </header>

      <div className="doc-page">
        <hr className="doc-rule" />
        <section>
          <h2 className="headline-md">Brown maple</h2>
          <p>
            {`Brown maple is the wood we list on this site. Kids Comfort's catalog names brown maple; Old Town Oak's lists "Brown Soft Maple"; Fisher's catalog shows its pieces in "Maple Wood."`}
          </p>
          <p>
            {`The stain is the color you pick, and brown maple is the wood under it. If you're matching a room or an existing piece, ask us before you order.`}
          </p>
        </section>

        <section>
          <h2 className="headline-md">Stains you can pick on our site</h2>
          <p>
            <strong><Link href="/builders/old-town-oak" className="builder-name">Old Town Oak</Link> cribs, in brown maple:</strong>
            {` Natural, Almond, Asbury Brown, Carbon, Earthtone, Ebony, Harvest, Manchester, Michaels Cherry, Sandstone.`}
          </p>
          <p>
            <strong><Link href="/builders/fishers-quality-products" className="builder-name">Fisher's</Link> cribs, in brown maple:</strong>
            {` Antique Slate, Driftwood, Frost, Fruitwood, Harvest, MX, Natural, Provincial, Seely, Smoke, Washington.`}
          </p>
          <p>{`Most dressers, chests and nightstands are listed in the finish shown on their page.`}</p>
          <p>{`Screens and printed pages shift color. Kids Comfort's catalog says "we recommend using wood samples to select your stain."`}</p>
        </section>

        <section>
          <h2 className="headline-md">Other woods and finishes</h2>
          <p>
            {`Our builders can work in other woods and finishes. Tell us what you have in mind and we'll check with them. `}
            <Link href="/contact" className="doc-link">Contact us</Link>
            {`.`}
          </p>
          <p>{Q.q8Kc}</p>
        </section>

        <section>
          <h2 className="headline-md">What builders don't change</h2>
          <div className="builder-note">
            <p>{`Kids Comfort's catalog says: "*Due to federal standards, customization on cribs is not available."`}</p>
          </div>
          <p>{Q.q7Lists}</p>
        </section>

        <section>
          <h2 className="headline-md">Matching a room you've already planned</h2>
          <p>
            {`If you have a nursery in your head or on a mood board, tell us about it. Use Get Personal Assistance to share inspiration photos, the style you like, your finish ideas, your ZIP code, and your timing. A real person follows up with options. We reply the same or next business day.`}
          </p>
        </section>

        <div className="builder-cards">
          <section className="builder-card">
            <h3>Working with a designer</h3>
            <p>{Q.q7Designer}</p>
          </section>
          <section className="builder-card">
            <h3 id="babylist">Babylist</h3>
            <p>{Q.q7Babylist}</p>
          </section>
        </div>

        <p className="builder-contact-row">
          <Link href="/contact" className="doc-link">Get Personal Assistance</Link>
          {` · `}
          <a href="tel:+14842931840" className="doc-link">(484) 293-1840</a>
          {` · `}
          <a href="mailto:heirloomcribs.care@heirloomcribsandmore.com" className="doc-link">heirloomcribs.care@heirloomcribsandmore.com</a>
        </p>
      </div>
    </div>
  );
}
