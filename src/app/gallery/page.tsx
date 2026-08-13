import type { Metadata } from 'next';
import { getInventory } from '@/lib/content';
import { itemListJsonLd,
  jsonLdScript,
} from '@/lib/seo';
import GalleryBrowser from '@/components/gallery/GalleryBrowser';
import type { GalleryProduct } from '@/components/gallery/types';

export const metadata: Metadata = {
  // The page's own name, matching its h1 and the nav label. The route stays
  // /gallery; only what the page calls itself changed.
  title: 'Collections',
  description:
    'Browse every crib finish we offer, in hand-stained solid Brown Maple.',
  alternates: { canonical: '/gallery' },
};

/*
 * The gallery shows the solid-hardwood crib lines -- the products whose variant
 * is a wood species rather than a finish or a rug size.
 *
 * Brown Maple is the only species the shop actually sells. Cherry and Red Oak
 * are still in the source data but are marked `hidden` in variants.json, so
 * they never reach the inventory artifact this reads; this list is the second
 * half of that decision and would need to grow again before either could
 * reappear here.
 */
const GALLERY_WOODS = ['BrownMaple'];

function buildGalleryProducts(): { products: GalleryProduct[]; woods: string[] } {
  const items = getInventory().filter(i => GALLERY_WOODS.includes(i.wood) && i.slug);
  const byName = new Map<string, GalleryProduct>();

  for (const item of items) {
    const existing = byName.get(item.productName);
    const stains = item.stains.map(s => ({
      name: s.name,
      image: s.image ?? undefined,
      priceAddition: s.priceAddition,
      inStock: s.inStock,
    }));

    if (existing) {
      if (item.basePrice < existing.minPrice) existing.minPrice = item.basePrice;
      if (!existing.woods.includes(item.wood)) existing.woods.push(item.wood);
      existing.woodStains[item.wood] ??= stains;
      existing.woodPrices[item.wood] ??= item.basePrice;
    } else {
      byName.set(item.productName, {
        slug: item.slug as string,
        name: item.productName,
        minPrice: item.basePrice,
        woods: [item.wood],
        woodStains: { [item.wood]: stains },
        woodPrices: { [item.wood]: item.basePrice },
      });
    }
  }

  const products = [...byName.values()];
  const woods = GALLERY_WOODS.filter(w => products.some(p => p.woods.includes(w)));
  return { products, woods };
}

export default function GalleryPage() {
  const { products, woods } = buildGalleryProducts();

  return (
    <div className="gallery-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript(
            itemListJsonLd(
              products.map(p => ({
                productName: p.name,
                slug: p.slug,
                category: 'Cribs',
                minPrice: p.minPrice,
                defaultImage: null,
              })),
              '/gallery'
            )
          ),
        }}
      />

      <div className="container page-header">
        {/* The gallery previously had no h1 or h2 at all - its highest heading
            was the h3 inside each card. */}
        {/* Matches the "Collections" nav label that leads here. */}
        <h1 className="headline-lg text-primary">Collections</h1>
        <p className="body-lg text-on-surface-variant">
          Every crib, in every finish we offer.
        </p>
      </div>

      <GalleryBrowser products={products} woods={woods} />
    </div>
  );
}
