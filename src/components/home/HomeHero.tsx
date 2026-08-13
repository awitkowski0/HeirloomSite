import Link from 'next/link';
import Image from 'next/image';
import ConversionDiagram from './ConversionDiagram';

/*
 * Four-column asymmetric hero, edge to edge.
 *
 * Not wrapped in .container on purpose: the container caps at 1280px with
 * gutters, and this needs to run full width. That is done by simply not
 * containing it rather than with a `margin-inline: calc(50% - 50vw)` bleed,
 * which overflows by the scrollbar width.
 *
 * The two "detail" frames are crops of catalogue photography. There are no
 * macro shots in the repo - all 531 product images are the same 3/4 studio
 * view - so these scale into the headboard corner, which is the one region
 * that is all wood and white. mix-blend-mode: multiply drops the white plate
 * into the cream behind.
 */

interface Props {
  /** Product page the hero's detail crops link through to. */
  detail: { slug: string; image: string; name: string } | null;
  heroImage: string;
}

export default function HomeHero({ detail, heroImage }: Props) {
  return (
    <section className="home-hero">
      <div className="home-hero-copy">
        <h1 className="home-hero-headline">
          Built from solid wood.
          <br />
          Built to grow up.
        </h1>

        <div className="home-ornament" aria-hidden="true">
          <span className="home-ornament-rule" />
          <span className="home-ornament-diamond" />
          <span className="home-ornament-rule" />
        </div>

        <p className="home-hero-sub">
          Hardwood cribs that convert to a toddler bed, a daybed, and a full-size bed.
          Made to order in brown maple, cherry and red oak.
        </p>

        <Link href="/products/cribs" className="button-primary home-hero-cta">
          View all cribs
        </Link>
      </div>

      <div className="home-hero-photo">
        <Image
          src={heroImage}
          alt="A nursery furnished with a solid hardwood crib beside a curtained window"
          fill
          priority
          sizes="(max-width: 767px) 100vw, (max-width: 1199px) 50vw, 34vw"
          style={{ objectFit: 'cover', objectPosition: '42% 55%' }}
        />
      </div>

      <div className="home-hero-details">
        {detail ? (
          <>
            {/*
              Captions name what is actually in the frame. The brief asked for
              mortise-and-tenon joinery and a brass maker's plate; neither is
              photographed anywhere in the catalogue, and captioning a crop of
              a top rail as "mortise & tenon" would be a claim about
              construction the picture does not show.
            */}
            <Link
              href={`/product/${detail.slug}`}
              className="home-detail"
              aria-label={`${detail.name}, top rail detail`}
            >
              <span
                className="home-detail-frame home-detail-frame--rail"
                style={{ backgroundImage: `url("${detail.image}")` }}
              />
              <span className="label-caps home-detail-caption">Flat top rail</span>
            </Link>
            <Link
              href={`/product/${detail.slug}`}
              className="home-detail"
              aria-label={`${detail.name}, corner post detail`}
            >
              <span
                className="home-detail-frame home-detail-frame--post"
                style={{ backgroundImage: `url("${detail.image}")` }}
              />
              <span className="label-caps home-detail-caption">Square corner post</span>
            </Link>
          </>
        ) : null}
      </div>

      <div className="home-hero-conversions">
        <ConversionDiagram />
      </div>
    </section>
  );
}
