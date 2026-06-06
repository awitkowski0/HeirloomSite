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
        // Load pre-aggregated data
        const [stainTypes, settings, showroom, inventory, images] = await Promise.all([
          loadJSON('/data/stains.json'),
          loadJSON('/data/settings.json'),
          loadJSON('/data/showroom.json'),
          loadJSON('/data/inventory.json'),
          loadJSON('/data/images.json'),
        ]);

        if (cancelled) return;

        setData({
          inventory,
          images,
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
