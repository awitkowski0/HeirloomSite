import Link from 'next/link';
import { getBrowsableProducts, getTaxonomy } from '@/lib/content';
import { sourcesFor } from '@/lib/taxonomy';
import PieceRow from '@/components/shop/PieceRow';
import { toShopItems } from '@/lib/shop';
import ListingAnalytics from '@/components/products/ListingAnalytics';

/**
 * One piece from each part of the range, under the provenance band.
 *
 * DERIVED, not curated. A hand-written list of featured slugs is a list that
 * goes stale the first time something is withdrawn or renamed - and the
 * homepage is the page where a broken tile costs most. This asks the taxonomy
 * what categories are live and the catalogue what is in them, so it follows the
 * shop rather than needing to be kept in step with it. Stock Toys and a toy
 * appears here, with no edit to this file.
 *
 * The dearest piece in each category, deliberately: this sits directly under
 * "Newly built to current standards", so it is the showcase shelf rather than
 * a bargain rail, and the flagship is the piece that argues for the claim.
 *
 * Cribs lead it. They were skipped at first on the grounds that StyleCards
 * covers them below - but this is the first product anyone sees on the page,
 * and a range display that opens on a dresser buries what the shop is actually
 * known for. StyleCards sells the SHAPE of a crib; this sells the piece.
 *
 * Drawn with the listing grid's cards (src/components/shop/PieceLink.tsx), the
 * new design's style: photo on the paper, name, price, builder tag. The row is
 * four wide, so with fewer live categories than that the remaining places go
 * to the next-dearest cribs, still derived, never a hand-kept list.
 */
const SHOWN = 4;

export default function FeaturedProducts() {
  const products = getBrowsableProducts();
  const byPrice = (a: { minPrice: number; productName: string }, b: { minPrice: number; productName: string }) =>
    b.minPrice - a.minPrice || a.productName.localeCompare(b.productName);

  const nodes = getTaxonomy()
    .map(node => {
      const sources = new Set(sourcesFor(node));
      // Deterministic: highest price, then name, so the homepage does not
      // reshuffle between builds over a price tie.
      return [...products.filter(p => p.category && sources.has(p.category))].sort(byPrice);
    })
    .filter(inNode => inNode.length > 0);
  if (nodes.length === 0) return null;

  // The flagship of each category, cribs first. Any places left go to the
  // next-dearest cribs, placed beside the first so the cribs read together.
  const spare = Math.max(0, SHOWN - nodes.length);
  const picks = [...nodes[0].slice(0, 1 + spare), ...nodes.slice(1).map(inNode => inNode[0])];

  return (
    <section className="home-featured" aria-labelledby="home-featured-heading">
      <div className="home-featured-intro home-featured-intro--row">
        <div>
          <h2 id="home-featured-heading" className="home-styles-heading">
            Across the nursery
          </h2>
          <p className="home-styles-copy">
            The same hardwoods and the same joinery, from the crib outward.
          </p>
        </div>
        <Link href="/products" className="filter-link">
          See everything
        </Link>
      </div>

      <PieceRow items={toShopItems(picks.slice(0, SHOWN))} />

      <p className="home-featured-more">
        <Link href="/pick" className="filter-link">
          Help me pick
        </Link>
      </p>

      {/* One delegated listener for the tiles above, as on every other grid. */}
      <ListingAnalytics />
    </section>
  );
}
