import { db } from '../db';

export interface LatLng {
  lat: number;
  lng: number;
}

export const locationService = {
  // Ray-casting algorithm to test point inside a polygon geofence
  isPointInPolygon(point: LatLng, polygon: LatLng[]): boolean {
    if (!polygon || polygon.length < 3) return false;
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].lat, yi = polygon[i].lng;
      const xj = polygon[j].lat, yj = polygon[j].lng;

      const intersect = ((yi > point.lng) !== (yj > point.lng))
        && (point.lat < (xj - xi) * (point.lng - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  },

  // Calculate distance between two lat/lng in kilometers (Haversine formula)
  calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return parseFloat((R * c).toFixed(2));
  },

  // Validate if delivery coordinate is inside any active service area
  findServiceAreaForLocation(point: LatLng) {
    const store = db.getStore();
    for (const sa of store.service_areas) {
      if (sa.is_active && sa.polygon && this.isPointInPolygon(point, sa.polygon)) {
        return sa;
      }
    }
    // Return null if location is outside all active boundary polygons
    return null;
  },

  // Calculate delivery fee based on Admin-configured per-km rates
  calculateDeliveryFee(distanceKm: number, serviceAreaId?: number): number {
    const store = db.getStore();
    const settings = store.settings || {};
    const sa = store.service_areas?.find((s: any) => s.id === serviceAreaId) || store.service_areas?.[0];

    const baseFare = Number(settings.delivery_base_fare ?? sa?.min_delivery_charge ?? 25);
    const baseDistanceKm = Number(settings.delivery_base_distance_km ?? 2.0);
    const perKmRate = Number(settings.delivery_per_km_rate ?? sa?.per_km_charge ?? 10);
    const minFare = Number(settings.min_delivery_fare ?? 20);

    if (distanceKm <= baseDistanceKm) {
      return Math.max(minFare, baseFare);
    }
    const extraDistance = distanceKm - baseDistanceKm;
    const extraCharge = extraDistance * perKmRate;
    return Math.max(minFare, Math.round(baseFare + extraCharge));
  },

  // Get detailed breakdown of distance and fare
  getDeliveryFareBreakdown(distanceKm: number, serviceAreaId?: number) {
    const store = db.getStore();
    const settings = store.settings || {};
    const sa = store.service_areas?.find((s: any) => s.id === serviceAreaId) || store.service_areas?.[0];

    const baseFare = Number(settings.delivery_base_fare ?? sa?.min_delivery_charge ?? 25);
    const baseDistanceKm = Number(settings.delivery_base_distance_km ?? 2.0);
    const perKmRate = Number(settings.delivery_per_km_rate ?? sa?.per_km_charge ?? 10);
    const minFare = Number(settings.min_delivery_fare ?? 20);

    const extraKm = Math.max(0, parseFloat((distanceKm - baseDistanceKm).toFixed(2)));
    const totalFee = this.calculateDeliveryFee(distanceKm, serviceAreaId);

    return {
      distanceKm,
      baseFare,
      baseDistanceKm,
      perKmRate,
      extraKm,
      minFare,
      totalFee,
      formulaText: distanceKm <= baseDistanceKm
        ? `₹${baseFare} base fare (up to ${baseDistanceKm} km)`
        : `₹${baseFare} base (${baseDistanceKm} km) + ${extraKm} km @ ₹${perKmRate}/km = ₹${totalFee}`
    };
  }

};
