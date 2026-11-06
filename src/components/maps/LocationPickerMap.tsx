import React, { useState } from 'react';
import { Map, AdvancedMarker } from '@vis.gl/react-google-maps';
import { MapPin, Check, Crosshair } from 'lucide-react';

interface LocationPickerMapProps {
  initialLat?: number;
  initialLng?: number;
  heightClass?: string;
  onLocationSelected: (lat: number, lng: number, addressPreview?: string) => void;
  serviceAreaPolygons?: { lat: number; lng: number }[][];
}

export const LocationPickerMap: React.FC<LocationPickerMapProps> = ({
  initialLat = 22.5350,
  initialLng = 88.3600,
  heightClass = 'h-[320px]',
  onLocationSelected
}) => {
  const [markerPos, setMarkerPos] = useState<{ lat: number; lng: number }>({
    lat: initialLat,
    lng: initialLng
  });

  const handleMapClick = (e: any) => {
    if (e.detail?.latLng) {
      const lat = e.detail.latLng.lat;
      const lng = e.detail.latLng.lng;
      setMarkerPos({ lat, lng });
      onLocationSelected(lat, lng);
    }
  };

  const handleDetectGPS = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser (ব্রাউজার জিপিএস সমর্থন করে না)');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setMarkerPos({ lat, lng });
        onLocationSelected(lat, lng, 'Current GPS Location');
      },
      (err) => {
        alert('Location permission was denied. You can tap anywhere on the map to set your address pin.');
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  return (
    <div className="relative rounded-2xl overflow-hidden border border-stone-200 shadow-sm">
      <div className="absolute top-3 left-3 z-10 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl shadow-md text-xs font-semibold text-stone-700 flex items-center gap-1.5">
        <MapPin className="w-3.5 h-3.5 text-orange-600" />
        <span>Tap on map to place pin (ম্যাপে ক্লিক করে পিন বসান)</span>
      </div>

      <button
        type="button"
        onClick={handleDetectGPS}
        className="absolute top-3 right-3 z-10 bg-white hover:bg-orange-50 text-orange-600 border border-orange-200 px-3 py-1.5 rounded-xl shadow-md text-xs font-bold flex items-center gap-1.5 transition-all"
        title="Detect device GPS"
      >
        <Crosshair className="w-3.5 h-3.5" />
        <span>My GPS</span>
      </button>

      <div className={`w-full ${heightClass}`}>
        <Map
          defaultCenter={markerPos}
          defaultZoom={15}
          mapId="DEMO_MAP_ID"
          internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
          onClick={handleMapClick}
          gestureHandling="greedy"
          className="w-full h-full"
        >
          <AdvancedMarker position={markerPos}>
            <div className="flex flex-col items-center">
              <div className="bg-orange-600 text-white p-2 rounded-full shadow-2xl border-2 border-white animate-bounce">
                <MapPin className="w-5 h-5" />
              </div>
              <div className="bg-stone-900 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow mt-0.5 whitespace-nowrap">
                Delivery Point
              </div>
            </div>
          </AdvancedMarker>
        </Map>
      </div>

      <div className="bg-stone-50 px-4 py-2 text-xs text-stone-600 border-t border-stone-200 flex items-center justify-between">
        <div className="font-mono text-[11px]">
          Lat: {markerPos.lat.toFixed(5)}, Lng: {markerPos.lng.toFixed(5)}
        </div>
        <div className="text-emerald-700 font-semibold flex items-center gap-1">
          <Check className="w-3.5 h-3.5" />
          <span>Location Locked</span>
        </div>
      </div>
    </div>
  );
};
