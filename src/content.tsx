import { useEffect, useState, type ReactNode } from 'react';
import { ContentContext, type ContentData } from './useContent';

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
        const [inventory, images, showroom, stainTypes, settings] = await Promise.all([
          fetch('/data/inventory.json').then(r => r.json()),
          fetch('/data/images.json').then(r => r.json()),
          fetch('/data/showroom.json').then(r => r.json()),
          fetch('/data/stain-types.json').then(r => r.json()),
          fetch('/data/settings.json').then(r => r.json()),
        ]);
        if (!cancelled) {
          setData({ inventory, images, showroom, stainTypes, settings, loading: false });
        }
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
