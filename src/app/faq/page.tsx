import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'FAQ',
  description:
    'Answers on solid hardwood cribs, finishes, 4-in-1 conversion, ordering, shipping, and safety standards from Heirloom Cribs and More (Nazareth / Lehigh Valley, PA).',
  alternates: { canonical: '/faq' },
};

export default function FaqPage() {
  return (
    <div className="container doc-page">
      <p className="label-caps text-on-surface-variant">Help center</p>
      <h1 className="headline-xl">FAQ</h1>
      <p className="body-lg doc-lede">
        Straight answers about materials, finishes, conversion stages, ordering, delivery, and safe use of your Heirloom crib.
      </p>

      <section>
        <h2 className="headline-md">Materials and construction</h2>
        <h3>Are your cribs solid hardwood?</h3>
        <p>Yes. Our cribs are crafted from solid American hardwoods. Where a product page states “no particle board / no MDF / no veneer,” that language is intentional and specific to that piece.</p>
        <h3>What does “heirloom quality” mean here?</h3>
        <p>It means the crib is designed to be used and kept—not replaced every season. Solid hardwood, careful finishing, and a clean conversion path (crib → toddler → daybed → full, depending on model and kits) allow one investment to serve multiple stages of childhood.</p>
        <h3>Where are the cribs made?</h3>
        <p>Our cribs are made in the USA. Heirloom Cribs and More is a women-owned business based in the Nazareth / Lehigh Valley, Pennsylvania area.</p>
      </section>

      <hr className="doc-rule" />
      <section>
        <h2 className="headline-md">Finishes and nursery air quality</h2>
        <h3>Are the finishes safe for a nursery?</h3>
        <p>We use finishes chosen for nursery furniture and describe them on each product page and our <Link href="/safety" className="doc-link">Safety page</Link>. Our documented language includes non-toxic / low-VOC and lead-free approaches. Select collections may carry GREENGUARD Gold—confirm on the specific product. For a sensitivity or chemical concern, contact us with the model name so we can point you to the documented details rather than guess.</p>
        <h3>Can I choose wood species and stain?</h3>
        <p>Yes. Most cribs offer wood and stain options on the product page. If you are unsure which finish will match your nursery, use <strong>Get Personal Assistance</strong> and share photos or inspiration before you place a deposit.</p>
      </section>

      <hr className="doc-rule" />
      <section>
        <h2 className="headline-md">Conversion path</h2>
        <h3>What does 4-in-1 convertible mean?</h3>
        <p>Depending on the model and included or available kits, the crib is designed to convert through childhood stages—typically crib, toddler bed, daybed, and full-size bed. Always check the specific product page for which stages and kits apply. Some styles include conversion kits; others list kits separately.</p>
        <h3>Are conversion kits included?</h3>
        <p>It depends on the style. When kits are included, the product page will identify them. If kits are optional, they will be listed as related products or options. If the page is unclear, ask us before ordering so we can confirm what is in the box for that SKU.</p>
        <h3>Will I need a different mattress later?</h3>
        <p>Use a firm, tight-fitting crib mattress that meets current safe-sleep guidance for the crib stage. Toddler and full configurations may use different mattress sizes; follow the product specifications and any kit instructions. We do not replace pediatric safe-sleep advice. See our <Link href="/safety" className="doc-link">Safety page</Link> for product standards context.</p>
      </section>

      <hr className="doc-rule" />
      <section>
        <h2 className="headline-md">Ordering and timing</h2>
        <h3>How does ordering work?</h3>
        <ol className="doc-list"><li>Choose your crib style, wood, and stain.</li><li>Place a <strong>50% deposit</strong> (non-refundable as stated on the product page); production begins.</li><li>We confirm estimated lead time and delivery options for your location.</li><li>The <strong>balance is due before shipping</strong>. Inspect on delivery.</li></ol>
        <p>There is a <strong>48-hour cancellation window</strong> as stated on the product page terms.</p>
        <h3>How long until my crib ships?</h3>
        <p>These are made-to-order pieces, so timing depends on current production and your finish choices. We confirm a planning estimate for your order and location rather than publishing a one-size-fits-all “ships in X days” promise. Share your target month via <strong>Get Personal Assistance</strong> for the most useful estimate.</p>
        <h3>Can I cancel after I order?</h3>
        <p>Product pages state a <strong>48-hour cancellation window</strong>. The deposit is <strong>non-refundable</strong> as written on the product page because production starts with your order. Read the terms on the page you purchase from and ask us before depositing if anything is unclear.</p>
      </section>

      <hr className="doc-rule" />
      <section>
        <h2 className="headline-md">Shipping and delivery</h2>
        <h3>Do you ship nationwide?</h3>
        <p>We ship to customers across the U.S., with delivery method and cost depending on your location and the piece. Freight for solid hardwood furniture is not the same as a small-parcel carton. We confirm options when we have your <strong>zip code</strong>.</p>
        <h3>Is white-glove delivery available?</h3>
        <p>White-glove or threshold-style delivery may be available depending on carrier and region. Standard freight options may also apply. Tell us your zip code and we will outline what is realistic for your address, including stairs or apartment constraints.</p>
        <h3>Who assembles the crib?</h3>
        <p>Assembly expectations depend on the product and delivery level selected. Many families assemble with the included instructions; some delivery services offer placement-only or full assembly. We clarify what your quote includes before you pay the final balance.</p>
      </section>

      <hr className="doc-rule" />
      <section>
        <h2 className="headline-md">Safety standards</h2>
        <h3>What safety standards do you follow?</h3>
        <p>Our cribs and conversion kits are built to meet or exceed applicable federal safety standards for cribs. That framing includes standards such as <strong>ASTM F1169</strong> and <strong>CPSC</strong> crib requirements, including relevant 16 CFR provisions listed on our <Link href="/safety" className="doc-link">Safety page</Link>, along with other certifications called out there (for example JPMA, CPSIA context, and GREENGUARD Gold on select items).</p>
        <p>Authoritative detail always lives on the <Link href="/safety" className="doc-link">Safety page</Link>. We do not replace safe-sleep guidance from your pediatrician or public health authorities.</p>
        <h3>Are conversion kits safety-certified too?</h3>
        <p>Conversion kits sold for our cribs are part of the same safety-minded product system and are addressed on the Safety page and product documentation. Use only the kits intended for your model and follow the instructions for each configuration.</p>
      </section>

      <hr className="doc-rule" />
      <section>
        <h2 className="headline-md">Get Personal Assistance</h2>
        <h3>What is “Get Personal Assistance”?</h3>
        <p>It is our help path for families choosing a solid hardwood convertible crib. Tell us your preferred style, finish ideas, zip code, and timing. A real person follows up with options, and you receive an automatic confirmation when you submit the form.</p>
        <h3>What should I include so you can help faster?</h3>
        <ol className="doc-list"><li>Crib style or product page link</li><li>Wood/stain preferences, or “not sure”</li><li>Delivery zip code</li><li>Ideal delivery window (a month is fine)</li><li>Any constraints, such as an apartment, matching existing furniture, or gift timing</li></ol>
        <h3>How fast will someone reply?</h3>
        <p>You will get an immediate confirmation email. A person on our team aims to follow up the <strong>same business day</strong> when the request arrives before mid-afternoon Eastern, otherwise the next business day. For urgent needs, reply to the confirmation and put <strong>URGENT</strong> in the first line with a phone number.</p>
      </section>

      <hr className="doc-rule" />
      <section>
        <h2 className="headline-md">Price and deposits</h2>
        <h3>Why is the price higher than big-box cribs?</h3>
        <p>You are paying for solid hardwood construction, US manufacturing, convertible longevity, and finish and safety choices aimed at real nursery use—not a disposable particle-board cycle. If you would like a side-by-side of two Heirloom styles for your budget, ask via Get Personal Assistance.</p>
        <h3>Is the price on the site the full price?</h3>
        <p>The product page shows the crib price for the configuration displayed. Wood and stain options follow the choices on that page. Shipping and delivery are typically confirmed for your zip and are separate from the furniture price unless the page explicitly says otherwise. The deposit is 50% to start production; the balance is due before shipping.</p>
      </section>
    </div>
  );
}
