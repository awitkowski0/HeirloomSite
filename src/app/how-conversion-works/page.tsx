import type { Metadata } from 'next';
import Link from 'next/link';
import BrandSketch from '@/components/marketing/BrandSketch';

export const metadata: Metadata = {
  title: 'How Conversion Works',
  description:
    'How a 3-stage convertible crib converts to a toddler bed and a full bed, what Old Town Oak and Fisher\'s say, and what to check before you buy.',
  alternates: { canonical: '/how-conversion-works' },
  openGraph: { url: '/how-conversion-works' },
};

export default function HowConversionWorksPage() {
  return (
    <div className="container doc-page">
      <p className="label-caps text-on-surface-variant">Owner&rsquo;s guide</p>
      <h1 className="headline-xl">How Conversion Works</h1>
      <p className="body-lg doc-lede">
        Our convertible cribs move through three stages. Each product page lists the kits for that
        crib, and you can buy them when you reach that stage.
      </p>

      <div className="doc-sketches">
        <BrandSketch
          src="/images/brand/crib-room-placement.jpg"
          alt="Sketch of a crib in a nursery, the first stage of conversion"
          width={1728}
          height={1152}
          sizes="(max-width: 1199px) 100vw, 1140px"
          caption="Crib stage: the starting configuration in the nursery."
          priority
        />
      </div>

      <section>
        <h2 className="headline-md">1. Crib</h2>
        <p>Assembled as a crib, with the mattress lowered as your child grows. It stays this way until climbing out becomes a real possibility.</p>
      </section>
      <section>
        <h2 className="headline-md">2. Toddler bed or day bed</h2>
        <p>A conversion kit replaces the front of the crib with a toddler rail. Go by your child&rsquo;s readiness rather than age.</p>
      </section>
      <section>
        <h2 className="headline-md">3. Full-size bed</h2>
        <p>Full bed rails connect the headboard and footboard. A full-size mattress is bought separately.</p>
      </section>
      <section>
        <h2 className="headline-md">Which kits fit my crib?</h2>
        <p>
          Kits differ by model and are not interchangeable between styles. Check the{' '}
          <Link href="/products/cribs" className="doc-link">crib&rsquo;s own page</Link>, or{' '}
          <Link href="/contact" className="doc-link">ask us</Link> and we&rsquo;ll confirm before you order.
        </p>
      </section>
    </div>
  );
}
