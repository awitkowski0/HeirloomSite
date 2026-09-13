import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'How Our 4-in-1 Conversion Works',
  description:
    'How a Heirloom 4-in-1 convertible crib moves from crib to toddler bed, daybed, and full-size bed with model-matched kits—and what to confirm before you buy.',
  alternates: { canonical: '/how-conversion-works' },
};

export default function ConversionPage() {
  return (
    <div className="container doc-page">
      <p className="label-caps text-on-surface-variant">Owner&rsquo;s guide</p>
      <h1 className="headline-xl">How Our 4-in-1 Conversion Works</h1>
      <p className="body-lg doc-lede">A 4-in-1 convertible crib is designed to move with your child through several stages. With the right frame and model-matched conversion kits, the same piece can support the crib, toddler bed, daybed, and full-size bed configurations.</p>
      <p>The exact stages and kit inclusion vary by model. Each product page states which stages it supports and whether conversion kits are included or listed separately. If a page is unclear, ask us before ordering so we can confirm exactly what is in the box for that style.</p>

      <section><h2 className="headline-md">What “4-in-1” means</h2><p>The four configurations are:</p><ol className="doc-list"><li>Crib</li><li>Toddler bed</li><li>Daybed</li><li>Full-size bed</li></ol><p>Not every model supports every stage the same way, and not every model ships with every kit in the box.</p></section>
      <hr className="doc-rule" />
      <section><h2 className="headline-md">Why the frame matters</h2><p>Our convertible cribs are built from solid hardwood rather than particle board or MDF. The same posts and rails that form the crib become the headboard and footboard of the larger bed, so the underlying structure is intended to stay rigid through disassembly, reassembly, and years of use.</p></section>
      <hr className="doc-rule" />
      <section><h2 className="headline-md">The crib stage</h2><p>In its first configuration, the crib is a standard full-size crib with a mattress support designed for a firm, tight-fitting crib mattress, following current safe-sleep guidance and the product’s safety standards, including ASTM F1169, CPSC requirements, and JPMA where applicable.</p></section>
      <hr className="doc-rule" />
      <section><h2 className="headline-md">Step 1: Convert to the toddler bed</h2><p>When your child is ready to leave the crib—typically between roughly 18 months and 3 years, depending on the child and your pediatric guidance—the front rail is removed or replaced using the model-matched toddler conversion kit. The result is a low toddler bed while the frame remains familiar.</p><p><strong>What changes:</strong> The front crib rail comes off or is swapped for the toddler rail. The mattress support stays low. The bed still uses a crib or toddler mattress according to the product specifications.</p></section>
      <section><h2 className="headline-md">Step 2: Convert to the daybed</h2><p>In the daybed configuration, the front rail is removed entirely and the back panel and side rails remain in place. The result is a three-sided bed.</p><p><strong>What changes:</strong> The front rail is removed. Back and side panels remain. No floor rail is required in this stage.</p></section>
      <section><h2 className="headline-md">Step 3: Convert to a full-size bed</h2><p>For the full-size bed stage, the crib sides and front rail are replaced by the model-matched full conversion kit. The kit typically adds a new headboard/footboard extension or hardware so the original head and footboards frame a full-size mattress.</p><p><strong>What changes:</strong> Crib sides are removed; the full-size kit extends the frame. Use a full-size mattress according to the product specifications and kit instructions.</p></section>
      <hr className="doc-rule" />
      <section><h2 className="headline-md">Do you need a different mattress at each stage?</h2><p>Generally, the crib stage uses a firm, tight-fitting crib mattress. Later stages may use different mattress sizes, such as a toddler or full-size mattress, depending on the configuration and kit. Always follow the product specifications and kit instructions for the stage you are setting up. We do not replace pediatric safe-sleep advice; see our <Link href="/safety" className="doc-link">Safety page</Link> for product standards context.</p></section>
      <section><h2 className="headline-md">Are the conversion kits included?</h2><p>It depends on the style. Some configurations, including certain Princeton-style options, include the conversion kits with the crib; others list the kits separately as purchasable options. The product page shows what applies to each model. If you are unsure, use Get Personal Assistance and we will confirm what is included for the exact SKU.</p></section>
      <section><h2 className="headline-md">Do I need to buy a new crib as my child grows?</h2><p>That is the point of a 4-in-1: with the right kits, one solid hardwood crib can serve through the crib, toddler, daybed, and full-size stages. The kits are model-matched and engineered for the specific Heirloom frame. Use only the kit intended for your model and follow its instructions.</p></section>
      <hr className="doc-rule" />
      <section><h2 className="headline-md">How ordering works</h2><p>Our cribs are custom, made-to-order pieces:</p><ol className="doc-list"><li>Choose your crib style and preferred wood and stain.</li><li>Place a 50% deposit—production begins immediately.</li><li>We confirm your estimated lead time and delivery cost for your zip code.</li><li>The balance is due before shipping; inspect on delivery.</li></ol><p>Exact lead times are confirmed individually for each order and are estimates, not guarantees. The 48-hour cancellation window applies from order placement.</p></section>
      <section><h2 className="headline-md">What to ask before you buy</h2><ul className="doc-list"><li>Which stages does this specific model support?</li><li>Are the conversion kits included or sold separately?</li><li>What mattress sizes does each stage require?</li><li>What is the current lead time for my style, wood, and stain?</li><li>What is included in delivery, standard or white-glove?</li></ul><p>You can get answers through Get Personal Assistance before you place a deposit.</p></section>
    </div>
  );
}
