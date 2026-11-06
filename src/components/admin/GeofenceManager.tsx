import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Map, AdvancedMarker, useMap } from '@vis.gl/react-google-maps';
import {
  MapPin,
  Plus,
  Trash2,
  Edit3,
  Check,
  X,
  Shield,
  RefreshCw,
  Navigation,
  AlertTriangle,
  Layers,
  Eye,
  CheckCircle2,
  ChevronRight,
  HelpCircle,
  Compass,
  Info,
  Save,
  RotateCcw,
  Crosshair,
  Store,
  Sliders,
  DollarSign
} from 'lucide-react';
import { ServiceArea, Restaurant } from '../../types';
import { apiRequest } from '../../services/api';

// Point-in-polygon ray casting algorithm
const isPointInPolygon = (point: { lat: number; lng: number }, polygon: { lat: number; lng: number }[]) => {
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
};

// Calculate polygon centroid for centering map & labels
const calculateCentroid = (polygon: { lat: number; lng: number }[]) => {
  if (!polygon || polygon.length === 0) return { lat: 22.5400, lng: 88.3600 };
  let totalLat = 0;
  let totalLng = 0;
  for (const pt of polygon) {
    totalLat += pt.lat;
    totalLng += pt.lng;
  }
  return {
    lat: totalLat / polygon.length,
    lng: totalLng / polygon.length
  };
};

// Helper: Generate polygon circle coordinates around a center point
const generateCirclePolygon = (center: { lat: number; lng: number }, radiusKm: number, numPoints = 12) => {
  const points: { lat: number; lng: number }[] = [];
  const latR = radiusKm / 111.32;
  const lngR = radiusKm / (111.32 * Math.cos((center.lat * Math.PI) / 180));

  for (let i = 0; i < numPoints; i++) {
    const angle = (i * 2 * Math.PI) / numPoints;
    points.push({
      lat: parseFloat((center.lat + latR * Math.cos(angle)).toFixed(6)),
      lng: parseFloat((center.lng + lngR * Math.sin(angle)).toFixed(6))
    });
  }
  return points;
};

// Color palettes for different geofence zones
const ZONE_COLORS = [
  { stroke: '#7c3aed', fill: '#8b5cf6', name: 'Purple (পার্পল)' },
  { stroke: '#059669', fill: '#10b981', name: 'Emerald (সবুজ)' },
  { stroke: '#0284c7', fill: '#0ea5e9', name: 'Sky Blue (নীল)' },
  { stroke: '#ea580c', fill: '#f97316', name: 'Orange (কমলা)' },
  { stroke: '#e11d48', fill: '#f43f5e', name: 'Rose (গোলাপি)' }
];

// Quick boundary presets
const AREA_PRESETS = [
  {
    name: 'Central & South Kolkata Zone',
    name_bn: 'সেন্ট্রাল ও সাউথ কলকাতা সার্ভিস এরিয়া',
    min_delivery_charge: 25,
    per_km_charge: 8,
    polygon: [
      { lat: 22.5850, lng: 88.3300 },
      { lat: 22.5850, lng: 88.3850 },
      { lat: 22.5100, lng: 88.3900 },
      { lat: 22.5050, lng: 88.3350 },
      { lat: 22.5400, lng: 88.3200 }
    ]
  },
  {
    name: 'Salt Lake & New Town Delivery Zone',
    name_bn: 'সল্টলেক ও নিউ টাউন ডেলিভারি এরিয়া',
    min_delivery_charge: 30,
    per_km_charge: 9,
    polygon: [
      { lat: 22.6000, lng: 88.4000 },
      { lat: 22.6000, lng: 88.4750 },
      { lat: 22.5400, lng: 88.4750 },
      { lat: 22.5400, lng: 88.4050 }
    ]
  },
  {
    name: 'North Kolkata & Dum Dum Zone',
    name_bn: 'উত্তর কলকাতা ও দমদম সার্ভিস এরিয়া',
    min_delivery_charge: 25,
    per_km_charge: 8,
    polygon: [
      { lat: 22.6450, lng: 88.3600 },
      { lat: 22.6450, lng: 88.4150 },
      { lat: 22.5850, lng: 88.4000 },
      { lat: 22.5850, lng: 88.3500 }
    ]
  },
  {
    name: 'Howrah Central & Shibpur Zone',
    name_bn: 'হাওড়া সেন্ট্রাল ও শিবপুর সার্ভিস এরিয়া',
    min_delivery_charge: 25,
    per_km_charge: 8,
    polygon: [
      { lat: 22.6200, lng: 88.2900 },
      { lat: 22.6200, lng: 88.3450 },
      { lat: 22.5550, lng: 88.3250 },
      { lat: 22.5550, lng: 88.2800 }
    ]
  },
  {
    name: 'Diamond Harbour & Raidighi Zone',
    name_bn: 'ডায়মন্ড হারবার ও রায়দিঘী সার্ভিস এরিয়া',
    min_delivery_charge: 35,
    per_km_charge: 10,
    polygon: [
      { lat: 22.0400, lng: 88.3900 },
      { lat: 22.0400, lng: 88.4800 },
      { lat: 21.9500, lng: 88.4800 },
      { lat: 21.9500, lng: 88.3900 }
    ]
  }
];

