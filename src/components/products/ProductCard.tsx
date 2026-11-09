import Link from 'next/link';
import Image from 'next/image';
import { formatPriceApprox } from '@/lib/format';

interface Props {
  slug: string;
  name: string;
  category: string | null;
  minPrice: number;
  img: string | null;
  /** Set on the first row so the LCP image is not lazy-loaded. */
  priority?: boolean;
}

/* The analytics attribution lives in data attributes, so a listing needs no onClick. */
export default function ProductCard({ slug, name, category, minPrice, img, priority }: Props) {
  return (
    <Link href={`/product/${slug}`} className="piece-link" data-product-name={name} data-product-category={category ?? undefined}>
      <span className="piece-photo">
        {img ? <Image src={img} alt={name} fill sizes="(max-width: 859px) 46vw, 260px" priority={priority} /> : null}
      </span>
      <span className="piece-name">{name}</span>
      <span className="piece-meta">{formatPriceApprox(minPrice)}</span>
    </Link>
  );
}
