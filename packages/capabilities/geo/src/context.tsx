import React, { createContext, useContext } from 'react';
import { StructuredAddress } from './types.js';

export interface GeoService {
  usePlaceSuggestions: (query: string, countries: string[]) => {
    data: Array<{ placeId: string; description: string }> | undefined;
    isFetching: boolean;
  };
  usePlaceDetails: (placeId: string) => {
    data: StructuredAddress | undefined;
    isFetching: boolean;
  };
}

const GeoServiceContext = createContext<GeoService | null>(null);

export const GeoServiceProvider = ({
  children,
  service,
}: {
  children: React.ReactNode;
  service: GeoService;
}) => (
  <GeoServiceContext.Provider value={service}>{children}</GeoServiceContext.Provider>
);

export function useGeoService() {
  const context = useContext(GeoServiceContext);
  if (!context) {
    throw new Error('useGeoService must be used within a GeoServiceProvider');
  }
  return context;
}
