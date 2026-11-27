import type { Metadata } from 'next';
import Link from 'next/link';

/*
 * Brand v2 final copy from Pricing App #51 comment 6992083992
 * (CoS QC PASS), applied verbatim except [builder-quote] review tags
 * which were stripped. Typographic quotes and the two curly apostrophes
 * inside those builder quotes are kept.
 *
 * Hero: existing Old Town Oak Spectrum Finishing Brown Maple Harvest
 * swatch (1000x1000), copied byte-for-byte from the stain-swatch set
 * documented in knowledge/facts/stains.md. SCRAPE-IMG-1 does not name
 * a filesystem path; this is an existing supplier/builder finish
 * close-up we already have, not an AI or stock image and not a
 * Newport HOLD stain.
 */
const PATH = '/guides/how-to-clean-a-wooden-crib';
const TITLE = 'How to Clean a Wooden Crib';
const DESCRIPTION =
  "Dust, then wipe with a damp cloth and mild soap. See what Old Town Oak, Fisher's and Kids Comfort say in their crib instructions.";
const HERO_SRC = '/images/guides/how-to-clean-a-wooden-crib/brown-maple-harvest-finish.jpg';
const HERO_ALT =
  'Close-up of brown maple with a Harvest finish, showing the wood grain and sheen';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PATH },
  openGraph: {
    title: `${TITLE} | Heirloom Cribs & More`,
    description: DESCRIPTION,
    url: PATH,
    type: 'article',
    images: [{ url: HERO_SRC, width: 1000, height: 1000, alt: HERO_ALT }],
  },
};

