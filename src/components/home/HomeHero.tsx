import PromptBar, { type PromptPlate } from '@/components/plates/PromptBar';

/*
 * The masthead. The first spread sits directly below it, and is the real hero:
 * the nursery photograph that used to be here looks generated, which is the
 * wrong opening for a catalog about real pieces from named shops.
 */
export default function HomeHero({ plates }: { plates: readonly PromptPlate[] }) {
  return (
    <section className="masthead">
      <p className="label-caps">The Heirloom Catalog · Edition No. 1</p>
      <h1>
        Find the Crib.
        <br />
        Know Who Built It.
      </h1>
      <div className="home-ornament" aria-hidden="true">
        <span className="home-ornament-rule" />
        <span className="home-ornament-diamond" />
        <span className="home-ornament-rule" />
      </div>
      <PromptBar plates={plates} />
    </section>
  );
}
