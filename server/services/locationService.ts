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

  // Fetch active service areas with polygon coordinates from service_areas & service_area_points
  async getActiveServiceAreas() {
    if (db.isUsingMysql()) {
      const saRes = await db.query('SELECT * FROM service_areas WHERE is_active = 1', []);
      const serviceAreas: any[] = [];

      for (const sa of saRes.rows) {
        let polygon: LatLng[] = [];
        if (sa.polygon_json) {
          try {
            polygon = JSON.parse(sa.polygon_json);
          } catch {}
        }
        if (!polygon || polygon.length === 0) {
          const pointsRes = await db.query(
            'SELECT latitude, longitude FROM service_area_points WHERE service_area_id = ? ORDER BY sequence_order ASC',
            [sa.id]
          );
          polygon = pointsRes.rows.map((p: any) => ({
            lat: Number(p.latitude),
            lng: Number(p.longitude)
          }));
        }

        serviceAreas.push({
          id: sa.id,
          name: sa.name,
          name_bn: sa.name_bn,
          min_delivery_charge: sa.min_delivery_charge != null ? Number(sa.min_delivery_charge) : null,
          per_km_charge: sa.per_km_charge != null ? Number(sa.per_km_charge) : null,
          is_active: sa.is_active,
          polygon
        });
      }
      return serviceAreas;
    }

    const store = db.getStore();
    return (store.service_areas || []).filter((sa: any) => sa.is_active);
  },

  // Validate if delivery coordinate is inside any active service area
  async findServiceAreaForLocation(point: LatLng) {
    const serviceAreas = await this.getActiveServiceAreas();
    for (const sa of serviceAreas) {
      if (sa.is_active && sa.polygon && this.isPointInPolygon(point, sa.polygon)) {
        return sa;
      }
    }
    return null;
  },

  // Calculate delivery fee based on Admin-configured per-km rates
  async calculateDeliveryFee(distanceKm: number, serviceAreaId?: number): Promise<number> {
    let settings: any = {};
    let sa: any = null;

    if (db.isUsingMysql()) {
      const settingsRes = await db.query('SELECT * FROM platform_settings LIMIT 1', []);
      if (settingsRes.rows[0]?.setting_value) {
        try { settings = JSON.parse(settingsRes.rows[0].setting_value); } catch {}
      }

      if (serviceAreaId) {
        const saRes = await db.query('SELECT * FROM service_areas WHERE id = ? LIMIT 1', [serviceAreaId]);
        sa = saRes.rows[0] || null;
      }
      if (!sa) {
        const firstSaRes = await db.query('SELECT * FROM service_areas WHERE is_active = 1 LIMIT 1', []);
        sa = firstSaRes.rows[0] || null;
      }
    } else {
      const store = db.getStore();
      settings = store.settings || {};
      sa = store.service_areas?.find((s: any) => s.id === serviceAreaId) || store.service_areas?.[0];
    }

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
  async getDeliveryFareBreakdown(distanceKm: number, serviceAreaId?: number) {
    let settings: any = {};
    let sa: any = null;

    if (db.isUsingMysql()) {
      const settingsRes = await db.query('SELECT * FROM platform_settings LIMIT 1', []);
      if (settingsRes.rows[0]?.setting_value) {
        try { settings = JSON.parse(settingsRes.rows[0].setting_value); } catch {}
      }

      if (serviceAreaId) {
        const saRes = await db.query('SELECT * FROM service_areas WHERE id = ? LIMIT 1', [serviceAreaId]);
        sa = saRes.rows[0] || null;
      }
      if (!sa) {
        const firstSaRes = await db.query('SELECT * FROM service_areas WHERE is_active = 1 LIMIT 1', []);
        sa = firstSaRes.rows[0] || null;
      }
    } else {
      const store = db.getStore();
      settings = store.settings || {};
      sa = store.service_areas?.find((s: any) => s.id === serviceAreaId) || store.service_areas?.[0];
    }

    const baseFare = Number(settings.delivery_base_fare ?? sa?.min_delivery_charge ?? 25);
    const baseDistanceKm = Number(settings.delivery_base_distance_km ?? 2.0);
    const perKmRate = Number(settings.delivery_per_km_rate ?? sa?.per_km_charge ?? 10);
    const minFare = Number(settings.min_delivery_fare ?? 20);

    const extraKm = Math.max(0, parseFloat((distanceKm - baseDistanceKm).toFixed(2)));
    const totalFee = await this.calculateDeliveryFee(distanceKm, serviceAreaId);

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
  },

  // Fetch location radius rankings from location_rankings table
  async getLocationRankings() {
    if (db.isUsingMysql()) {
      const res = await db.query('SELECT * FROM location_rankings WHERE is_active = 1', []);
      return res.rows.map((lr: any) => ({
        id: lr.id,
        name: lr.name,
        name_bn: lr.name_bn,
        lat: Number(lr.lat),
        lng: Number(lr.lng),
        radius_km: Number(lr.radius_km),
        is_active: lr.is_active,
        rankings: lr.rankings_json ? JSON.parse(lr.rankings_json) : []
      }));
    }

    const store = db.getStore();
    return (store.location_rankings || []).filter((lr: any) => lr.is_active);
  },

  // Update location ranking rankings_json
  async updateLocationRanking(id: number, rankings: any[]) {
    if (db.isUsingMysql()) {
      await db.query('UPDATE location_rankings SET rankings_json = ? WHERE id = ?', [JSON.stringify(rankings), id]);
      const res = await db.query('SELECT * FROM location_rankings WHERE id = ? LIMIT 1', [id]);
      const lr = res.rows[0];
      if (!lr) return null;
      return {
        id: lr.id,
        name: lr.name,
        name_bn: lr.name_bn,
        lat: Number(lr.lat),
        lng: Number(lr.lng),
        radius_km: Number(lr.radius_km),
        is_active: lr.is_active,
        rankings: lr.rankings_json ? JSON.parse(lr.rankings_json) : []
      };
    }

    const store = db.getStore();
    const lr = (store.location_rankings || []).find((r: any) => r.id === id);
    if (lr) {
      lr.rankings = rankings;
    }
    return lr;
  }
};
