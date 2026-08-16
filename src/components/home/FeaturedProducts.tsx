import Link from 'next/link';
import { getBrowsableProducts, getTaxonomy } from '@/lib/content';
import { sourcesFor } from '@/lib/taxonomy';
import ProductCard from '@/components/products/ProductCard';
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
 * "Newly crafted to current standards", so it is the showcase shelf rather than
 * a bargain rail, and the flagship is the piece that argues for the claim.
 *
 * Cribs lead it. They were skipped at first on the grounds that StyleCards
 * covers them below - but this is the first product anyone sees on the page,
 * and a range display that opens on a dresser buries what the shop is actually
 * known for. StyleCards sells the SHAPE of a crib; this sells the piece.
 */

export default function FeaturedProducts() {
  const products = getBrowsableProducts();

  const featured = getTaxonomy()
    .map(node => {
      const sources = new Set(sourcesFor(node));
      const inNode = products.filter(p => p.category && sources.has(p.category));
      if (inNode.length === 0) return null;
      // Deterministic: highest price, then name, so the homepage does not
      // reshuffle between builds over a price tie.
      const pick = [...inNode].sort(
        (a, b) => b.minPrice - a.minPrice || a.productName.localeCompare(b.productName)
      )[0];
      return { node, product: pick };
    })
    .filter((f): f is NonNullable<typeof f> => f !== null);

  if (featured.length === 0) return null;

  return (
    <section className="home-featured" aria-labelledby="home-featured-heading">
      <div className="home-featured-intro">
        <h2 id="home-featured-heading" className="home-styles-heading">
          Across the nursery
        </h2>
        <p className="home-styles-copy">
          The same hardwoods and the same joinery, from the crib outward.
        </p>
      </div>

      <div className="featured-grid">
        {featured.map(({ node, product }) => (
          <div key={node.slug} className="home-featured-item">
            <p className="label-caps text-on-surface-variant home-featured-label">
              <Link href={`/products/${node.slug}`}>{node.name}</Link>
            </p>
            {/*
              category={null} because the label above already names this
              group. The card's own line printed the raw catalogue category
              underneath it - "Dressers & Changing Tables" then "Dressers" -
              which is the same fact twice in two different vocabularies.
              ListingAnalytics still attributes the click; ProductCard falls
              back to 'Crib' only for its data attribute.
            */}
            <ProductCard
              slug={product.slug}
              name={product.productName}
              category={null}
              minPrice={product.minPrice}
              img={product.defaultImage}
            />
          </div>
        ))}
      </div>

      {/* One delegated listener for the tiles above, as on every other grid. */}
      <ListingAnalytics />
    </section>
  );
}
