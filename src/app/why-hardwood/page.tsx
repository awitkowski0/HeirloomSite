import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Why Solid Hardwood Matters',
  description:
    'What solid hardwood means for crib strength, longevity through conversion, finish behavior, and evaluating materials—US-made Heirloom cribs.',
  alternates: { canonical: '/why-hardwood' },
};

export default function HardwoodPage() {
  return (
    <div className="container doc-page">
      <p className="label-caps text-on-surface-variant">Owner&rsquo;s guide</p>
      <h1 className="headline-xl">Why Solid Hardwood Matters</h1>
      <p className="body-lg doc-lede">When you choose a crib, the material affects how it feels, how it holds up through daily use, how the finish behaves, and whether the piece can convert and serve another child or generation.</p>
      <p>Solid hardwood is the material foundation of every crib we offer at Heirloom Cribs and More.</p>
      <section><h2 className="headline-md">What “solid hardwood” means</h2><p>Solid hardwood means the structural parts of the crib—rails, posts, side panels, and key frame members—are made from solid pieces of hardwood rather than particle board, MDF (medium-density fiberboard), plywood cores with a thin veneer, or other engineered composites.</p><p>Particle board and MDF are made from wood particles or fibers bound with resin. Solid hardwood starts as sawn lumber and is shaped into the components that form the crib. This is a construction difference that shows up over time in rigidity, weight, and the ability to refinish or repair.</p></section>
      <hr className="doc-rule" />
      <section><h2 className="headline-md">Strength and daily durability</h2><p>A crib is leaned on, pulled against, climbed into, and moved during cleaning and room changes. Solid hardwood rails and posts provide structural mass and grain continuity that resist flexing and deformation under those loads. Solid hardwood construction distributes force through the wood itself, resulting in a piece that feels substantial.</p></section>
      <section><h2 className="headline-md">Longevity and the convertible path</h2><p>Many families choose a 4-in-1 convertible crib so one purchase can move from newborn crib to toddler bed, daybed, and eventually a full-size bed when kits and model design allow. That multi-year or multi-child lifespan only makes practical sense if the underlying structure remains sound.</p><p>At Heirloom, our cribs are designed as true convertibles. Conversion kits are model-matched, and the solid hardwood foundation supports the full path. Exact stages and included versus optional kits are listed on each product page.</p></section>
      <hr className="doc-rule" />
      <section><h2 className="headline-md">Material profile and nursery air quality</h2><p>Solid hardwood itself does not rely on the same volume of binding resins used in particle board or MDF. Finishes still matter. Our cribs use non-toxic, baby-safe, lead-free finishes. Select collections carry GREENGUARD Gold certification for low chemical emissions. Full details for each collection live on our <Link href="/safety" className="doc-link">Safety page</Link>, including ASTM F1169, CPSC requirements, and JPMA where applicable.</p><p>We do not claim that solid hardwood alone guarantees zero emissions; the complete system—wood, finish, and any adhesives in joinery—determines the profile. Transparency about the actual standards met is more useful than absolute claims.</p></section>
      <section><h2 className="headline-md">Made in the USA and women-owned</h2><p>Heirloom Cribs and More is a women-owned business. Our cribs are made in the USA. We use solid American hardwoods and domestic production.</p><p>This does not make every solid-wood crib identical—craftsmanship, joinery, finish quality, and design still vary. It does mean our material story is straightforward: solid hardwood, US-made, with the safety standards listed on our Safety page.</p></section>
      <hr className="doc-rule" />
      <section><h2 className="headline-md">Practical questions</h2><h3>Is solid hardwood heavier?</h3><p>Yes. Solid hardwood cribs generally weigh more than particle-board or thin-veneer alternatives.</p><h3>Can solid hardwood be refinished later?</h3><p>In many cases, yes. Solid wood can be sanded and refinished if the surface is damaged years down the road. Always follow care guidance for the specific finish on your model.</p><h3>Does “solid hardwood” mean every component is solid wood?</h3><p>Structural and visible primary components are solid hardwood. Minor hardware, fasteners, and model-specific secondary parts follow the product documentation. We avoid saying “100% solid wood with zero engineered material anywhere” unless specific SKU documentation supports it without qualification.</p><h3>How does this relate to conversion kits?</h3><p>Conversion kits are designed for the solid-hardwood frames of our cribs. Use only the kits intended for your model.</p></section>
      <section><h2 className="headline-md">How to evaluate a crib&rsquo;s materials</h2><ol className="doc-list"><li>Look for explicit “solid hardwood” language rather than generic “wood” or “wood construction.”</li><li>Check whether the brand discloses particle board, MDF, or veneer use.</li><li>Review the safety standards page for ASTM, CPSC, JPMA, and any GREENGUARD or finish claims.</li><li>Confirm conversion stages and whether kits are included or sold separately.</li><li>Ask about lead time and the made-to-order process.</li></ol><p>At Heirloom Cribs and More, we build convertible cribs from solid American hardwoods, finish them with non-toxic approaches, and support families through a clear custom-order path and personal assistance.</p></section>
    </div>
  );
}
