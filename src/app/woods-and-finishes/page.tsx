import type { Metadata } from 'next';
import Link from 'next/link';

// Q#-dependent copy, one place each (Woods: Q7 x3 blocks, Q8 KC range).
const Q = {
  q7Lists: `For a wood or finish from these lists that isn't on our product pages, contact us with what you have in mind.`,
  q7Designer: `Interior designers, and families working with one, can contact us with the full vision for a custom order: the pieces, the wood, the finish and the room it's going into. A real person follows up with options.`,
  q7Babylist: `Pieces on our site can be added to a Babylist registry, and we can also create a custom order that can be added to your personal Babylist registry.`,
  q8Kc: `Kids Comfort pieces aren't listed on our site yet; they are available on request.`,
};

const OTO_FINISHES = `FC Almond · Shadow FC24427 · Tavern · Golden Brown · Michael's Cherry Low Sheen · FC 30529 · Sealy · Cappuccino · Summit Path · Rich Tobacco · Kona · Oatmilk · Granola · FC 19093 Dark Knight · Butter · S-14 Medium Cherry · OCS-113 Michael's Cherry · Hoosier Special · Harvest · FC19852 Antique Slate · FC Carbon · Amber · Earthtone FC40592 · RR-003 Bernett Slate Paint / Glaze · Muted Gray · Limed Oak · 922 Sealy · 7992 Sealy · 7992 Asbury Brown · 5190 Old World Mission`;
const KC_STAINS = `OCS-100 natural · 101 S-2 · 102 fruitwood · 103 M-X · 104 seely · 106 acres · 107 washington · 110 medium · 111 boston · 112 provincial · 113 michael's · 116 harvest · 117 asbury · 118 antique slate · 119 cappuccino · 121 smoke · 122 cocoa · 131 frost · 132 sand · 133 tundra · 134 argos · 135 driftwood · 226 coffee · 227 rich cherry · 228 rich tobacco · 230 onyx`;
const KC_PAINTS = `Antique White · Black · Celery · Chelsea Grey · Country White · Decorator White · Georgian · Glacier · Grey Sky · Metropolitan · Millington Gold · Panda White · Pearl · Regal Blue · Sand Dollar · White`;

export const metadata: Metadata = {
  title: { absolute: 'Woods and Finishes | Heirloom Cribs & More' },
  description:
    "Our cribs are listed in brown maple with a choice of stains. Our builders' catalogs show many more woods and finishes. Here they are, builder by builder.",
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
            {`On our site, cribs are listed in brown maple with a choice of stains. Our builders' catalogs show many more woods and finishes. This page lays them out, builder by builder.`}
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
            <strong>Old Town Oak cribs, in brown maple:</strong>
            {` Natural, Almond, Asbury Brown, Carbon, Earthtone, Ebony, Harvest, Manchester, Michaels Cherry, Sandstone.`}
          </p>
          <p>
            <strong>Fisher's cribs, in brown maple:</strong>
            {` Antique Slate, Driftwood, Frost, Fruitwood, Harvest, MX, Natural, Provincial, Seely, Smoke, Washington.`}
          </p>
          <p>{`Most dressers, chests and nightstands are listed in the finish shown on their page.`}</p>
          <p>{`Screens and printed pages shift color. Kids Comfort's catalog says "we recommend using wood samples to select your stain."`}</p>
        </section>

        <section>
          <h2 className="headline-md">Each builder's catalog range</h2>
          <p>
            {`Cherry, red oak and the other woods below are not listed on our site. They are here so you can see what each builder's own catalog shows, in the builder's own words and spellings.`}
          </p>

          <h3>Old Town Oak</h3>
          <p>
            <strong>Woods named in its 2026 catalog:</strong>
            {` "Sap Cherry, Cherry, Red Oak, Brown Soft Maple, White Oak Quartersawn, and Grey Elm."`}
          </p>
          <p>
            <strong>Finishes shown in its 2026 catalog:</strong>
            {` `}
            {OTO_FINISHES}
          </p>
          <p><Link href="/builders/old-town-oak" className="doc-link">Old Town Oak builder page</Link></p>

          <h3>Fisher's Quality Products</h3>
          <p>
            <strong>Finishes shown in its catalog:</strong>
            {` Tundra, Antique Slate, Asbury, Husk and "341 White Paint." The catalog also says "Ask About Our Stain Color & Hardware Choices."`}
          </p>
          <p><Link href="/builders/fishers-quality-products" className="doc-link">Fisher's Quality Products builder page</Link></p>

          <h3>Kids Comfort</h3>
          <p>{Q.q8Kc}</p>
          <p>
            <strong>Woods:</strong>
            {` its catalog says the Haven style "is popular in brown maple wood but also available in any other native wood species."`}
          </p>
          <p>
            <strong>Stains, from the January 2023 catalog (26 Ohio Certified Stains):</strong>
            {` `}
            {KC_STAINS}
          </p>
          <p>
            <strong>Paints, from the January 2023 catalog:</strong>
            {` `}
            {KC_PAINTS}
          </p>
          <p>
            <strong>Organic finish:</strong>
            {` Kids Comfort offers an organic option it calls Kid's Comfort Organic. Its own description, with what it says about the glue, is on its builder page.`}
          </p>
          <p><Link href="/builders/kids-comfort" className="doc-link">Kids Comfort builder page</Link></p>
        </section>

        <section>
          <h2 className="headline-md">What builders don't change</h2>
          <div style={{ background: 'rgba(200,179,167,0.45)', borderRadius: 8, padding: '16px 20px' }}>
            <p style={{ margin: 0 }}>{`Kids Comfort's catalog says: "*Due to federal standards, customization on cribs is not available."`}</p>
          </div>
          <p>{Q.q7Lists}</p>
        </section>

        <section>
          <h2 className="headline-md">Matching a room you've already planned</h2>
          <p>
            {`If you have a nursery in your head or on a mood board, tell us about it. Use Get Personal Assistance to share inspiration photos, the style you like, your finish ideas, your ZIP code and your timing. A real person follows up with options. We reply the same or next business day.`}
          </p>
        </section>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
          <section style={{ flex: '1 1 300px', border: '1px solid #C8CEC6', borderRadius: 8, padding: '16px 20px' }}>
            <h3>Working with a designer</h3>
            <p style={{ marginBottom: 0 }}>{Q.q7Designer}</p>
          </section>
          <section style={{ flex: '1 1 300px', border: '1px solid #C8CEC6', borderRadius: 8, padding: '16px 20px' }}>
            <h3 id="babylist">Babylist</h3>
            <p style={{ marginBottom: 0 }}>{Q.q7Babylist}</p>
          </section>
        </div>

        <p style={{ marginTop: 24 }}>
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
