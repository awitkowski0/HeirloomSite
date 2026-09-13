import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Safe Sleep & Crib Transition',
  description:
    'Educational safe-sleep and crib-transition guidance from AAP, CPSC, NIH/NICHD, and CDC, with official references. Informational only—not medical advice.',
  alternates: { canonical: '/safe-sleep' },
};

const AAP = 'https://www.healthychildren.org/English/ages-stages/baby/sleep/Pages/A-Parents-Guide-to-Safe-Sleep.aspx';
const AAP_POLICY = 'https://publications.aap.org/pediatrics/article/150/1/e2022057990/188304/Sleep-Related-Infant-Deaths-Updated-2022';
const CPSC_SLEEP = 'https://www.cpsc.gov/SafeSleep';
const CPSC_CRIB = 'https://www.cpsc.gov/safety-education/safety-guides/cribs/crib-safety-tips';
const NIH_SLEEP = 'https://safetosleep.nichd.nih.gov/';
const CDC_SLEEP = 'https://www.cdc.gov/reproductive-health/features/babies-sleep.html';

export default function SafeSleepPage() {
  return (
    <div className="container doc-page">
      <p className="label-caps text-on-surface-variant">Owner&rsquo;s guide</p>
      <h1 className="headline-xl">Safe Sleep &amp; Crib Transition</h1>
      <p className="body-lg doc-lede">
        Informational only — not medical advice. This page summarizes public safe-sleep guidance
        from official sources. Every family is different: contact your pediatrician or pediatric
        healthcare provider for recommendations specific to your child, follow the manufacturer&rsquo;s
        instructions, and check for recalls.
      </p>
      <p>
        Heirloom Cribs and More sells compliant nursery hardwood case goods as a reseller; Amish and
        independent US craftspeople make the case goods. Safe-sleep guidance on this page comes from
        the official sources linked below, not from Heirloom as a clinical expert. Guidelines can
        change, so verify the live primary pages.
      </p>

      <section>
        <h2 className="headline-md">The ABCs of safe infant sleep</h2>
        <h3>A — Alone</h3>
        <ul className="doc-list">
          <li>Babies should sleep alone on their own sleep surface. (<a href={AAP} className="doc-link">AAP / HealthyChildren.org</a>; <a href={AAP_POLICY} className="doc-link">AAP 2022 policy</a>)</li>
          <li>Room-sharing — a crib or bassinet in the parents&rsquo; room — is recommended for at least the first 6 months, and ideally up to 1 year. (<a href={AAP} className="doc-link">AAP / HealthyChildren.org</a>)</li>
          <li>Bed-sharing is not recommended because of increased risk of SIDS, suffocation, or strangulation. (<a href={AAP} className="doc-link">AAP / HealthyChildren.org</a>; <a href={AAP_POLICY} className="doc-link">AAP 2022 policy</a>)</li>
        </ul>

        <h3>B — on the Back</h3>
        <ul className="doc-list">
          <li>Place your baby on their back for every sleep — naps and nighttime — until 1 year of age. (<a href={AAP} className="doc-link">AAP / HealthyChildren.org</a>; <a href={CDC_SLEEP} className="doc-link">CDC</a>; <a href={NIH_SLEEP} className="doc-link">NIH / NICHD Safe to Sleep</a>)</li>
          <li>Once a baby can roll both ways independently, they may change position during sleep; continue to start them on their back. (<a href={AAP} className="doc-link">AAP / HealthyChildren.org</a>)</li>
        </ul>

        <h3>C — in a Crib (or other approved sleep product)</h3>
        <ul className="doc-list">
          <li>Use a crib, bassinet, portable crib, or play yard that meets current CPSC safety standards. (<a href={CPSC_SLEEP} className="doc-link">CPSC Safe Sleep</a>; <a href={CPSC_CRIB} className="doc-link">CPSC Crib Safety Tips</a>)</li>
          <li>The mattress must be firm and flat, not inclined. Surfaces with an incline greater than 10 degrees are not safe for infant sleep. (<a href={AAP} className="doc-link">AAP / HealthyChildren.org</a>; <a href={AAP_POLICY} className="doc-link">AAP 2022 policy</a>)</li>
          <li>Use only a tightly fitted sheet. Nothing else belongs in the sleep space. (<a href={AAP} className="doc-link">AAP / HealthyChildren.org</a>; <a href={CPSC_SLEEP} className="doc-link">CPSC Safe Sleep</a>)</li>
        </ul>

        <h3>Bare is best</h3>
        <ul className="doc-list">
          <li>Keep soft objects, loose bedding, pillows, quilts, comforters, bumper pads, stuffed toys, and weighted blankets or weighted swaddles out of the crib. (<a href={AAP} className="doc-link">AAP / HealthyChildren.org</a>; <a href={AAP_POLICY} className="doc-link">AAP 2022 policy</a>; <a href={CPSC_SLEEP} className="doc-link">CPSC Safe Sleep</a>)</li>
          <li>A wearable blanket or sleep sack is the preferred way to keep baby warm if needed. (<a href={AAP} className="doc-link">AAP / HealthyChildren.org</a>)</li>
        </ul>
      </section>

      <hr className="doc-rule" />
      <section>
        <h2 className="headline-md">Additional points</h2>
        <ul className="doc-list">
          <li>Move your baby to a firm, flat sleep surface as soon as practical if they fall asleep in a car seat, stroller, swing, or other sitting device. (<a href={CPSC_SLEEP} className="doc-link">CPSC Safe Sleep</a>)</li>
          <li>Check <a href="https://www.saferproducts.gov/" className="doc-link">SaferProducts.gov</a> for recalls and never use a crib that is broken, missing parts, or has drop-side rails. (<a href={CPSC_CRIB} className="doc-link">CPSC Crib Safety Tips</a>)</li>
          <li>Avoid overheating; dress baby appropriately for the room temperature. (<a href={AAP} className="doc-link">AAP / HealthyChildren.org</a>; <a href={CDC_SLEEP} className="doc-link">CDC</a>)</li>
          <li>Human milk feeding is <strong>associated with</strong> a reduced risk of SIDS — discuss feeding plans with your pediatrician. (<a href={AAP_POLICY} className="doc-link">AAP 2022 policy</a>)</li>
        </ul>
      </section>

      <section>
        <h2 className="headline-md">How a compliant full-size crib supports safe sleep</h2>
        <p>Public CPSC crib-safety guidance addresses features such as:</p>
        <ul className="doc-list">
          <li>Fixed sides (no drop-side rails). (<a href={CPSC_CRIB} className="doc-link">CPSC Crib Safety Tips</a>)</li>
          <li>Slats spaced no more than 2⅜ inches apart. (<a href={CPSC_CRIB} className="doc-link">CPSC Crib Safety Tips</a>)</li>
          <li>A firm mattress that fits tightly with no gaps. (<a href={CPSC_CRIB} className="doc-link">CPSC Crib Safety Tips</a>; <a href={AAP} className="doc-link">AAP / HealthyChildren.org</a>)</li>
        </ul>
        <p>
          Product standards and setup for cribs we sell are on our <Link href="/safety" className="doc-link">Safety</Link>{' '}
          page (meet or exceed CPSC and ASTM; non-toxic, baby-safe finishes; mattress fit, hardware,
          and placement notes). That page is product information — <strong>not medical advice</strong>.
        </p>
      </section>

      <section>
        <h2 className="headline-md">When to transition from crib to toddler bed</h2>
        <ul className="doc-list">
          <li>There is no single required age; discuss timing with your pediatrician. (<a href={AAP} className="doc-link">AAP / HealthyChildren.org</a>)</li>
          <li>Practical triggers cited in official guidance include reaching roughly <strong>35 inches (89 cm)</strong> in height, or beginning to <strong>climb out</strong> of the crib. (<a href={CPSC_CRIB} className="doc-link">CPSC Crib Safety Tips</a>)</li>
        </ul>
      </section>

      <hr className="doc-rule" />
      <section>
        <h2 className="headline-md">Making the transition with a 4-in-1 convertible crib</h2>
        <p>
          Convertible cribs we offer move through crib → toddler bed → daybed → full-size bed. Use
          only the parts made for your model and follow the manufacturer&rsquo;s instructions. Rails
          and separately sold conversion parts are listed on product pages and our <Link href="/safety" className="doc-link">Safety</Link>{' '}
          page. Heirloom Cribs and More is the reseller; Amish and independent US craftspeople make
          the hardwood case goods.
        </p>
        <p>When you and your pediatrician agree it is time:</p>
        <ol className="doc-list">
          <li>Confirm readiness using the official height and climbing guidance linked above.</li>
          <li>Lower the mattress to its lowest setting before your child can pull to standing. (<Link href="/safety" className="doc-link">Safety page</Link>)</li>
          <li>Install toddler conversion parts per the manufacturer&rsquo;s instructions for your model.</li>
          <li>Keep a firm, appropriately sized mattress and fitted sheet; keep soft objects out of the sleep space per AAP/CPSC guidance.</li>
        </ol>
        <p>See also <Link href="/how-conversion-works" className="doc-link">How Our 4-in-1 Conversion Works</Link>.</p>
      </section>

      <section>
        <h2 className="headline-md">Quick questions</h2>
        <h3>What should be in the crib with my baby?</h3>
        <p>Only a firm mattress that fits tightly and a fitted sheet. Nothing else. (<a href={AAP} className="doc-link">AAP / HealthyChildren.org</a>; <a href={CPSC_SLEEP} className="doc-link">CPSC Safe Sleep</a>)</p>
        <h3>Is an inclined sleeper safe for infant sleep?</h3>
        <p>No. Sleep surfaces with an incline greater than 10 degrees are not safe for infant sleep. Transfer the baby to a firm, flat surface as soon as practical. (<a href={AAP} className="doc-link">AAP / HealthyChildren.org</a>)</p>
        <h3>When is it time to stop using the crib?</h3>
        <p>When the child begins climbing out or reaches approximately 35 inches tall — confirm with your pediatrician. (<a href={CPSC_CRIB} className="doc-link">CPSC Crib Safety Tips</a>)</p>
        <h3>Do Heirloom cribs meet current safety standards?</h3>
        <p>Every crib we sell is described on our <Link href="/safety" className="doc-link">Safety</Link> page as meeting or exceeding CPSC and ASTM standards, with non-toxic, baby-safe finishes. Always assemble and maintain the crib per the included instructions.</p>
      </section>

      <section>
        <h2 className="headline-md">References</h2>
        <p>Primary official URLs only:</p>
        <ol className="doc-list">
          <li><a href={AAP} className="doc-link">AAP / HealthyChildren.org — How to Keep Your Sleeping Baby Safe</a></li>
          <li><a href={AAP_POLICY} className="doc-link">AAP Policy Statement (2022) — Sleep-Related Infant Deaths: Updated 2022 Recommendations</a></li>
          <li><a href={CPSC_SLEEP} className="doc-link">CPSC Safe Sleep</a></li>
          <li><a href={CPSC_CRIB} className="doc-link">CPSC Crib Safety Tips</a></li>
          <li><a href={NIH_SLEEP} className="doc-link">NIH / NICHD Safe to Sleep</a></li>
          <li><a href={CDC_SLEEP} className="doc-link">CDC — Babies&rsquo; Sleep Safety</a></li>
          <li><a href="https://www.saferproducts.gov/" className="doc-link">SaferProducts.gov</a></li>
          <li><Link href="/safety" className="doc-link">Heirloom Safety page (product standards / setup — not medical advice)</Link></li>
        </ol>
      </section>
    </div>
  );
}
