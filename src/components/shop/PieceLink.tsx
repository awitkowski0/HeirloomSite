import Image from 'next/image';
import Link from 'next/link';
import { formatPriceApprox } from '@/lib/format';
import type { ShopItem } from '@/lib/shop';
import { variantHref } from '@/lib/variants';

/**
 * One card in the listing grid: a photo, a name and a price, and the builder
 * tag under it. Everything else belongs on the piece's own page.
 *
 * With a `finish` (the wood-tone filter picked one), the photo and the link
 * both show that finish, so "Dark wood" shows dark cribs rather than the
 * default photo of a light one.
 *
 * The builder tag is a sibling of the card link, not inside it: an anchor
 * cannot nest an anchor. data-product-name / -category are what
 * ListingAnalytics reads off a click.
 */
export default function PieceLink({
  item,
  finish,
  priority,
}: {
  item: ShopItem;
  finish?: string | null;
  priority?: boolean;
}) {
  const entry = finish ? item.finishes.find(f => f.name === finish) : undefined;
  const image = entry?.image ?? item.defaultImage;
  const href =
    entry && item.finishes.length > 1 ? variantHref(item.slug, entry.wood, entry.stainName) : `/product/${item.slug}`;

  return (
    <div className="piece">
      <Link
        href={href}
        className="piece-link"
        data-product-name={item.productName}
        data-product-category={item.category || 'Crib'}
      >
        <span className="piece-photo">
          {image ? (
            <Image src={image} alt={item.productName} fill sizes="(max-width: 767px) 46vw, 260px" priority={priority} />
          ) : null}
        </span>
        <span className="piece-name">{item.productName}</span>
        <span className="piece-meta">
          {item.priceVaries ? 'From ' : ''}
          {formatPriceApprox(item.minPrice)}
        </span>
      </Link>
      {item.builder ? (
        <Link href={item.builder.href} className="piece-builder">
          {item.builder.name}
        </Link>
      ) : null}
    </div>
  );
}
