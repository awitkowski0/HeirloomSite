import Image from 'next/image';
import Link from 'next/link';
import { formatPriceApprox } from '@/lib/format';
import { shortBuilderName } from '@/lib/names';
import type { ShopItem } from '@/lib/shop';
import { variantHref } from '@/lib/variants';

/* A photo, a name and a price. Everything else belongs on the piece's own page. */
export default function PieceLink({
  item,
  finish,
  priority,
  reason,
}: {
  item: ShopItem;
  finish?: string | null;
  priority?: boolean;
  reason?: string | null;
}) {
  const entry = finish ? item.finishImages.find(f => f.name === finish) : undefined;
  const image = entry?.image ?? item.image;
  const href = entry && item.finishImages.length > 1 ? variantHref(item.slug, entry.wood, entry.stainName) : `/product/${item.slug}`;
  return (
    <Link href={href} className="piece-link" data-product-name={item.name} data-product-category={item.category ?? undefined}>
      <span className="piece-photo">
        {image ? <Image src={image} alt={item.name} fill sizes="(max-width: 859px) 46vw, 260px" priority={priority} /> : null}
      </span>
      <span className="piece-name">{item.name}</span>
      <span className="piece-meta">
        {item.priceVaries ? 'From ' : ''}{formatPriceApprox(item.price)}
        {item.builder ? ` · ${shortBuilderName(item.builder)}` : ''}
      </span>
      {reason ? <span className="piece-meta">{reason}</span> : null}
    </Link>
  );
}
