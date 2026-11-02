import type { Metadata } from 'next';
import Link from 'next/link';
import BrandSketch from '@/components/marketing/BrandSketch';

export const metadata: Metadata = {
  title: 'How Our 4-in-1 Conversion Works',
  description:
    'How a 4-in-1 convertible crib converts to a toddler bed and a full-size bed, what Old Town Oak and Fisher\'s say, and what to check before you buy.',
  alternates: { canonical: '/how-conversion-works' },
  openGraph: { url: '/how-conversion-works' },
};

export default function ConversionPage() {
  return (
    <div className="container doc-page">
      <p className="label-caps text-on-surface-variant">Owner&rsquo;s guide</p>
      <h1 className="headline-xl">How Our 4-in-1 Conversion Works</h1>
      <p className="body-lg doc-lede">
        A 4-in-1 convertible crib is a crib that converts to a toddler bed, a day bed, and a
        full-size bed. Our builders describe the stages a little differently, so this page uses
        their own words.
      </p>
      <p>
        The stages and kits vary by model. Each product page lists the conversion kits for that
        crib. If anything is unclear, ask us before you order and we&rsquo;ll confirm which kits fit
        your model.
      </p>

      <div className="doc-sketches">
        <BrandSketch
          src="/images/brand/crib-room-placement.jpg"
          alt="Sketch of a crib in a nursery, the first stage of conversion"
          width={1728}
          height={1152}
          sizes="(max-width: 1199px) 100vw, 1140px"
          caption="Crib stage — the starting configuration in the nursery."
          priority
        />
      </div>

      <section>
        <h2 className="headline-md">What &ldquo;4-in-1&rdquo; means</h2>
        <p>
          4-in-1 is the common name for a crib that converts to a toddler bed, a day bed, and a
          full-size bed. Our builders describe it in their own ways:
        </p>
        <ul className="doc-list">
          <li>
            Old Town Oak describes three stages: crib, toddler bed, and double bed. Its catalog notes
            that the toddler bed can be used as a day bed: &ldquo;Use as a day bed for toddlers to
            preschoolers.&rdquo;
          </li>
          <li>
            Fisher&rsquo;s sells one conversion kit that makes a toddler bed or a day bed. Its catalog
            describes it as a &ldquo;Toddler Bed/Day Bed Conversion Kit: Includes day bed frame,
            toddler bed rail, and hardware.&rdquo;
          </li>
        </ul>
        <p>
          Not every model supports every stage in the same way. Check the product page for the
          stages and kits that apply to your crib.
        </p>
      </section>
      <hr className="doc-rule" />
      <section>
        <h2 className="headline-md">Step 1: The crib</h2>
        <p>
          Every convertible crib starts as a crib. Old Town Oak says to &ldquo;use as a crib for
          newborn to toddler stage.&rdquo; Follow the manufacturer&rsquo;s instructions for your model,
          and see our{' '}
          <Link href="/safety" className="doc-link">
            Safety page
          </Link>{' '}
          for how we handle safety information.
        </p>
      </section>
      <section>
        <h2 className="headline-md">Step 2: The toddler bed</h2>
        <div className="doc-sketches">
          <BrandSketch
            src="/images/brand/assembly.jpg"
            alt="Sketch of a hex key, a bolt, and a washer beside wood shavings on paper"
            width={1408}
            height={1408}
            sizes="(max-width: 1199px) 100vw, 1140px"
          />
        </div>
        <p>
          When your child is ready to move out of the crib, you add the toddler bed conversion kit
          for your model. Old Town Oak describes this stage as a toddler bed that can also be used as
          a day bed. With Fisher&rsquo;s, one conversion kit makes a toddler bed or a day bed.
        </p>
      </section>
      <section>
        <h2 className="headline-md">Step 3: The full-size bed</h2>
        <p>
          For the full-size bed, you add the full-size bed conversion kit for your model. Old Town
          Oak lists this stage as the double bed, which is a full-size bed. Use the mattress size
          that your model&rsquo;s instructions call for.
        </p>
      </section>
      <p>Check the product page for which kits fit your model.</p>
      <hr className="doc-rule" />
      <section>
        <h2 className="headline-md">Which mattress does each stage use?</h2>
        <p>
          Mattress sizes depend on the stage and the model. Follow your model&rsquo;s instructions for
          each stage, or ask us and we&rsquo;ll confirm before you order.
        </p>
      </section>
      <section>
        <h2 className="headline-md">Are the conversion kits included?</h2>
        <p>
          It depends on the model. The product page lists the kits for each one, and you can add
          them to your order. If you&rsquo;re unsure, ask us and we&rsquo;ll confirm exactly what comes
          with your piece.
        </p>
      </section>
      <section>
        <h2 className="headline-md">Do I need to buy a new crib as my child grows?</h2>
        <p>
          That is the idea behind a 4-in-1: with the right kits, one crib can take you from the
          nursery to a toddler bed and a full-size bed. Kits are made for specific models, so use
          only the kit made for your model and follow its instructions.
        </p>
      </section>
      <hr className="doc-rule" />
      <section>
        <h2 className="headline-md">How ordering works</h2>
        <p>Nothing is charged when you place an order. Here&rsquo;s the path from order to delivery:</p>
        <ol className="doc-list">
          <li>
            <strong>Choose and Customize.</strong> Choose your crib model and finish. The product
            page shows which stages and kits apply.
          </li>
          <li>
            <strong>Confirm Order.</strong> We call to confirm your finish, the kit list, and your
            delivery before anything is built. Then we send a Stripe invoice, and a 50% deposit
            begins production.
          </li>
          <li>
            <strong>Made to Order.</strong> Every piece is made to order. Lead times are estimates
            that we confirm when you order: Old Town Oak about 6–8 weeks, Kids Comfort about 8 weeks,
            and Fisher&rsquo;s 10–14 weeks. We&rsquo;ll collect the remaining balance before we
            schedule final delivery.
          </li>
          <li>
            <strong>Delivered to Your Nursery.</strong> You choose Curbside or White Glove. Shipping
            is charged separately, and assembly comes only with White Glove. See our{' '}
            <Link href="/shipping" className="doc-link">
              Delivery page
            </Link>{' '}
            for the areas we serve.
          </li>
        </ol>
        <p>
          Ask us before you put a deposit down if anything about stages or kits is unclear.
          Cancellation and deposit terms are on our{' '}
          <Link href="/returns">Returns, Cancellations &amp; Refunds page</Link>.
        </p>
      </section>
      <section>
        <h2 className="headline-md">What to ask before you buy</h2>
        <ul className="doc-list">
          <li>Which conversion kits are listed for my model?</li>
          <li>Which stages does my model support?</li>
          <li>What mattress size does each stage use?</li>
          <li>Does my model take the same guard rails as the other models?</li>
          <li>Curbside or White Glove: which fits my address?</li>
        </ul>
      </section>
    </div>
  );
}
