import React, { createContext, useContext, ReactNode } from 'react';
import { useLocationServices } from '../features/location-services/hooks/useLocationServices';
import { LocationServicesContextType } from '../features/location-services/types';
import { ProviderProps } from '../types';

const LocationServicesContext = createContext<LocationServicesContextType | undefined>(undefined);

/**
 * Location Services Provider
 * 
 * Provides geolocation and proximity capabilities across the application.
 * Integrates with the Location Services feature's hook system to manage
 * location tracking, distance calculations, and map interactions.
 */
export const LocationServicesProvider: React.FC<ProviderProps> = ({ children }) => {
  const locationServicesContext = useLocationServices();

  return (
    <LocationServicesContext.Provider value={locationServicesContext}>
      {children}
    </LocationServicesContext.Provider>
  );
};

/**
 * Hook to access Location Services context
 */
export const useLocationServicesContext = (): LocationServicesContextType => {
  const context = useContext(LocationServicesContext);
  if (!context) {
    throw new Error('useLocationServicesContext must be used within a LocationServicesProvider');
  }
  return context;
};

export default LocationServicesProvider;
