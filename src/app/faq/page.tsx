import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { faqPageJsonLd, jsonLdScript } from '@/lib/seo';
import { nodeTextCompact } from '@/lib/node-text';

/* The delivery charges, from the same constant the checkout bills from. */

export const metadata: Metadata = {
  title: 'FAQ',
  description:
    'Answers on solid hardwood cribs, finishes, 4-in-1 conversion, ordering, shipping, and safety standards from Heirloom Cribs and More (Nazareth / Lehigh Valley, PA).',
  alternates: { canonical: '/faq' },
  openGraph: { url: '/faq' },
};

/*
 * The questions, as data.
 *
 * Structured as a list rather than written straight into the page so the
 * FAQPage JSON-LD below is generated from the SAME copy the visitor reads.
 * Google checks the two against each other and discounts FAQ markup that
 * disagrees with the page, which is exactly what a hand-maintained plain-text
 * twin of twenty answers earns as soon as one side is edited alone.
 *
 * Answers stay JSX so they keep their links and emphasis; src/lib/node-text.ts
 * flattens them for the schema.
 */
interface Entry {
  question: string;
  answer: ReactNode;
}

interface Section {
  heading: string;
  entries: Entry[];
}

const SafetyLink = (
  <Link href="/safety" className="doc-link">
    Safety page
  </Link>
);

