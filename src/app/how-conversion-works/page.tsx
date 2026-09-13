import type { Metadata } from 'next';
import Link from 'next/link';
import BrandSketch from '@/components/marketing/BrandSketch';

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
      <p className="body-lg doc-lede">
        A 4-in-1 convertible crib is designed to move with your child through several stages. With
        the right frame and model-matched conversion kits, the same piece can support the crib,
        toddler bed, daybed, and full-size bed configurations.
      </p>
      <p>
        The exact stages and kit inclusion vary by model. The product page for each crib states which
        stages it supports and whether conversion kits are included or listed separately. If a page is
        unclear, ask us before ordering so we can confirm exactly what is in the box for that style.
      </p>

      <div className="doc-sketches">
        <BrandSketch
          src="/images/brand/crib-room-placement.jpg"
          alt="Sketch of a hardwood crib in the nursery — the first of four conversion stages"
          width={1728}
          height={1152}
          sizes="(max-width: 1199px) 100vw, 1140px"
          caption="Crib stage — the starting configuration in the nursery."
          priority
        />
      </div>

      <section>
        <h2 className="headline-md">What &ldquo;4-in-1&rdquo; means</h2>
        <p>The four configurations are:</p>
        <ol className="doc-list">
          <li>Crib</li>
          <li>Toddler bed</li>
          <li>Daybed</li>
          <li>Full-size bed</li>
        </ol>
        <p>
          Not every model supports every stage the same way, and not every model ships with every kit
          in the box.
        </p>
      </section>
      <hr className="doc-rule" />
      <section>
        <h2 className="headline-md">Why the frame matters</h2>
        <div className="doc-sketches doc-sketches--pair">
          <BrandSketch
            src="/images/brand/amish-workshop.jpg"
            alt="Sketch of a woodworking workshop where solid hardwood frames are built"
            width={1728}
            height={1152}
          />
          <BrandSketch
            src="/images/brand/wood-crafting.jpg"
            alt="Sketch of solid hardwood being crafted for a convertible crib frame"
            width={1728}
            height={1152}
          />
        </div>
        <p>
          The convertible cribs we offer are solid hardwood rather than particle board or MDF —
          made by Amish and independent US craftspeople; Heirloom is the reseller. The same posts and
          rails that form the crib become the headboard and footboard of the larger bed, so the
          underlying structure is intended to stay rigid through disassembly, reassembly, and years of
          use.
        </p>
      </section>
      <hr className="doc-rule" />
      <section>
        <h2 className="headline-md">The crib stage</h2>
        <p>
          In its first configuration, the crib is a standard full-size crib with a mattress support
          designed for a firm, tight-fitting crib mattress, following current safe-sleep guidance and
          the product&rsquo;s safety standards (meet or exceed CPSC and ASTM — see our{' '}
          <Link href="/safety" className="doc-link">
            Safety page
          </Link>
          ).
        </p>
      </section>
      <hr className="doc-rule" />
      <section>
        <h2 className="headline-md">Step 1: Convert to the toddler bed</h2>
        <div className="doc-sketches">
          <BrandSketch
            src="/images/brand/assembly.jpg"
            alt="Sketch of converting and assembling crib rails for the next stage"
            width={1408}
            height={1408}
            sizes="(max-width: 1199px) 100vw, 1140px"
          />
        </div>
        <p>
          When your child is ready to leave the crib—typically between roughly 18 months and 3 years,
          depending on the child and your pediatric guidance—the front rail is removed or replaced
          using the model-matched toddler conversion kit. The result is a low toddler bed while the
          frame remains familiar.
        </p>
        <p>
          <strong>What changes:</strong> The front crib rail comes off or is swapped for the toddler
          rail. The mattress support stays low. The bed still uses a crib or toddler mattress according
          to the product specifications.
        </p>
      </section>
      <section>
        <h2 className="headline-md">Step 2: Convert to the daybed</h2>
        <p>
          In the daybed configuration, the front rail is removed entirely and the back panel and side
          rails remain in place. The result is a three-sided bed.
        </p>
        <p>
          <strong>What changes:</strong> The front rail is removed. Back and side panels remain. No
          floor rail is required in this stage.
        </p>
      </section>
      <section>
        <h2 className="headline-md">Step 3: Convert to a full-size bed</h2>
        <p>
          For the full-size bed stage, the crib sides and front rail are replaced by the model-matched
          full conversion kit. The kit typically adds a new headboard/footboard extension or hardware
          so the original head and footboards frame a full-size mattress.
        </p>
        <p>
          <strong>What changes:</strong> Crib sides are removed; the full-size kit extends the frame.
          Use a full-size mattress according to the product specifications and kit instructions.
        </p>
      </section>
      <hr className="doc-rule" />
      <section>
        <h2 className="headline-md">Do you need a different mattress at each stage?</h2>
        <p>
          Generally, the crib stage uses a firm, tight-fitting crib mattress. Later stages may use
          different mattress sizes, such as a toddler or full-size mattress, depending on the
          configuration and kit. Always follow the product specifications and kit instructions for the
          stage you are setting up. We do not replace pediatric safe-sleep advice; see our{' '}
          <Link href="/safety" className="doc-link">
            Safety page
          </Link>{' '}
          for product standards context.
        </p>
      </section>
      <section>
        <h2 className="headline-md">Are the conversion kits included?</h2>
        <p>
          It depends on the style. Some configurations include the conversion kits with the crib;
          others list the kits separately as purchasable options. The product page shows what applies
          to each model. If you are unsure, ask us and we will confirm what is included for the exact
          SKU.
        </p>
      </section>
      <section>
        <h2 className="headline-md">Do I need to buy a new crib as my child grows?</h2>
        <p>
          That is the point of a 4-in-1: with the right kits, one solid hardwood crib can serve through
          the crib, toddler, daybed, and full-size stages. The kits are model-matched and engineered
          for the specific Heirloom frame. Use only the kit intended for your model and follow its
          instructions.
        </p>
      </section>
      <hr className="doc-rule" />
      <section>
        <h2 className="headline-md">How ordering works</h2>
        <div className="doc-sketches">
          <BrandSketch
            src="/images/brand/delivery.jpg"
            alt="Sketch of delivery arriving once your made-to-order crib is ready"
            width={1728}
            height={1152}
            sizes="(max-width: 1199px) 100vw, 1140px"
          />
        </div>
        <p>Same path as our homepage — not deposit-first:</p>
        <ol className="doc-list">
          <li>
            <strong>01 Choose and Customize</strong> — Choose your crib style; hardwood and stain
            follow. Confirm what stages and kits apply on the product page.
          </li>
          <li>
            <strong>02 Confirm Order</strong> (quality check) — Nothing is charged when you place an
            order. We call to confirm stain, kit list, and delivery before anything is built. Then a
            Stripe invoice; a minimum 50% deposit begins production.
          </li>
          <li>
            <strong>03 Built and Finishing by Hand</strong> — Amish and independent US craftspeople
            make your piece to order (typically six to eight weeks). Balance is invoiced once staining
            is complete — not before.
          </li>
          <li>
            <strong>04 Delivered to Your Nursery</strong> — Threshold or White Glove; we deliver in
            PA, NJ, NY, CT, OH, MD, and VA. Confirm your zip with us.
          </li>
        </ol>
        <p>
          Ask us before you put a deposit down if anything about stages or kits is unclear.
          Cancellation and deposit terms after payment are on the product page.
        </p>
      </section>
      <section>
        <h2 className="headline-md">What to ask before you buy</h2>
        <ul className="doc-list">
          <li>Which stages does this specific model support?</li>
          <li>Are the conversion kits included or sold separately?</li>
          <li>What mattress sizes does each stage require?</li>
          <li>What is the current lead time for my style, wood, and stain?</li>
          <li>
            Threshold or White Glove — which fits my address (and zip in PA/NJ/NY/CT/OH/MD/VA)?
          </li>
        </ul>
      </section>
    </div>
  );
}