export default function HowToCleanAWoodenCribPage() {
  return (
    <div className="container doc-page">
      <p className="label-caps text-on-surface-variant">Owner&rsquo;s guide</p>
      <h1 className="headline-xl">How to Clean a Wooden Crib</h1>
      <figure className="doc-hero">
        {/* eslint-disable-next-line @next/next/no-img-element -- serve the original 1000x1000 finish close-up as-is, not recompressed. */}
        <img src={HERO_SRC} alt={HERO_ALT} width={1000} height={1000} />
      </figure>
      <p className="body-lg doc-lede">
        To clean a wooden crib, dust it with a soft cloth, then wipe it with a damp cloth and a little mild soap. That is the cleaning step in the crib instructions we keep from Old Town Oak, Fisher's and Kids Comfort, which name mild soap or mild dishwashing liquid. Our Care & Finishes page, under Everyday cleaning, adds that you should wipe spills as they happen and skip all-purpose sprays, ammonia, bleach and abrasive pads. Before you start, find the care instructions that came with your crib, because the builder's own method is the one to follow.
      </p>
      <p>
        We resell cribs from three builders: Old Town Oak, Fisher's Quality Products and Kids Comfort. The crib instructions we keep from each of them describe cleaning with a damp cloth and a mild soap or dishwashing liquid. Where they differ is in the details, and this guide walks through them.
      </p>
      <section>
        <h2 className="headline-md">Start with your crib's instructions</h2>
        <p>
        Heirloom Cribs & More does not build furniture. Each crib is made to order by its builder, and the builder's crib instructions include the cleaning step right alongside the assembly steps. So keep that booklet with the crib.
        </p>
        <p>
        If you've lost it, <Link href="/contact" className="doc-link">contact us</Link> with the model and finish. We'll point you to that builder's own documentation. If you're not sure which builder made your crib, we can help with that too.
        </p>
      </section>
      <hr className="doc-rule" />
      <section>
        <h2 className="headline-md">The everyday routine</h2>
        <p>
        Our <Link href="/care" className="doc-link">Care & Finishes</Link> page, under Everyday cleaning, keeps the routine simple. It says to dust with a dry or barely damp soft cloth, following the grain. It says to wipe spills as they happen, because standing liquid is the one thing that will genuinely damage a finish. The same section lists what to leave in the cupboard: all-purpose sprays, ammonia, bleach and silicone-based polishes. It also says no abrasive pads.
        </p>
        <p>
        When a rail needs more than a dusting, that's when your builder's cleaning step comes in.
        </p>
      </section>
      <hr className="doc-rule" />
      <section>
        <h2 className="headline-md">What Old Town Oak's instructions say</h2>
        <p>
        Old Town Oak opens the care item in the crib manuals we keep by saying that furniture wax and polish should be avoided. It then gives the cleaning step: “The surface with which the baby can come in contact should be wiped clean using a damp cloth and a small amount of mild soap. DO NOT use strong detergents as they may be an irritant to the baby’s skin.”
        </p>
        <p>
        To see the woods and stains offered on our site, open the <Link href="/builders/old-town-oak" className="doc-link">Old Town Oak page</Link> and go to Woods and finishes. There, its cribs are listed in brown maple with ten stains, from Natural to Sandstone. Under How it's built, the same page quotes Old Town Oak's catalog on its tool and hardware kit, which comes standard attached to every crib spring. Keep that kit with the booklet.
        </p>
      </section>
      <hr className="doc-rule" />
      <section>
        <h2 className="headline-md">What Fisher's Quality Products' instructions say</h2>
        <p>
        Fisher's 2025 assembly instructions include a full section headed Furniture Care Instructions. The cleaning step is the last line under In General: “When cleaning your furniture, use a non-toxic, non-abrasive cleaner. Mix a solution of water with a small amount of mild dishwashing liquid. Apply to crib surface with a soft damp cloth, lightly dampened in solution. After cleaning, dry completely with a soft dry cloth.”
        </p>
        <p>
        That last step is the one to notice. Of our three builders, Fisher's is the one whose instructions add drying after the wash. The same section also says not to wax the furniture, to polish only two or three times a year and to keep the furniture out of direct sunlight.
        </p>
        <p>
        The <Link href="/builders/fishers-quality-products" className="doc-link">Fisher's page</Link>, under Woods and finishes, shows what its cribs come in on our site: brown maple, with eleven stains to choose from, from Antique Slate to Washington.
        </p>
      </section>
      <hr className="doc-rule" />
      <section>
        <h2 className="headline-md">What Kids Comfort's instructions say</h2>
        <p>
        Kids Comfort's crib instructions have a section headed Maintenance and Cleaning. Its cleaning line gives you two options: “Your crib may be cleaned using a damp cloth with mild soap or a soft dry cloth. Avoid using furniture polish or cleaning agents that may be hazardous to children.”
        </p>
        <p>
        Kids Comfort pieces aren't listed on our site yet, but they are available on request. The <Link href="/builders/kids-comfort" className="doc-link">Kids Comfort page</Link>, under Woods and finishes, shows the stains and paints in its January 2023 catalog.
        </p>
        <p>
        The same page has a section called The organic finish. There, Kids Comfort describes its organic option as a linseed oil derived from natural flaxseed, hand rubbed onto raw wood. The crib instructions we have from Kids Comfort don't give a separate cleaning method for that finish, and we won't guess at one. If your crib has it, <Link href="/contact" className="doc-link">contact us</Link> before you use anything beyond what your manual says.
        </p>
      </section>
      <hr className="doc-rule" />
      <section>
        <h2 className="headline-md">While you're cleaning, check the bolts</h2>
        <p>
        Cleaning day is a good time for a quick look at the hardware. Care & Finishes, under Hardware, says to re-tighten the bolts a few weeks after assembly, then every few months. It also says to hand-tighten only.
        </p>
        <p>
        The same page, under What the wood will do, explains that hardwood expands and contracts with humidity. It calls this expected rather than a defect and suggests keeping the room roughly between 35% and 55% relative humidity. Fisher's names its own, narrower range for its furniture: a temperature between 65 and 75 degrees, and a relative humidity between 35 and 40 percent. If you own a Fisher's piece, go by Fisher's numbers.
        </p>
      </section>
      <hr className="doc-rule" />
      <section>
        <h2 className="headline-md">Where to go next</h2>
        <p>
        For safety statements, see the Safety and compliance section on the <Link href="/builders/old-town-oak" className="doc-link">Old Town Oak page</Link> and on the <Link href="/builders/kids-comfort" className="doc-link">Kids Comfort page</Link>, each in that builder's own words. For finish questions, our <Link href="/finishes" className="doc-link">Finishes & Nursery Air Quality</Link> page, under Are the finishes safe for a nursery?, explains that finishes vary by builder. Tell us the model and finish you have, and we'll point you to that builder's own documentation.
        </p>
      </section>
    </div>
  );
}
