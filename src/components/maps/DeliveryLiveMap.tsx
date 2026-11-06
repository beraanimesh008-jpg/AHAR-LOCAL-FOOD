import React, { useEffect, useState, useRef } from 'react';
import { Map, AdvancedMarker, useMap, useMapsLibrary } from '@vis.gl/react-google-maps';
import { Store, Home, Navigation, Phone, ShieldCheck } from 'lucide-react';
import { Order } from '../../types';

interface DeliveryLiveMapProps {
  order: Order;
  heightClass?: string;
  showNavigationButton?: boolean;
}

export const DeliveryLiveMap: React.FC<DeliveryLiveMapProps> = ({
  order,
  heightClass = 'h-[360px] md:h-[440px]',
  showNavigationButton = false
}) => {
  const map = useMap();
  const routesLib = useMapsLibrary('routes');
  const [directionsRenderer, setDirectionsRenderer] = useState<any>(null);
  const [routeSummary, setRouteSummary] = useState<{ distance: string; duration: string } | null>(null);

  // Fallback / simulated rider position if order is on the way
  const [riderCoords, setRiderCoords] = useState<{ lat: number; lng: number }>(() => {
    if (order.deliveryPartnerLocation) {
      return { lat: order.deliveryPartnerLocation.lat, lng: order.deliveryPartnerLocation.lng };
    }
    // Interpolate between restaurant and customer
    const midLat = (Number(order.restaurant_lat) + Number(order.delivery_lat)) / 2;
    const midLng = (Number(order.restaurant_lng) + Number(order.delivery_lng)) / 2;
    return { lat: midLat, lng: midLng };
  });

  // Smooth simulated live movement along the route if order is actively delivering
  useEffect(() => {
    if (order.status !== 'on_the_way' && order.status !== 'picked_up') return;

    const interval = setInterval(() => {
      setRiderCoords((prev) => {
        const targetLat = Number(order.delivery_lat);
        const targetLng = Number(order.delivery_lng);
        const step = 0.00015; // smooth step
        const dLat = targetLat - prev.lat;
        const dLng = targetLng - prev.lng;
        const dist = Math.sqrt(dLat * dLat + dLng * dLng);

        if (dist < 0.0003) {
          return prev; // arrived
        }
        return {
          lat: prev.lat + (dLat / dist) * step,
          lng: prev.lng + (dLng / dist) * step
        };
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [order.status, order.delivery_lat, order.delivery_lng]);

  // Set up DirectionsRenderer and compute road route
  useEffect(() => {
    if (!routesLib || !map) return;

    const renderer = new routesLib.DirectionsRenderer({
      map,
      suppressMarkers: true, // We render custom AdvancedMarkers
      polylineOptions: {
        strokeColor: '#EA580C',
        strokeWeight: 5,
        strokeOpacity: 0.85
      }
    });
    setDirectionsRenderer(renderer);

    const ds = new routesLib.DirectionsService();

    const origin =
      order.status === 'on_the_way'
        ? riderCoords
        : { lat: Number(order.restaurant_lat), lng: Number(order.restaurant_lng) };

    const destination = { lat: Number(order.delivery_lat), lng: Number(order.delivery_lng) };

    const g = (window as any).google;
    if (!g) return;

    ds.route(
      {
        origin,
        destination,
        travelMode: g.maps?.TravelMode?.DRIVING || 'DRIVING'
      },
      (result: any, status: any) => {
        if (status === 'OK' && result) {
          renderer.setDirections(result);
          const leg = result.routes[0]?.legs[0];
          if (leg) {
            setRouteSummary({
              distance: leg.distance?.text || '',
              duration: leg.duration?.text || ''
            });
          }
        } else {
          console.debug('Directions calculation info:', status);
        }
      }
    );

    return () => {
      renderer.setMap(null);
    };
  }, [routesLib, map, order.id, order.restaurant_lat, order.restaurant_lng, order.delivery_lat, order.delivery_lng]);

  // Center & bounds adjustment
  useEffect(() => {
    if (!map) return;
    const g = (window as any).google;
    if (!g?.maps?.LatLngBounds) return;
    const bounds = new g.maps.LatLngBounds();
    bounds.extend({ lat: Number(order.restaurant_lat), lng: Number(order.restaurant_lng) });
    bounds.extend({ lat: Number(order.delivery_lat), lng: Number(order.delivery_lng) });
    if (order.status === 'on_the_way' || order.status === 'picked_up') {
      bounds.extend(riderCoords);
    }
    map.fitBounds(bounds, { top: 60, right: 60, bottom: 60, left: 60 });
  }, [map, order.id, order.restaurant_lat, order.restaurant_lng, order.delivery_lat, order.delivery_lng]);

  const openGoogleMapsDirections = () => {
    const origin = encodeURIComponent(`${order.restaurant_lat},${order.restaurant_lng}`);
    const dest = encodeURIComponent(`${order.delivery_lat},${order.delivery_lng}`);
    window.open(`https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${dest}&travelmode=driving`, '_blank');
  };

  return (
    <div className="relative w-full rounded-2xl overflow-hidden shadow-md border border-stone-200">
      {/* Route distance & ETA pill */}
      {routeSummary && (
        <div className="absolute top-3 left-3 z-10 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-full shadow-lg border border-orange-200 flex items-center gap-2 text-xs font-semibold text-stone-800">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>ETA: {routeSummary.duration}</span>
          <span className="text-stone-300">|</span>
          <span>{routeSummary.distance} road distance</span>
        </div>
      )}

      {showNavigationButton && (
        <button
          onClick={openGoogleMapsDirections}
          className="absolute top-3 right-3 z-10 bg-orange-600 hover:bg-orange-700 text-white px-3 py-1.5 rounded-full shadow-lg text-xs font-bold flex items-center gap-1.5 transition-all"
        >
          <Navigation className="w-3.5 h-3.5" />
          <span>Turn-by-Turn GPS</span>
        </button>
      )}

      <div className={`w-full ${heightClass}`}>
        <Map
          defaultCenter={{ lat: Number(order.restaurant_lat), lng: Number(order.restaurant_lng) }}
          defaultZoom={14}
          mapId="DEMO_MAP_ID"
          internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
          gestureHandling="greedy"
          disableDefaultUI={false}
          className="w-full h-full"
        >
          {/* 1. Restaurant Marker */}
          <AdvancedMarker
            position={{ lat: Number(order.restaurant_lat), lng: Number(order.restaurant_lng) }}
            title={order.restaurant_name}
          >
            <div className="bg-orange-600 text-white p-2 rounded-xl shadow-lg border-2 border-white flex items-center gap-1.5 hover:scale-105 transition-transform">
              <Store className="w-4 h-4" />
              <span className="text-[11px] font-bold max-w-[120px] truncate hidden sm:inline">
                {order.restaurant_name}
              </span>
            </div>
          </AdvancedMarker>

          {/* 2. Customer Delivery Destination Marker */}
          <AdvancedMarker
            position={{ lat: Number(order.delivery_lat), lng: Number(order.delivery_lng) }}
            title="Delivery Destination"
          >
            <div className="bg-blue-600 text-white p-2 rounded-xl shadow-lg border-2 border-white flex items-center gap-1.5 hover:scale-105 transition-transform">
              <Home className="w-4 h-4" />
              <span className="text-[11px] font-bold hidden sm:inline">Customer (গ্রাহক)</span>
            </div>
          </AdvancedMarker>

          {/* 3. Delivery Partner Marker (shown during active delivery) */}
          {(order.status === 'on_the_way' || order.status === 'picked_up' || order.status === 'assigned') && (
            <AdvancedMarker
              position={riderCoords}
              title={order.delivery_partner_name || 'Delivery Partner'}
            >
              <div className="relative">
                <div className="bg-emerald-600 text-white px-2.5 py-1.5 rounded-full shadow-2xl border-2 border-white flex items-center gap-1.5 rider-marker-pulse">
                  <span className="text-base leading-none">🛵</span>
                  <div className="text-[10px] font-extrabold leading-tight">
                    <div>{order.delivery_partner_name || 'Rider'}</div>
                    <div className="text-[8px] opacity-90">Live GPS</div>
                  </div>
                </div>
              </div>
            </AdvancedMarker>
          )}
        </Map>
      </div>

      {/* Driver card footer banner */}
      {order.delivery_partner_name && (
        <div className="bg-white px-4 py-2.5 border-t border-stone-100 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-sm">
              {order.delivery_partner_name.charAt(0)}
            </div>
            <div>
              <div className="font-bold text-stone-900 flex items-center gap-1">
                {order.delivery_partner_name}
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 inline" />
              </div>
              <div className="text-stone-500 text-[11px]">
                {order.status === 'on_the_way' ? 'Delivering on Bike (রাস্তায় আছেন)' : 'Assigned Rider'}
              </div>
            </div>
          </div>
          {order.delivery_partner_phone && (
            <a
              href={`tel:${order.delivery_partner_phone}`}
              className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 text-xs border border-emerald-200"
            >
              <Phone className="w-3 h-3" />
              <span>Call Rider</span>
            </a>
          )}
        </div>
      )}
    </div>
  );
};
