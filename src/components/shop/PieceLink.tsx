import Image from 'next/image';
import Link from 'next/link';
import { formatPriceApprox } from '@/lib/format';
import { shortBuilderName } from '@/lib/names';
import type { ShopItem } from '@/lib/shop';
import { variantHref } from '@/lib/variants';
import Morph from '@/components/motion/Morph';

/* A photo, a name and a price. Everything else belongs on the piece's own page. */
export default function PieceLink({
  item,
  finish,
  priority,
  reason,
  hideBuilder,
  morph,
}: {
  item: ShopItem;
  finish?: string | null;
  priority?: boolean;
  reason?: string | null;
  hideBuilder?: boolean;
  /** The photo travels to the piece's page. Only on the main grid, where the name is unique. */
  morph?: boolean;
}) {
  const entry = finish ? item.finishImages.find(f => f.name === finish) : undefined;
  const image = entry?.image ?? item.image;
  const href = entry && item.finishImages.length > 1 ? variantHref(item.slug, entry.wood, entry.stainName) : `/product/${item.slug}`;
  const hover = item.hoverImage && image === item.image ? item.hoverImage : null;
  const photo = (
    <span className={hover ? 'piece-photo piece-photo--two' : 'piece-photo'} data-facing={item.facing ?? undefined}>
      {image ? <Image src={image} alt={item.name} fill sizes="(max-width: 859px) 46vw, 260px" priority={priority} /> : null}
      {hover ? <Image src={hover} alt="" fill sizes="(max-width: 859px) 46vw, 260px" className="piece-photo-hover" /> : null}
    </span>
  );
  // A sibling of the card link, not inside it: an anchor cannot nest an anchor.
  return (
    <div className="piece">
      <Link href={href} className="piece-link" data-product-name={item.name} data-product-category={item.category ?? undefined}>
        {morph ? <Morph name={`piece-${item.slug}`}>{photo}</Morph> : photo}
        <span className="piece-name">{item.name}</span>
        <span className="piece-meta">
          {item.priceVaries ? 'From ' : ''}{formatPriceApprox(item.price)}
        </span>
        {reason ? <span className="piece-meta">{reason}</span> : null}
      </Link>
      {item.builder && item.builderHref && !hideBuilder ? (
        <Link href={item.builderHref} className="piece-builder builder-name">{shortBuilderName(item.builder)}</Link>
      ) : null}
    </div>
  );
}
