import type { Metadata } from 'next';
import Link from 'next/link';
import { getNurserySets, getPlates, LEARN_CARDS } from '@/lib/plates';
import { organizationJsonLd, webSiteJsonLd, jsonLdScript } from '@/lib/seo';
import HomeHero from '@/components/home/HomeHero';
import TalkToPerson from '@/components/layout/TalkToPerson';
import ProvenanceBand from '@/components/home/ProvenanceBand';
import NurserySetSpread from '@/components/plates/NurserySetSpread';
import PlateRun from '@/components/plates/PlateRun';
import UsesNav from '@/components/uses/UsesNav';
import '@/styles/home.css';

export const metadata: Metadata = {
  alternates: { canonical: '/' },
};

/*
 * Statically prerendered. Plates are client islands over server-built rows, and
 * must stay free of useSearchParams(), which would make this route dynamic.
 */
export default function HomePage() {
  const plates = getPlates();
  const sets = getNurserySets();
  const promptPlates = plates.map(({ id, number, title, keywords }) => ({ id, number, title, keywords }));

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(organizationJsonLd()) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(webSiteJsonLd()) }}
      />

      <HomeHero plates={promptPlates} />
      <PlateRun plates={plates} cards={LEARN_CARDS} />
      <UsesNav />

      <nav className="contents" aria-label="In this edition">
        <p className="label-caps">In this edition</p>
        <ol>
          {plates.map(p => (
            <li key={p.id}>
              <a href={`#${p.id}`}><span>{p.number}</span> {p.title}</a>
            </li>
          ))}
        </ol>
        <Link href="/products" className="button-primary">See everything</Link>
      </nav>

      <ProvenanceBand />

      <section className="sets" aria-labelledby="sets-heading">
        <h2 id="sets-heading">Whole Rooms</h2>
        {sets.map(set => <NurserySetSpread key={set.id} set={set} />)}
      </section>

      <section className="see-all">
        <h2>Want to See It All?</h2>
        <Link href="/products" className="button-primary">See everything</Link>
        <p className="see-all-help"><TalkToPerson /></p>
      </section>

      <section className="home-steps" aria-labelledby="home-steps-heading">
        <h2 id="home-steps-heading">How Buying Works</h2>
        <ol>
          <li>
            <h3>Order with no card</h3>
            <p>We don&rsquo;t take payment at checkout. We call to confirm the stain, the kit list, and the delivery before anything is built.</p>
          </li>
          <li>
            <h3>Pay how you like</h3>
            <p>A secure Stripe invoice follows within 48 hours of your order. A minimum 50% deposit begins production. You can also pay in full or finance the whole order with Affirm.</p>
          </li>
          <li>
            <h3>The builder makes it</h3>
            <p>Every piece is made to order. <Link href="/timeline">Lead times</Link> are estimates that we confirm when you order. We&rsquo;ll collect the remaining balance before we schedule final delivery.</p>
          </li>
          <li>
            <h3>We deliver it</h3>
            <p>Choose Curbside or White Glove when you order. Shipping is charged separately, and assembly comes only with White Glove. See our <Link href="/shipping">Delivery page</Link> for the areas we serve.</p>
          </li>
        </ol>
      </section>
    </>
  );
}
