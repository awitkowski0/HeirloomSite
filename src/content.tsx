import { useEffect, useState, type ReactNode } from 'react';
import { ContentContext, type ContentData } from './useContent';

async function loadJSON(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load ${url}`);
  return res.json();
}

export function ContentProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<ContentData>({
    inventory: [],
    images: [],
    showroom: null,
    stainTypes: [],
    settings: null,
    loading: true,
  });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        // Load shared data
        const [stainTypes, settings, showroom, productsIndex] = await Promise.all([
          loadJSON('/data/stains.json'),
          loadJSON('/data/settings.json'),
          loadJSON('/data/showroom.json'),
          loadJSON('/data/products.json'),
        ]);

        if (cancelled) return;

        // Load individual product files
        const productRequests = productsIndex.map((p: any) =>
          loadJSON(`/data/products/${encodeURIComponent(p.productName)}/product.json`)
            .catch(() => null)
        );
        const variantRequests = productsIndex.map((p: any) =>
          loadJSON(`/data/products/${encodeURIComponent(p.productName)}/variants.json`)
            .catch(() => null)
        );
        const mediaRequests = productsIndex.map((p: any) =>
          loadJSON(`/data/products/${encodeURIComponent(p.productName)}/media.json`)
            .catch(() => null)
        );

        const [products, variantsList, mediaList] = await Promise.all([
          Promise.all(productRequests),
          Promise.all(variantRequests),
          Promise.all(mediaRequests),
        ]);

        if (cancelled) return;

        // Reconstruct flat inventory for search and backward compatibility
        const inventory: any[] = [];
        const allImages: any[] = [];

        for (let i = 0; i < productsIndex.length; i++) {
          const meta = productsIndex[i];
          const prod = products[i] || {};
          const variants = variantsList[i] || [];
          const media = mediaList[i] || {};

      for (const v of variants) {
            const imageBase = `/data/products/${encodeURIComponent(meta.productName)}/`;
            const stains = (v.stains || []).map((stainName: string) => {
              const mediaKey = `${v.variant}||${stainName}`;
              const images = (media[mediaKey] || []) as string[];
              const firstImage = images[0] ? imageBase + images[0] : null;
              const gallery = images.slice(1).map((url: string) => ({ url: imageBase + url }));

              return {
                name: stainName,
                inStock: true,
                priceAddition: 0,
                image: firstImage,
                gallery: gallery.length > 0 ? gallery : undefined,
              };
            });

            inventory.push({
              productName: prod.productName || meta.productName,
              wood: v.variant,
              category: prod.category || meta.category || null,
              description: prod.description || null,
              extendedDescription: prod.extendedDescription || null,
              basePrice: v.basePrice,
              order: null,
              tags: prod.tags || [],
              sku: v.sku || null,
              slug: null,
              dimensions: v.dimensions || null,
              weight: v.weight ?? null,
              addons: prod.addons || [],
              stains,
            });

            // Add to images list
            for (const [mediaKey, paths] of Object.entries(media)) {
              const [wood, stain] = mediaKey.split('||');
              const imageBase = `/data/products/${encodeURIComponent(prod.productName || meta.productName)}/`;
              (paths as string[]).forEach((path, idx) => {
                allImages.push({
                  productName: prod.productName || meta.productName,
                  wood,
                  stainName: stain || null,
                  path: imageBase + path,
                  order: idx,
                });
              });
            }
          }
        }

        setData({
          inventory,
          images: allImages,
          showroom,
          stainTypes,
          settings,
          loading: false,
        });
      } catch (e) {
        console.error('Failed to load content:', e);
        if (!cancelled) {
          setData(prev => ({ ...prev, loading: false }));
        }
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  return <ContentContext.Provider value={data}>{children}</ContentContext.Provider>;
}
