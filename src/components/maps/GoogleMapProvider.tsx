import React from 'react';
import { APIProvider } from '@vis.gl/react-google-maps';

export const GOOGLE_MAPS_API_KEY =
  (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY ||
  'AIzaSyDtq7elVFXAACgClcIB2rR7OAnz4waWNeA';

interface GoogleMapProviderProps {
  children: React.ReactNode;
}

export const GoogleMapProvider: React.FC<GoogleMapProviderProps> = ({ children }) => {
  return (
    <APIProvider apiKey={GOOGLE_MAPS_API_KEY} solutionChannel="GMP_aistudio">
      {children}
    </APIProvider>
  );
};