const SECTIONS: Section[] = [
  {
    heading: 'Materials and construction',
    entries: [
      {
        question: 'Are your cribs solid hardwood?',
        answer: (
          <p>
            Yes. The cribs we offer are solid American hardwood, crafted by Amish and independent
            US craftspeople. Where a product page states “no particle board / no MDF / no veneer,”
            that language is intentional and specific to that piece.
          </p>
        ),
      },
      {
        question: 'What does “heirloom quality” mean here?',
        answer: (
          <p>
            It means the crib is designed to be used and kept—not replaced every season. Solid
            hardwood, careful finishing, and a clean conversion path (crib → toddler → daybed →
            full, depending on model and kits) allow one investment to serve multiple stages of
            childhood.
          </p>
        ),
      },
      {
        question: 'Where are the cribs made?',
        answer: (
          <p>
            The cribs we sell are made in the USA by Amish and independent US craftspeople. You buy
            through us. Heirloom Cribs and More is a women-owned shop in the Nazareth / Lehigh Valley,
            Pennsylvania area — we are the reseller, not the factory.
          </p>
        ),
      },
    ],
  },
  {
    heading: 'Finishes and nursery air quality',
    entries: [
      {
        question: 'Are the finishes safe for a nursery?',
        answer: (
          <p>
            Finishes vary by builder, so we don&rsquo;t make one blanket claim for all of them. Tell
            us the model and finish you&rsquo;re considering and we&rsquo;ll point you to that
            builder&rsquo;s own documentation; see also our {SafetyLink}. Do not assume any
            particular third-party certification applies to a given piece — confirm it on that
            product page before you order. For what GREENGUARD Gold does and does not cover, see{' '}
            <Link href="/finishes" className="doc-link">
              Finishes &amp; Nursery Air Quality
            </Link>
            . For a sensitivity or chemical concern, contact us with the model name so we can point
            you to the documented details rather than guess.
          </p>
        ),
      },
      {
        question: 'Can I choose wood species and stain?',
        answer: (
          <p>
            Yes. Most cribs offer wood and stain options on the product page. If you are unsure
            which finish will match your nursery, use <strong>Get Personal Assistance</strong> and
            share photos or inspiration before Confirm Order. Nothing is charged until after that
            call.
          </p>
        ),
      },
    ],
  },
  {
    heading: 'Conversion path',
    entries: [
      {
        question: 'What does 4-in-1 convertible mean?',
        answer: (
          <p>
            Depending on the model and included or available kits, the crib is designed to convert
            through childhood stages—typically crib, toddler bed, daybed, and full-size bed. Always
            check the specific product page for which stages and kits apply. Some styles include
            conversion kits; others list kits separately. See{' '}
            <Link href="/how-conversion-works" className="doc-link">
              How Our 4-in-1 Conversion Works
            </Link>
            .
          </p>
        ),
      },
      {
        question: 'Are conversion kits included?',
        answer: (
          <p>
            It depends on the style. When kits are included, the product page will identify them. If
            kits are optional, they will be listed as related products or options. If the page is
            unclear, ask us before ordering so we can confirm what is in the box for that SKU.
          </p>
        ),
      },
      {
        question: 'Will I need a different mattress later?',
        answer: (
          <p>
            Use a firm, tight-fitting crib mattress that meets current safe-sleep guidance for the
            crib stage. Toddler and full configurations may use different mattress sizes; follow the
            product specifications and any kit instructions. We do not replace pediatric safe-sleep
            advice. See our {SafetyLink} for product standards context, and{' '}
            <Link href="/safe-sleep" className="doc-link">
              Safe Sleep &amp; Crib Transition
            </Link>{' '}
            for the official guidance we point families to.
          </p>
        ),
      },
    ],
  },
  {
    heading: 'Ordering and timing',
    entries: [
      {
        question: 'How does ordering work?',
        answer: (
          <>
            <p>Here is the same path you will see on our homepage.</p>
            <ol className="doc-list">
              <li>
                <strong>Choose and Customize.</strong> Pick the silhouette first; the hardwood and
                the finish follow.
              </li>
              <li>
                <strong>Confirm Order</strong> (this is the quality check). Nothing is charged when
                you place an order. We read it, check the details with you, and only then ask for
                anything. No card is taken at checkout — the order is a commitment, not a charge. We
                call to confirm the stain, the kit list, and the delivery before anything is built.
                A secure Stripe invoice follows within 48 hours of the order. Custom orders require
                a 50% deposit. You can pay by credit card or Affirm.
              </li>
              <li>
                <strong>Built and Finishing by Hand.</strong> Amish and independent US
                craftspeople cut, join, and finish your piece to order in solid American hardwood.
                Lead times are estimates we confirm at order time, per builder: Old Town Oak about
                6–8 weeks, Kids Comfort about 8 weeks, Fisher&rsquo;s 10–14 weeks. The remaining
                balance must be paid before we schedule final delivery.
              </li>
              <li>
                <strong>Delivered to Your Nursery.</strong> You choose Curbside or White Glove when
                you order. Curbside is a one-person crew to the curb; White Glove is a two-person
                crew into your home, with unpacking, assembly, placement, and packing-material
                removal. White Glove includes up to 3 flights of stairs. See{' '}
                <Link href="/shipping" className="doc-link">
                  Delivery
                </Link>
                .
              </li>
            </ol>
            <p>
              You can cancel at no cost until the deposit is paid. Once the deposit is received, the
              order goes to the builder and cannot be cancelled. Read the{' '}
              <Link href="/terms" className="doc-link">
                Terms of Sale
              </Link>{' '}
              before you pay the deposit, and ask us if anything is unclear.
            </p>
          </>
        ),
      },
      {
        question: 'How long until my crib ships?',
        answer: (
          <p>
            These are made-to-order pieces. Lead times are estimates, confirmed at order time, per
            builder: Old Town Oak about 6–8 weeks, Kids Comfort about 8 weeks, Fisher&rsquo;s 10–14
            weeks. Share your target month via <strong>Get Personal Assistance</strong> if you have
            a nursery deadline. See{' '}
            <Link href="/timeline" className="doc-link">
              Timeline
            </Link>
            .
          </p>
        ),
      },
      {
        question: 'Can I cancel after I order?',
        answer: (
          <p>
            Nothing is charged when you first place the order, so you can cancel at no cost until
            the deposit is paid — just tell us in writing. Once the deposit is received, the order
            goes to the builder and cannot be cancelled, and the deposit is{' '}
            <strong>non-refundable</strong>. Made-to-order case goods cannot be returned, exchanged
            or refunded; other product types follow the policy on their product page. See{' '}
            <Link href="/returns" className="doc-link">
              Returns, Cancellations &amp; Refunds
            </Link>
            .
          </p>
        ),
      },
    ],
  },
  {
    heading: 'Shipping and delivery',
    entries: [
      {
        question: 'Where do you deliver?',
        answer: (
          <p>
            We deliver in <strong>PA, NJ (excluding the New York City / North Jersey metro area) and
            MD</strong>. If you are unsure whether your address is in range, send us your zip and we
            will confirm options for you. For any other area,{' '}
            <Link href="/contact" className="doc-link">
              contact us
            </Link>{' '}
            for delivery options; these are quoted individually. See{' '}
            <Link href="/shipping" className="doc-link">
              Delivery
            </Link>
            .
          </p>
        ),
      },
      {
        question: 'Is White Glove delivery available?',
        answer: (
          <p>
            Yes. You choose Curbside or White Glove when you order, inside the areas we deliver to.
            Curbside is a one-person crew to the curb at your address; you (or someone there) help
            unload and carry the piece inside. White Glove is a two-person crew into your home:
            unpacking, assembly, placement, and packing-material removal. White Glove includes up to
            3 flights of stairs. We confirm what fits your address on the Confirm Order call. See{' '}
            <Link href="/shipping" className="doc-link">
              Delivery
            </Link>
            .
          </p>
        ),
      },
      {
        question: 'Who assembles the crib?',
        answer: (
          <p>
            It depends on the delivery tier you choose. White Glove includes unpacking, assembly and
            placement in your home. White Glove includes up to 3 flights of stairs. Curbside does
            not include carrying items indoors, unpacking, assembly or placement. We clarify what
            your order includes before we schedule final delivery.
          </p>
        ),
      },
    ],
  },
  {
    heading: 'Safety standards',
    entries: [
      {
        question: 'What safety standards do you follow?',
        answer: (
          <>
            <p>
              Cribs sold in the United States are covered by CPSC and ASTM standards. Heirloom Cribs
              &amp; More resells; each builder makes its own compliance statements. Questions about a
              specific piece? Ask us.
            </p>
            <p>
              Authoritative detail always lives on the {SafetyLink}. We do not replace safe-sleep
              guidance from your pediatrician or public health authorities — see{' '}
              <Link href="/safe-sleep" className="doc-link">
                Safe Sleep &amp; Crib Transition
              </Link>
              .
            </p>
          </>
        ),
      },
      {
        question: 'Are conversion kits safety-certified too?',
        answer: (
          <p>
            Conversion kits sold for our cribs are part of the same safety-minded product system and
            are addressed on the {SafetyLink} and product documentation. Use only the kits intended
            for your model and follow the instructions for each configuration.
          </p>
        ),
      },
    ],
  },
  {
    heading: 'Get Personal Assistance',
    entries: [
      {
        question: 'What is “Get Personal Assistance”?',
        answer: (
          <p>
            It is our help path for families choosing a solid hardwood convertible crib.{' '}
            <Link href="/contact" className="doc-link">
              Tell us
            </Link>{' '}
            your preferred style, finish ideas, zip code, and timing. A real person follows up with
            options, and you receive an automatic confirmation when you submit the form.
          </p>
        ),
      },
      {
        question: 'What should I include so you can help faster?',
        answer: (
          <ol className="doc-list">
            <li>Crib style or product page link</li>
            <li>Wood/stain preferences, or “not sure”</li>
            <li>Delivery zip code</li>
            <li>Ideal delivery window (a month is fine)</li>
            <li>
              Any constraints, such as an apartment, matching existing furniture, or gift timing
            </li>
          </ol>
        ),
      },
      {
        question: 'How fast will someone reply?',
        answer: (
          <p>
            You will get an immediate confirmation email. A person on our team aims to follow up the{' '}
            <strong>same business day</strong> when the request arrives before mid-afternoon
            Eastern, otherwise the next business day. For urgent needs, reply to the confirmation
            and put <strong>URGENT</strong> in the first line with a phone number.
          </p>
        ),
      },
    ],
  },
  {
    heading: 'Price and deposits',
    entries: [
      {
        question: 'What am I paying for with an Heirloom crib?',
        answer: (
          <>
            <p>
              You’re paying for a solid American hardwood crib made to order for your nursery—and
              for the years it stays with your family as it grows with your child.
            </p>
            <p>
              We source nursery case goods crafted by Amish and independent US craftspeople from
              solid brown maple—never veneer over particle board. Details live on our {SafetyLink} and
              each product page. One crib converts to a toddler bed, a
              daybed, and a full bed when the kits for your style are in place; that’s what we mean
              by Built to Grow Up. When you’re ready to order, you choose Curbside delivery to the
              curb or White Glove with in-home assembly. White Glove includes up to 3 flights of
              stairs. We confirm what fits your address before production starts.
            </p>
            <p>
              If you’re weighing two styles for your nursery and budget, ask us on Confirm Order
              before any deposit—we’ll walk you through what’s in each one. See also{' '}
              <Link href="/why-hardwood" className="doc-link">
                Why Solid Hardwood Matters
              </Link>
              .
            </p>
          </>
        ),
      },
      {
        question: 'Is the price on the site the full price?',
        answer: (
          <p>
            The product page shows the crib price for the configuration displayed. Wood and stain
            options follow the choices on that page. Delivery is charged separately at checkout
            (Curbside or White Glove, based on your cart subtotal). Nothing is charged when you
            first place the order. After Confirm Order, custom orders require a 50% deposit; you
            can pay by credit card or Affirm. The remaining balance must be paid before we schedule
            final delivery.
          </p>
        ),
      },
    ],
  },
];

export default function FaqPage() {
  const entries = SECTIONS.flatMap(s => s.entries);

  return (
    <div className="container doc-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript(
            faqPageJsonLd(
              entries.map(e => ({
                question: e.question,
                answerText: nodeTextCompact(e.answer),
              })),
            ),
          ),
        }}
      />

      <p className="label-caps text-on-surface-variant">Help center</p>
      <h1 className="headline-xl">FAQ</h1>
      <p className="body-lg doc-lede">
        Straight answers about materials, finishes, conversion stages, ordering, delivery, and safe
        use of your Heirloom crib.
      </p>

      {SECTIONS.map((section, i) => (
        <div key={section.heading}>
          {i > 0 && <hr className="doc-rule" />}
          <section>
            <h2 className="headline-md">{section.heading}</h2>
            {section.entries.map(entry => (
              <div key={entry.question}>
                <h3>{entry.question}</h3>
                {entry.answer}
              </div>
            ))}
          </section>
        </div>
      ))}
    </div>
  );
}
