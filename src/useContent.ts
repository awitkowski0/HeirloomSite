import { createContext, useContext } from 'react';
import type { InventoryItem, ImageRecord, ShowroomData, StainType, AppSettings } from './types';

export interface ContentData {
  inventory: InventoryItem[];
  images: ImageRecord[];
  showroom: ShowroomData | null;
  stainTypes: StainType[];
  settings: AppSettings | null;
  loading: boolean;
}

export const ContentContext = createContext<ContentData>({
  inventory: [],
  images: [],
  showroom: null,
  stainTypes: [],
  settings: null,
  loading: true,
});

export function useContent(): ContentData {
  return useContext(ContentContext);
}
