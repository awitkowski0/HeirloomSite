import Link from 'next/link';
import Image from 'next/image';
import { formatPriceApprox } from '@/lib/format';
import { PRODUCT_IMAGE_SIZES } from '@/lib/images';

interface Props {
  slug: string;
  name: string;
  category: string | null;
  minPrice: number;
  img: string | null;
  /** Set on the first row so the LCP image is not lazy-loaded. */
  priority?: boolean;
}

/**
 * Server component: a product tile is a link, it needs no client JS.
 *
 * The analytics `source` attribution lives in data attributes rather than an
 * onClick, so that adding tracking does not turn 73 statically-rendered tiles
 * into hydrated client components. <ListingAnalytics> picks them up with one
 * delegated listener per page.
 */
export default function ProductCard({ slug, name, category, minPrice, img, priority }: Props) {
  return (
    <Link
      href={`/product/${slug}`}
      className="featured-card product-card-link"
      data-product-name={name}
      data-product-category={category || 'Crib'}
    >
      <article>
        <div className="featured-card-img">
          {img ? (
            <Image
              src={img}
              alt={name}
              fill
              sizes={PRODUCT_IMAGE_SIZES}
              priority={priority}
              style={{ objectFit: 'contain' }}
            />
          ) : (
            <span className="material-symbols-outlined product-card-placeholder" aria-hidden="true">
              crib
            </span>
          )}
        </div>
        <div className="featured-card-body">
          <span className="product-card-category">{category || 'Crib'}</span>
          <h3>{name}</h3>
          <p className="price">From {formatPriceApprox(minPrice)}</p>
        </div>
      </article>
    </Link>
  );
}