// Inner component to mount Google Maps native Polygon with editable drag points
const GoogleMapPolygonRenderer: React.FC<{
  paths: { lat: number; lng: number }[];
  strokeColor?: string;
  fillColor?: string;
  fillOpacity?: number;
  strokeWeight?: number;
  editable?: boolean;
  onPolygonChange?: (newPaths: { lat: number; lng: number }[]) => void;
}> = ({
  paths,
  strokeColor = '#7c3aed',
  fillColor = '#8b5cf6',
  fillOpacity = 0.25,
  strokeWeight = 2.5,
  editable = false,
  onPolygonChange
}) => {
  const map = useMap();
  const polygonRef = useRef<google.maps.Polygon | null>(null);

  useEffect(() => {
    if (!map || typeof google === 'undefined' || !google.maps || !google.maps.Polygon) return;

    const polygon = new google.maps.Polygon({
      paths,
      strokeColor,
      strokeOpacity: 0.9,
      strokeWeight,
      fillColor,
      fillOpacity,
      editable,
      draggable: false,
      map
    });

    polygonRef.current = polygon;

    if (editable && onPolygonChange) {
      const path = polygon.getPath();
      const updateCoords = () => {
        const coords: { lat: number; lng: number }[] = [];
        for (let i = 0; i < path.getLength(); i++) {
          const pt = path.getAt(i);
          coords.push({
            lat: parseFloat(pt.lat().toFixed(6)),
            lng: parseFloat(pt.lng().toFixed(6))
          });
        }
        onPolygonChange(coords);
      };

      const setAtListener = path.addListener('set_at', updateCoords);
      const insertAtListener = path.addListener('insert_at', updateCoords);
      const removeAtListener = path.addListener('remove_at', updateCoords);

      return () => {
        google.maps.event.removeListener(setAtListener);
        google.maps.event.removeListener(insertAtListener);
        google.maps.event.removeListener(removeAtListener);
        polygon.setMap(null);
      };
    }

    return () => {
      polygon.setMap(null);
    };
  }, [map, strokeColor, fillColor, fillOpacity, strokeWeight, editable]);

  // Keep coordinates updated if external paths change when not actively dragging
  useEffect(() => {
    if (polygonRef.current && !editable) {
      polygonRef.current.setPaths(paths);
    }
  }, [paths, editable]);

  return null;
};

interface GeofenceManagerProps {
  serviceAreas: ServiceArea[];
  restaurants?: Restaurant[];
  onRefresh: () => void;
}

