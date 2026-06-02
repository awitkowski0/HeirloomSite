import { createContext, useContext } from 'react';

export interface ContentData {
  inventory: any[];
  images: any[];
  showroom: any;
  stainTypes: any[];
  settings: any;
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
