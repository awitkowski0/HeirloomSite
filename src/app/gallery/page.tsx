import type { Metadata } from 'next';
import { getInventory } from '@/lib/content';
import { itemListJsonLd,
  jsonLdScript,
} from '@/lib/seo';
import GalleryBrowser from '@/components/gallery/GalleryBrowser';
import type { GalleryProduct } from '@/components/gallery/types';

export const metadata: Metadata = {
  title: 'Gallery',
  description:
    'Browse every crib finish we offer. Compare Brown Maple, Cherry and Red Oak across our full range of hand-applied stains.',
  alternates: { canonical: '/gallery' },
};

/** The gallery shows only the three solid-hardwood crib lines. */
const GALLERY_WOODS = ['BrownMaple', 'CherryWood', 'RedOak'];

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
        <h1 className="headline-lg text-primary">The Gallery</h1>
        <p className="body-lg text-on-surface-variant">
          Every crib, in every wood and finish we offer.
        </p>
      </div>

      <GalleryBrowser products={products} woods={woods} />
    </div>
  );
}