export const GeofenceManager: React.FC<GeofenceManagerProps> = ({
  serviceAreas,
  restaurants = [],
  onRefresh
}) => {
  // Selected area for focus on map
  const [selectedAreaId, setSelectedAreaId] = useState<number | null>(serviceAreas[0]?.id || null);

  // Editor Modal / Drawer state (create or edit)
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingArea, setEditingArea] = useState<Partial<ServiceArea> | null>(null);
  const [editorMode, setEditorMode] = useState<'edit' | 'create'>('create');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Editor Interactive State
  const [clickToAddPoints, setClickToAddPoints] = useState(true);
  const [activeTabSub, setActiveTabSub] = useState<'map' | 'coords' | 'presets' | 'circle'>('map');
  const [circleRadiusKm, setCircleRadiusKm] = useState(4);

  // Live Location Geofence Tester State
  const [testPin, setTestPin] = useState<{ lat: number; lng: number } | null>(null);
  const [testResult, setTestResult] = useState<string | null>(null);

  // Current active service area object
  const currentArea = useMemo(() => {
    return serviceAreas.find((s) => s.id === selectedAreaId) || serviceAreas[0] || null;
  }, [serviceAreas, selectedAreaId]);

  // Open Edit Mode for an existing area
  const handleStartEdit = (area: ServiceArea) => {
    setEditorMode('edit');
    setEditingArea({
      ...area,
      polygon: [...area.polygon.map((p) => ({ ...p }))]
    });
    setClickToAddPoints(false);
    setIsEditorOpen(true);
    setSaveMessage('');
    setErrorMessage('');
  };

  // Open Create Mode for a new area
  const handleStartCreate = () => {
    setEditorMode('create');
    const defaultCentroid = currentArea?.polygon?.[0] || { lat: 22.5500, lng: 88.3600 };
    setEditingArea({
      name: '',
      name_bn: '',
      min_delivery_charge: 25,
      per_km_charge: 8,
      is_active: 1,
      polygon: [
        { lat: defaultCentroid.lat + 0.02, lng: defaultCentroid.lng - 0.02 },
        { lat: defaultCentroid.lat + 0.02, lng: defaultCentroid.lng + 0.02 },
        { lat: defaultCentroid.lat - 0.02, lng: defaultCentroid.lng + 0.02 },
        { lat: defaultCentroid.lat - 0.02, lng: defaultCentroid.lng - 0.02 }
      ]
    });
    setClickToAddPoints(true);
    setIsEditorOpen(true);
    setSaveMessage('');
    setErrorMessage('');
  };

  // Toggle active/inactive
  const handleToggleStatus = async (id: number) => {
    try {
      await apiRequest(`/api/admin/service-areas/${id}/toggle-status`, {
        method: 'PUT'
      });
      onRefresh();
    } catch (e: any) {
      alert(e.message || 'Failed to toggle status');
    }
  };

  // Delete service area
  const handleDeleteArea = async (id: number, name: string) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"? Restaurants and deliveries in this zone will be affected.`)) {
      return;
    }
    try {
      await apiRequest(`/api/admin/service-areas/${id}`, {
        method: 'DELETE'
      });
      if (selectedAreaId === id) {
        setSelectedAreaId(null);
      }
      onRefresh();
    } catch (e: any) {
      alert(e.message || 'Failed to delete service area');
    }
  };

  // Save changes (Create or Update)
  const handleSaveArea = async () => {
    if (!editingArea) return;
    if (!editingArea.name?.trim()) {
      setErrorMessage('Please provide a Service Area Name (e.g. South Kolkata Zone).');
      return;
    }
    if (!editingArea.polygon || editingArea.polygon.length < 3) {
      setErrorMessage('A valid geofence polygon requires at least 3 boundary vertices.');
      return;
    }

    setIsSaving(true);
    setErrorMessage('');
    setSaveMessage('');

    try {
      if (editorMode === 'create') {
        const res = await apiRequest('/api/admin/service-areas', {
          method: 'POST',
          body: JSON.stringify(editingArea)
        });
        setSaveMessage('New Service Area Geofence created successfully! (নতুন সার্ভিস এরিয়া তৈরি হয়েছে)');
        setTimeout(() => {
          setIsEditorOpen(false);
          onRefresh();
          if (res?.data?.id) setSelectedAreaId(res.data.id);
        }, 1200);
      } else {
        await apiRequest(`/api/admin/service-areas/${editingArea.id}`, {
          method: 'PUT',
          body: JSON.stringify(editingArea)
        });
        setSaveMessage('Service Area boundary and rates updated successfully! (সীমানা ও রেট আপডেট হয়েছে)');
        setTimeout(() => {
          setIsEditorOpen(false);
          onRefresh();
        }, 1200);
      }
    } catch (e: any) {
      setErrorMessage(e.message || 'Failed to save service area');
    } finally {
      setIsSaving(false);
    }
  };

  // Map Click Handler in Editor Mode
  const handleEditorMapClick = (e: any) => {
    if (!isEditorOpen || !editingArea) return;
    if (!clickToAddPoints) return;

    const latLng = e.detail?.latLng;
    if (latLng) {
      const newPoint = {
        lat: parseFloat(latLng.lat.toFixed(6)),
        lng: parseFloat(latLng.lng.toFixed(6))
      };
      setEditingArea((prev) => ({
        ...prev,
        polygon: [...(prev?.polygon || []), newPoint]
      }));
    }
  };

  // Live Location Tester Map Click
  const handleTesterMapClick = (e: any) => {
    if (isEditorOpen) return;
    const latLng = e.detail?.latLng;
    if (!latLng) return;

    const point = {
      lat: parseFloat(latLng.lat.toFixed(6)),
      lng: parseFloat(latLng.lng.toFixed(6))
    };

    setTestPin(point);

    // Find which area it falls in
    let matchedArea: ServiceArea | null = null;
    for (const sa of serviceAreas) {
      if (sa.is_active && isPointInPolygon(point, sa.polygon)) {
        matchedArea = sa;
        break;
      }
    }

    if (matchedArea) {
      setTestResult(`✓ Inside Service Area: "${matchedArea.name}" (${matchedArea.name_bn || ''}). Base: ₹${matchedArea.min_delivery_charge}, Rate: ₹${matchedArea.per_km_charge}/km.`);
    } else {
      setTestResult(`✗ Outside all active service areas. Customer ordering is not permitted at this coordinate.`);
    }
  };

  // Remove a vertex point
  const handleRemovePoint = (index: number) => {
    if (!editingArea?.polygon) return;
    if (editingArea.polygon.length <= 3) {
      alert('Cannot delete: A polygon boundary must have at least 3 points.');
      return;
    }
    const updated = [...editingArea.polygon];
    updated.splice(index, 1);
    setEditingArea({ ...editingArea, polygon: updated });
  };

  // Apply a preset boundary
  const handleApplyPreset = (preset: typeof AREA_PRESETS[0]) => {
    if (!editingArea) return;
    setEditingArea({
      ...editingArea,
      name: editingArea.name || preset.name,
      name_bn: editingArea.name_bn || preset.name_bn,
      min_delivery_charge: preset.min_delivery_charge,
      per_km_charge: preset.per_km_charge,
      polygon: preset.polygon.map((p) => ({ ...p }))
    });
  };

  // Generate Circle Polygon around center of current polygon
  const handleApplyCircle = () => {
    if (!editingArea) return;
    const center = calculateCentroid(editingArea.polygon || [{ lat: 22.5400, lng: 88.3600 }]);
    const circlePoints = generateCirclePolygon(center, circleRadiusKm);
    setEditingArea({
      ...editingArea,
      polygon: circlePoints
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Action Controls */}
      <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-wider bg-purple-100 text-purple-800 px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <Shield className="w-3 h-3 text-purple-700" />
              <span>Admin Geofence & Boundary Engine</span>
            </span>
            <span className="text-xs text-stone-500 font-medium hidden sm:inline-block">
              সার্ভিস এরিয়া সীমানা নিয়ন্ত্রণ
            </span>
          </div>
          <h3 className="text-lg font-black text-stone-900 mt-1">
            Service Areas & Geofence Boundary Management
          </h3>
          <p className="text-xs text-stone-500 max-w-2xl mt-0.5 leading-relaxed">
            Manage exact polygon boundaries where customers can order and delivery riders are dispatched.
            Drag vertices on the map, add new delivery zones, or adjust base fare rates per zone.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={onRefresh}
            className="bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold px-3.5 py-2.5 rounded-2xl transition-all flex items-center gap-1.5 cursor-pointer"
            title="Refresh service areas"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={handleStartCreate}
            className="bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs px-5 py-2.5 rounded-2xl shadow-md transition-all flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Geofence Zone (নতুন সীমানা তৈরি)</span>
          </button>
        </div>
      </div>

      {/* Main Interactive Map View */}
      <div className="bg-white rounded-3xl border border-stone-200 shadow-2xs overflow-hidden">
        <div className="p-4 bg-stone-50 border-b border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-purple-700" />
            <h4 className="font-extrabold text-stone-900 text-sm">
              Live Service Zone Radar & Restaurant Coverage
            </h4>
            <span className="text-xs text-stone-500 font-normal">
              ({serviceAreas.length} Zones Registered)
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap text-xs">
            <span className="text-stone-500 font-bold">Focus Zone:</span>
            {serviceAreas.map((sa, idx) => (
              <button
                key={sa.id}
                type="button"
                onClick={() => setSelectedAreaId(sa.id)}
                className={`px-3 py-1 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  selectedAreaId === sa.id
                    ? 'bg-purple-700 text-white shadow-2xs'
                    : 'bg-white text-stone-700 border border-stone-200 hover:bg-stone-100'
                }`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: ZONE_COLORS[idx % ZONE_COLORS.length].fill }}
                />
                <span>{sa.name}</span>
                {!sa.is_active && <span className="text-[10px] text-red-300 font-normal">(Off)</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Google Map Container with Geofence Polygons */}
        <div className="relative h-[420px] md:h-[480px] w-full bg-stone-100">
          <Map
            defaultCenter={currentArea ? calculateCentroid(currentArea.polygon) : { lat: 22.5400, lng: 88.3600 }}
            center={currentArea ? calculateCentroid(currentArea.polygon) : { lat: 22.5400, lng: 88.3600 }}
            defaultZoom={12}
            zoom={selectedAreaId ? 12 : 11}
            mapId="DEMO_MAP_ID"
            internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
            onClick={handleTesterMapClick}
            className="w-full h-full"
          >
            {/* Render all Service Area Polygons */}
            {serviceAreas.map((sa, idx) => {
              const color = ZONE_COLORS[idx % ZONE_COLORS.length];
              const isSelected = selectedAreaId === sa.id;
              const isOff = !sa.is_active;

              return (
                <React.Fragment key={sa.id}>
                  <GoogleMapPolygonRenderer
                    paths={sa.polygon}
                    strokeColor={isOff ? '#9ca3af' : isSelected ? '#581c87' : color.stroke}
                    fillColor={isOff ? '#d1d5db' : color.fill}
                    fillOpacity={isOff ? 0.1 : isSelected ? 0.35 : 0.2}
                    strokeWeight={isSelected ? 3.5 : 2}
                    editable={false}
                  />

                  {/* Centroid Area Tag on Map */}
                  <AdvancedMarker position={calculateCentroid(sa.polygon)}>
                    <div
                      onClick={() => setSelectedAreaId(sa.id)}
                      className={`px-3 py-1 rounded-xl text-xs font-extrabold shadow-md flex items-center gap-1.5 cursor-pointer transition-transform hover:scale-105 ${
                        isOff
                          ? 'bg-stone-600 text-stone-200 border border-stone-400'
                          : isSelected
                          ? 'bg-purple-900 text-white ring-2 ring-purple-300'
                          : 'bg-white text-stone-900 border border-stone-300'
                      }`}
                    >
                      <Shield className="w-3.5 h-3.5 text-purple-400" />
                      <span>{sa.name}</span>
                      <span className="text-[10px] bg-purple-100 text-purple-900 px-1 rounded">
                        ₹{sa.min_delivery_charge}
                      </span>
                    </div>
                  </AdvancedMarker>

                  {/* Polygon Vertices Markers for selected area */}
                  {isSelected &&
                    sa.polygon.map((pt, pIdx) => (
                      <AdvancedMarker key={`vertex-${sa.id}-${pIdx}`} position={pt}>
                        <div
                          className="w-4 h-4 rounded-full bg-purple-700 text-white text-[9px] font-black flex items-center justify-center ring-2 ring-white shadow-md"
                          title={`Vertex ${pIdx + 1}: ${pt.lat}, ${pt.lng}`}
                        >
                          {pIdx + 1}
                        </div>
                      </AdvancedMarker>
                    ))}
                </React.Fragment>
              );
            })}

            {/* Restaurant Pins inside Service Areas */}
            {restaurants.map((rest) => (
              <AdvancedMarker
                key={`rest-${rest.id}`}
                position={{ lat: Number(rest.latitude), lng: Number(rest.longitude) }}
              >
                <div
                  className="bg-orange-600 text-white p-1.5 rounded-xl shadow-lg border-2 border-white flex items-center gap-1 text-[11px] font-bold"
                  title={`${rest.name} (${rest.address})`}
                >
                  <Store className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline-block max-w-[120px] truncate">{rest.name}</span>
                </div>
              </AdvancedMarker>
            ))}

            {/* Test Pin Marker when admin clicks on map */}
            {testPin && (
              <AdvancedMarker position={testPin}>
                <div className="bg-stone-950 text-white p-2 rounded-2xl shadow-2xl border-2 border-amber-400 flex items-center gap-1.5 animate-bounce">
                  <Crosshair className="w-4 h-4 text-amber-400" />
                  <span className="text-[11px] font-black">Test Location</span>
                </div>
              </AdvancedMarker>
            )}
          </Map>

          {/* Quick Map Legend Overlay */}
          <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-md rounded-2xl p-3 border border-stone-200/80 shadow-md text-xs space-y-1.5 max-w-xs pointer-events-auto">
            <div className="font-extrabold text-stone-900 flex items-center gap-1.5 text-[11px]">
              <Info className="w-3.5 h-3.5 text-purple-700" />
              <span>Map Tips & Instructions</span>
            </div>
            <p className="text-[11px] text-stone-600 leading-snug">
              • Click anywhere on the map to test if that GPS spot falls inside a delivery zone.
              <br />
              • Click <strong>"Edit Boundary"</strong> below to drag vertices or reshape the polygon.
            </p>
          </div>

          {/* Live Tester Result Banner */}
          {testResult && (
            <div className="absolute bottom-3 left-3 right-3 bg-stone-900/95 text-white backdrop-blur-md p-3.5 rounded-2xl shadow-xl flex items-center justify-between gap-3 text-xs border border-white/10 animate-in fade-in">
              <div className="flex items-center gap-2.5">
                <Crosshair className="w-4 h-4 text-amber-400 shrink-0" />
                <div>
                  <span className="font-black text-amber-300 mr-2">GPS Verification Result:</span>
                  <span className="font-medium text-stone-200">{testResult}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setTestPin(null);
                  setTestResult(null);
                }}
                className="text-stone-400 hover:text-white font-bold text-xs p-1"
              >
                ✕
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Service Area Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {serviceAreas.map((sa, idx) => {
          const color = ZONE_COLORS[idx % ZONE_COLORS.length];
          const isSelected = selectedAreaId === sa.id;
          const isOff = !sa.is_active;

          return (
            <div
              key={sa.id}
              className={`bg-white rounded-3xl p-5 border shadow-2xs space-y-4 transition-all ${
                isSelected
                  ? 'border-purple-400 ring-2 ring-purple-100 shadow-md'
                  : 'border-stone-200 hover:border-stone-300'
              } ${isOff ? 'opacity-70 bg-stone-50/50' : ''}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div
                    className="w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-white shadow-2xs shrink-0 mt-0.5"
                    style={{ backgroundColor: color.stroke }}
                  >
                    <Shield className="w-5 h-5" />
                  </div>

                  <div>
                    <h4 className="font-extrabold text-stone-900 text-base leading-tight">
                      {sa.name}
                    </h4>
                    {sa.name_bn && (
                      <p className="text-xs text-stone-500 font-bengali mt-0.5">{sa.name_bn}</p>
                    )}
                    <div className="text-[11px] text-stone-400 mt-1 flex items-center gap-2">
                      <span>Zone ID: #{sa.id}</span>
                      <span>•</span>
                      <span>{sa.polygon?.length || 4} Boundary Vertices</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggleStatus(sa.id)}
                    className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full cursor-pointer transition-colors ${
                      sa.is_active
                        ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-300'
                        : 'bg-stone-200 text-stone-700 hover:bg-stone-300 border border-stone-300'
                    }`}
                    title="Click to toggle active/inactive"
                  >
                    {sa.is_active ? 'Active Zone ✓' : 'Inactive (বন্ধ) ✕'}
                  </button>
                </div>
              </div>

              {/* Delivery Rates for this Zone */}
              <div className="grid grid-cols-2 gap-3 text-xs bg-stone-50 rounded-2xl p-3 border border-stone-200/70">
                <div>
                  <span className="text-stone-400 block text-[10px] font-bold uppercase">Base Delivery Charge</span>
                  <span className="font-extrabold text-stone-900 text-sm mt-0.5 block font-mono">
                    ₹{sa.min_delivery_charge}
                  </span>
                  <span className="text-[10px] text-stone-500">Up to base distance</span>
                </div>

                <div>
                  <span className="text-stone-400 block text-[10px] font-bold uppercase">Per-KM Distance Rate</span>
                  <span className="font-extrabold text-stone-900 text-sm mt-0.5 block font-mono">
                    ₹{sa.per_km_charge} / km
                  </span>
                  <span className="text-[10px] text-stone-500">For extra distance</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2 border-t border-stone-100 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleStartEdit(sa)}
                    className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer active:scale-95"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit Boundary & Rates (সীমানা পরিবর্তন)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedAreaId(sa.id)}
                    className="bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold px-3 py-2 rounded-xl transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <Compass className="w-3.5 h-3.5" />
                    <span>View on Map</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => handleDeleteArea(sa.id, sa.name)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 p-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                  title="Delete this service area"
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="hidden sm:inline-block">Delete</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* GEOFENCE BOUNDARY EDITOR MODAL (ড্র্যাগ, পয়েন্ট অ্যাড ও সীমানা এডিটর)     */}
      {/* ========================================================================= */}
      {isEditorOpen && editingArea && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-4xl max-h-[94vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-stone-200 animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-5 bg-stone-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-600 flex items-center justify-center font-bold text-white shadow-md">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base sm:text-lg text-white">
                    {editorMode === 'create'
                      ? 'Create New Service Area Geofence (নতুন সীমানা তৈরি)'
                      : `Edit Geofence Boundary: ${editingArea.name || ''}`}
                  </h3>
                  <p className="text-xs text-stone-400">
                    Drag vertices on the map or click to add new boundary coordinates
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsEditorOpen(false)}
                className="p-2 text-stone-400 hover:text-white rounded-full bg-white/10 hover:bg-white/20 transition-all cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Notification messages */}
            {saveMessage && (
              <div className="p-3 bg-emerald-500 text-white text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>{saveMessage}</span>
              </div>
            )}
            {errorMessage && (
              <div className="p-3 bg-red-600 text-white text-xs font-bold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Modal Body (Scrollable) */}
            <div className="p-5 overflow-y-auto space-y-5">
              {/* Form Fields: Name, Bengali Name, Base Fare, Per-KM Charge */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div>
                  <label className="block text-stone-700 font-bold mb-1">
                    Zone Name (English) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. South Kolkata Zone"
                    value={editingArea.name || ''}
                    onChange={(e) => setEditingArea({ ...editingArea, name: e.target.value })}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs font-bold text-stone-900 focus:outline-hidden focus:border-purple-600"
                  />
                </div>

                <div>
                  <label className="block text-stone-700 font-bold mb-1">
                    Zone Name (Bengali)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. দক্ষিণ কলকাতা ডেলিভারি জোন"
                    value={editingArea.name_bn || ''}
                    onChange={(e) => setEditingArea({ ...editingArea, name_bn: e.target.value })}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs font-bold text-stone-900 font-bengali focus:outline-hidden focus:border-purple-600"
                  />
                </div>

                <div>
                  <label className="block text-stone-700 font-bold mb-1">
                    Base Delivery Fee (₹)
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="150"
                    value={editingArea.min_delivery_charge ?? 25}
                    onChange={(e) =>
                      setEditingArea({ ...editingArea, min_delivery_charge: Number(e.target.value) })
                    }
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs font-bold font-mono text-stone-900 focus:outline-hidden focus:border-purple-600"
                  />
                </div>

                <div>
                  <label className="block text-stone-700 font-bold mb-1">
                    Per-KM Charge (₹/km)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={editingArea.per_km_charge ?? 8}
                    onChange={(e) =>
                      setEditingArea({ ...editingArea, per_km_charge: Number(e.target.value) })
                    }
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs font-bold font-mono text-stone-900 focus:outline-hidden focus:border-purple-600"
                  />
                </div>
              </div>

              {/* Sub-Tabs: Map Editor, Vertex Points Table, Quick Presets, Radius Circle Generator */}
              <div className="flex items-center justify-between border-b border-stone-200 pb-2 flex-wrap gap-2">
                <div className="flex items-center gap-1.5 bg-stone-100 p-1 rounded-2xl text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setActiveTabSub('map')}
                    className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1 cursor-pointer ${
                      activeTabSub === 'map'
                        ? 'bg-white shadow-2xs text-purple-700'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    <span>Interactive Map Editor</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTabSub('coords')}
                    className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1 cursor-pointer ${
                      activeTabSub === 'coords'
                        ? 'bg-white shadow-2xs text-purple-700'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Vertices Table ({editingArea.polygon?.length || 0})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTabSub('presets')}
                    className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1 cursor-pointer ${
                      activeTabSub === 'presets'
                        ? 'bg-white shadow-2xs text-purple-700'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    <Compass className="w-3.5 h-3.5" />
                    <span>Area Presets (প্রিসেট)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTabSub('circle')}
                    className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1 cursor-pointer ${
                      activeTabSub === 'circle'
                        ? 'bg-white shadow-2xs text-purple-700'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    <Crosshair className="w-3.5 h-3.5" />
                    <span>Circle Radius Generator</span>
                  </button>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <label className="flex items-center gap-1.5 cursor-pointer font-bold text-stone-700">
                    <input
                      type="checkbox"
                      checked={clickToAddPoints}
                      onChange={(e) => setClickToAddPoints(e.target.checked)}
                      className="accent-purple-600 rounded"
                    />
                    <span>Click on map to add vertex points</span>
                  </label>
                </div>
              </div>

              {/* Tab 1: Interactive Map Editor */}
              {activeTabSub === 'map' && (
                <div className="space-y-3">
                  <div className="h-[340px] sm:h-[400px] w-full rounded-2xl overflow-hidden border border-stone-200 relative bg-stone-100">
                    <Map
                      defaultCenter={calculateCentroid(editingArea.polygon || [{ lat: 22.5400, lng: 88.3600 }])}
                      center={calculateCentroid(editingArea.polygon || [{ lat: 22.5400, lng: 88.3600 }])}
                      defaultZoom={12}
                      mapId="DEMO_MAP_ID"
                      internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                      onClick={handleEditorMapClick}
                      className="w-full h-full"
                    >
                      {/* Interactive Editable Polygon */}
                      {editingArea.polygon && editingArea.polygon.length >= 3 && (
                        <GoogleMapPolygonRenderer
                          paths={editingArea.polygon}
                          strokeColor="#7c3aed"
                          fillColor="#8b5cf6"
                          fillOpacity={0.3}
                          strokeWeight={3}
                          editable={true}
                          onPolygonChange={(newPaths) => {
                            setEditingArea((prev) => (prev ? { ...prev, polygon: newPaths } : null));
                          }}
                        />
                      )}

                      {/* Numbered Vertex Badges */}
                      {editingArea.polygon?.map((pt, idx) => (
                        <AdvancedMarker key={`edit-pt-${idx}`} position={pt}>
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              if (window.confirm(`Delete vertex point #${idx + 1}?`)) {
                                handleRemovePoint(idx);
                              }
                            }}
                            className="w-5 h-5 rounded-full bg-purple-700 hover:bg-red-600 text-white text-[10px] font-black flex items-center justify-center ring-2 ring-white shadow-md cursor-pointer transition-colors"
                            title={`Point #${idx + 1} (${pt.lat}, ${pt.lng}) - Click to delete`}
                          >
                            {idx + 1}
                          </div>
                        </AdvancedMarker>
                      ))}
                    </Map>

                    {/* Instruction overlay */}
                    <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-md rounded-2xl p-3 border border-stone-200 shadow-md text-xs max-w-xs space-y-1">
                      <div className="font-extrabold text-stone-900 flex items-center gap-1.5 text-[11px]">
                        <Sliders className="w-3.5 h-3.5 text-purple-700" />
                        <span>Interactive Boundary Controls</span>
                      </div>
                      <p className="text-[11px] text-stone-600 leading-snug">
                        • Drag the white handles on the map to stretch or reshape the boundary.
                        <br />
                        • Click anywhere on the map to add a new vertex point (when enabled).
                        <br />
                        • Click any numbered point circle to delete that vertex.
                      </p>
                    </div>

                    <div className="absolute bottom-3 right-3 bg-stone-900/90 text-white px-3 py-1.5 rounded-xl text-xs font-mono font-bold">
                      {editingArea.polygon?.length || 0} Points Plotted
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Vertices Table */}
              {activeTabSub === 'coords' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-stone-500 font-bold">
                      Boundary Vertex Coordinates Table (Latitude & Longitude)
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const first = editingArea.polygon?.[0] || { lat: 22.5400, lng: 88.3600 };
                        setEditingArea((prev) => ({
                          ...prev,
                          polygon: [...(prev?.polygon || []), { lat: first.lat + 0.01, lng: first.lng + 0.01 }]
                        }));
                      }}
                      className="bg-stone-100 hover:bg-stone-200 text-stone-700 px-3 py-1 rounded-xl font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add Coordinate Row</span>
                    </button>
                  </div>

                  <div className="max-h-64 overflow-y-auto border border-stone-200 rounded-2xl">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 uppercase text-[10px] font-bold">
                        <tr>
                          <th className="p-2.5">#</th>
                          <th className="p-2.5">Latitude</th>
                          <th className="p-2.5">Longitude</th>
                          <th className="p-2.5 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100">
                        {editingArea.polygon?.map((pt, idx) => (
                          <tr key={idx} className="hover:bg-stone-50/50">
                            <td className="p-2.5 font-bold font-mono text-purple-700">
                              Point #{idx + 1}
                            </td>
                            <td className="p-2.5">
                              <input
                                type="number"
                                step="0.0001"
                                value={pt.lat}
                                onChange={(e) => {
                                  const updated = [...(editingArea.polygon || [])];
                                  updated[idx].lat = parseFloat(Number(e.target.value).toFixed(6));
                                  setEditingArea({ ...editingArea, polygon: updated });
                                }}
                                className="bg-white border border-stone-200 rounded-lg px-2 py-1 font-mono font-bold text-stone-800 w-32"
                              />
                            </td>
                            <td className="p-2.5">
                              <input
                                type="number"
                                step="0.0001"
                                value={pt.lng}
                                onChange={(e) => {
                                  const updated = [...(editingArea.polygon || [])];
                                  updated[idx].lng = parseFloat(Number(e.target.value).toFixed(6));
                                  setEditingArea({ ...editingArea, polygon: updated });
                                }}
                                className="bg-white border border-stone-200 rounded-lg px-2 py-1 font-mono font-bold text-stone-800 w-32"
                              />
                            </td>
                            <td className="p-2.5 text-right">
                              <button
                                type="button"
                                onClick={() => handleRemovePoint(idx)}
                                className="text-red-600 hover:text-red-700 p-1 font-bold"
                                title="Delete Point"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Tab 3: Presets */}
              {activeTabSub === 'presets' && (
                <div className="space-y-3">
                  <p className="text-xs text-stone-500">
                    Quickly populate popular geographical delivery regions with predefined boundaries and tested coordinates:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {AREA_PRESETS.map((p, idx) => (
                      <div
                        key={idx}
                        className="bg-stone-50 hover:bg-purple-50/50 border border-stone-200 hover:border-purple-300 rounded-2xl p-4 transition-all space-y-2 cursor-pointer"
                        onClick={() => handleApplyPreset(p)}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <h5 className="font-extrabold text-stone-900 text-sm">{p.name}</h5>
                            <p className="text-xs text-stone-500 font-bengali">{p.name_bn}</p>
                          </div>
                          <span className="text-[10px] bg-purple-100 text-purple-800 font-bold px-2 py-0.5 rounded-full">
                            {p.polygon.length} Points
                          </span>
                        </div>
                        <div className="text-[11px] text-stone-600">
                          Base: <strong>₹{p.min_delivery_charge}</strong> • Rate: <strong>₹{p.per_km_charge}/km</strong>
                        </div>
                        <button
                          type="button"
                          className="bg-white hover:bg-stone-100 text-purple-700 font-bold text-xs px-3 py-1 rounded-xl border border-stone-200 shadow-2xs mt-1"
                        >
                          Apply Preset Boundary ✓
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tab 4: Circle Radius Generator */}
              {activeTabSub === 'circle' && (
                <div className="bg-stone-50 rounded-2xl p-5 border border-stone-200 space-y-4 text-xs">
                  <div className="space-y-1">
                    <h5 className="font-extrabold text-stone-900 text-sm">
                      Automatic Circle Geofence Generator (ব্যাসার্ধ অনুযায়ী বৃত্তাকার সীমানা)
                    </h5>
                    <p className="text-stone-500">
                      Creates a smooth 12-sided polygonal delivery perimeter centered around the middle of your zone.
                    </p>
                  </div>

                  <div className="space-y-2 max-w-sm">
                    <div className="flex justify-between items-center font-bold">
                      <span className="text-stone-700">Delivery Coverage Radius:</span>
                      <span className="font-mono text-purple-700 text-sm bg-purple-100 px-2 py-0.5 rounded-md">
                        {circleRadiusKm} Kilometers
                      </span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="15"
                      step="0.5"
                      value={circleRadiusKm}
                      onChange={(e) => setCircleRadiusKm(Number(e.target.value))}
                      className="w-full accent-purple-600"
                    />
                    <div className="flex justify-between text-[10px] text-stone-400 font-mono">
                      <span>1 km (Local Area)</span>
                      <span>5 km (City Zone)</span>
                      <span>15 km (Wide Metropolitan)</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleApplyCircle}
                    className="bg-purple-600 hover:bg-purple-700 text-white font-extrabold px-4 py-2 rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Crosshair className="w-4 h-4" />
                    <span>Generate Circular Geofence Now ({circleRadiusKm} KM)</span>
                  </button>
                </div>
              )}
            </div>

            {/* Modal Actions Footer */}
            <div className="p-4 border-t border-stone-200 bg-stone-50 flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2 text-xs text-stone-500">
                <Shield className="w-4 h-4 text-purple-700" />
                <span>
                  {editingArea.polygon?.length || 0} vertices ready to deploy into geofence engine.
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditorOpen(false)}
                  className="bg-stone-200 hover:bg-stone-300 text-stone-700 font-bold text-xs px-4 py-2.5 rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={isSaving}
                  onClick={handleSaveArea}
                  className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                >
                  {isSaving ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span>
                    {isSaving
                      ? 'Saving Geofence...'
                      : editorMode === 'create'
                      ? 'Save & Create Service Area (তৈরি করুন)'
                      : 'Update Boundary & Rates (সংরক্ষণ করুন)'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
