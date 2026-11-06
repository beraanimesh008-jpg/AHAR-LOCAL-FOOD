import React, { useEffect, useRef, useState } from 'react';
import { Map, AdvancedMarker, useMap } from '@vis.gl/react-google-maps';
import {
  MapPin,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  Compass,
  CheckCircle,
  AlertCircle,
  Maximize2
} from 'lucide-react';

export interface LatLngPoint {
  lat: number;
  lng: number;
}

interface BoundaryPolygonEditorProps {
  points: LatLngPoint[];
  onChange: (newPoints: LatLngPoint[]) => void;
  heightClass?: string;
  readOnly?: boolean;
  areaName?: string;
}

// Inner helper component to draw translucent boundary polygon using native Google Maps API
const GoogleMapPolygonOverlay: React.FC<{ points: LatLngPoint[] }> = ({ points }) => {
  const map = useMap();
  const polygonRef = useRef<any>(null);

  useEffect(() => {
    if (!map || !(window as any).google || !(window as any).google.maps) return;

    const validPaths = points
      .map((pt) => ({ lat: Number(pt.lat), lng: Number(pt.lng) }))
      .filter((pt) => !isNaN(pt.lat) && !isNaN(pt.lng));

    if (!polygonRef.current) {
      polygonRef.current = new (window as any).google.maps.Polygon({
        map,
        paths: validPaths,
        fillColor: '#8b5cf6',
        fillOpacity: 0.25,
        strokeColor: '#6d28d9',
        strokeOpacity: 0.9,
        strokeWeight: 3,
        clickable: false
      });
    } else {
      polygonRef.current.setPaths(validPaths);
    }

    return () => {
      if (polygonRef.current) {
        polygonRef.current.setMap(null);
        polygonRef.current = null;
      }
    };
  }, [map, points]);

  return null;
};

export const BoundaryPolygonEditor: React.FC<BoundaryPolygonEditorProps> = ({
  points,
  onChange,
  heightClass = 'h-[360px]',
  readOnly = false,
  areaName
}) => {
  const [selectedPointIndex, setSelectedPointIndex] = useState<number | null>(null);
  const [clickToAddMode, setClickToAddMode] = useState<boolean>(true);

  // Generator State
  const [genRadiusKm, setGenRadiusKm] = useState<number>(3);
  const [genVertices, setGenVertices] = useState<number>(12);

  // Calculate center of current polygon or fallback
  const calculateCenter = (): LatLngPoint => {
    if (!points || points.length === 0) return { lat: 21.9212, lng: 88.4350 };
    const validPts = points.filter((p) => !isNaN(Number(p.lat)) && !isNaN(Number(p.lng)));
    if (validPts.length === 0) return { lat: 21.9212, lng: 88.4350 };
    const avgLat = validPts.reduce((sum, p) => sum + Number(p.lat), 0) / validPts.length;
    const avgLng = validPts.reduce((sum, p) => sum + Number(p.lng), 0) / validPts.length;
    return { lat: Number(avgLat.toFixed(5)), lng: Number(avgLng.toFixed(5)) };
  };

  const center = calculateCenter();

  // Handle map click to add or update point
  const handleMapClick = (e: any) => {
    if (readOnly) return;
    if (e.detail?.latLng) {
      const newLat = Number(e.detail.latLng.lat.toFixed(5));
      const newLng = Number(e.detail.latLng.lng.toFixed(5));

      if (clickToAddMode) {
        onChange([...points, { lat: newLat, lng: newLng }]);
      } else if (selectedPointIndex !== null && selectedPointIndex < points.length) {
        const updated = [...points];
        updated[selectedPointIndex] = { lat: newLat, lng: newLng };
        onChange(updated);
      }
    }
  };

  // Update single point lat/lng
  const handlePointCoordinateChange = (index: number, field: 'lat' | 'lng', val: string) => {
    const numVal = parseFloat(val);
    if (isNaN(numVal)) return;
    const updated = [...points];
    updated[index] = {
      ...updated[index],
      [field]: Number(numVal.toFixed(5))
    };
    onChange(updated);
  };

  // Move point up
  const handleMovePointUp = (index: number) => {
    if (index <= 0) return;
    const updated = [...points];
    const temp = updated[index];
    updated[index] = updated[index - 1];
    updated[index - 1] = temp;
    onChange(updated);
  };

  // Move point down
  const handleMovePointDown = (index: number) => {
    if (index >= points.length - 1) return;
    const updated = [...points];
    const temp = updated[index];
    updated[index] = updated[index + 1];
    updated[index + 1] = temp;
    onChange(updated);
  };

  // Delete single point
  const handleDeletePoint = (index: number) => {
    if (points.length <= 3) {
      alert('সীমানার পলিননে কমপক্ষে ৩টি পয়েন্ট থাকতে হবে (Boundary polygon requires at least 3 points)');
      return;
    }
    const updated = points.filter((_, i) => i !== index);
    onChange(updated);
    if (selectedPointIndex === index) setSelectedPointIndex(null);
  };

  // Generate circular boundary around center
  const handleGenerateCircularBoundary = () => {
    const earthRadius = 6371; // km
    const newPts: LatLngPoint[] = [];
    const centerLat = center.lat;
    const centerLng = center.lng;

    for (let i = 0; i < genVertices; i++) {
      const angle = (i * 360 / genVertices) * (Math.PI / 180);
      const dLat = (genRadiusKm * Math.cos(angle)) / earthRadius;
      const dLng = (genRadiusKm * Math.sin(angle)) / (earthRadius * Math.cos((centerLat * Math.PI) / 180));
      const pLat = Number((centerLat + (dLat * 180) / Math.PI).toFixed(5));
      const pLng = Number((centerLng + (dLng * 180) / Math.PI).toFixed(5));
      newPts.push({ lat: pLat, lng: pLng });
    }

    onChange(newPts);
  };

  return (
    <div className="space-y-4">
      {/* Interactive Map Container */}
      <div className="relative rounded-3xl overflow-hidden border border-purple-200 shadow-md">
        {/* Top Control Overlay */}
        <div className="absolute top-3 left-3 z-10 bg-white/95 backdrop-blur-md px-3.5 py-2 rounded-2xl shadow-md text-xs font-bold text-stone-800 flex items-center gap-2 border border-purple-100 flex-wrap">
          <MapPin className="w-4 h-4 text-purple-600" />
          <span>{areaName ? `Boundary: ${areaName}` : 'Boundary Location Map'}</span>
          <span className="bg-purple-100 text-purple-900 px-2 py-0.5 rounded-full text-[10px] font-mono font-black">
            {points.length} Points
          </span>
        </div>

        {!readOnly && (
          <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setClickToAddMode(!clickToAddMode)}
              className={`px-3 py-1.5 rounded-2xl text-xs font-bold shadow-md transition-all flex items-center gap-1.5 cursor-pointer ${
                clickToAddMode
                  ? 'bg-purple-600 text-white shadow-purple-200'
                  : 'bg-white hover:bg-stone-100 text-stone-800 border border-stone-200'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{clickToAddMode ? 'Click Map to Add Point (Active)' : 'Enable Click to Add'}</span>
            </button>
          </div>
        )}

        {/* Google Map Display */}
        <div className={`w-full ${heightClass}`}>
          <Map
            defaultCenter={center}
            defaultZoom={13}
            mapId="DEMO_MAP_ID"
            internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
            onClick={handleMapClick}
            gestureHandling="greedy"
            className="w-full h-full"
          >
            <GoogleMapPolygonOverlay points={points} />

            {/* Render Draggable/Clickable Markers for each Boundary Vertex */}
            {points.map((pt, idx) => (
              <AdvancedMarker
                key={`vertex-${idx}-${pt.lat}-${pt.lng}`}
                position={{ lat: Number(pt.lat), lng: Number(pt.lng) }}
                onClick={() => setSelectedPointIndex(idx)}
              >
                <div
                  className={`flex flex-col items-center cursor-pointer transition-transform ${
                    selectedPointIndex === idx ? 'scale-125 z-30' : 'hover:scale-110 z-20'
                  }`}
                >
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center font-mono font-black text-xs text-white border-2 border-white shadow-lg ${
                      selectedPointIndex === idx ? 'bg-amber-500 ring-4 ring-amber-300' : 'bg-purple-600'
                    }`}
                  >
                    {idx + 1}
                  </div>
                  <span className="bg-stone-900/90 text-white font-mono text-[9px] px-1.5 py-0.2 rounded shadow mt-0.5 whitespace-nowrap">
                    P#{idx + 1} ({pt.lat.toFixed(4)}, {pt.lng.toFixed(4)})
                  </span>
                </div>
              </AdvancedMarker>
            ))}
          </Map>
        </div>

        {/* Footer Coordinate Summary Bar */}
        <div className="bg-purple-950 text-white px-4 py-2.5 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-purple-800">
          <div className="flex items-center gap-2 flex-wrap">
            <Compass className="w-4 h-4 text-purple-400" />
            <span className="font-bold text-stone-200">
              Boundary Vertices: <span className="font-mono text-purple-300 font-extrabold">{points.length} points</span>
            </span>
            <span className="text-[10px] text-stone-400">
              (ম্যাপের যেকোনো জায়গায় ক্লিক করে পয়েন্ট যোগ বা পিন টেনে বাউন্ডারি সেট করুন)
            </span>
          </div>

          <div className="flex items-center gap-2 font-mono text-[11px] text-purple-300 font-extrabold">
            <span>Center: {center.lat.toFixed(4)}, {center.lng.toFixed(4)}</span>
          </div>
        </div>
      </div>

      {!readOnly && (
        <>
          {/* Quick Shape Generator Controls */}
          <div className="bg-purple-50/60 p-4 rounded-3xl border border-purple-200 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h4 className="text-xs font-black uppercase text-purple-950 flex items-center gap-1.5">
                <Compass className="w-4 h-4 text-purple-600" />
                <span>Auto Polygon Shape Generator (দ্রুত বাউন্ডারি শেপ তৈরি করুন):</span>
              </h4>
              <span className="text-[10px] font-bold text-stone-500">
                কেন্দ্র হতে রেডিয়াস অনুযায়ী স্বয়ংক্রিয় পয়েন্ট তৈরি করবে
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block font-bold text-stone-700 mb-1">Coverage Radius (কিলোমিটার)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="1"
                    max="15"
                    step="0.5"
                    value={genRadiusKm}
                    onChange={(e) => setGenRadiusKm(Number(e.target.value))}
                    className="w-full accent-purple-600 cursor-pointer"
                  />
                  <span className="font-mono font-bold text-purple-900 bg-white px-2 py-1 rounded-lg border border-purple-200">
                    {genRadiusKm} km
                  </span>
                </div>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Polygon Vertices (পয়েন্ট সংখ্যা)</label>
                <select
                  value={genVertices}
                  onChange={(e) => setGenVertices(Number(e.target.value))}
                  className="w-full bg-white border border-purple-200 rounded-xl px-3 py-1.5 font-bold text-stone-800"
                >
                  <option value={8}>8 Points (Octagon)</option>
                  <option value={12}>12 Points (Standard Circle)</option>
                  <option value={16}>16 Points (High Precision)</option>
                  <option value={20}>20 Points (Ultra Smooth Boundary)</option>
                </select>
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={handleGenerateCircularBoundary}
                  className="w-full bg-purple-700 hover:bg-purple-800 text-white font-extrabold py-2 px-3 rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Generate Radius Boundary</span>
                </button>
              </div>
            </div>
          </div>

          {/* Point-By-Point Manual Coordinate Editor Table */}
          <div className="bg-white p-4 rounded-3xl border border-stone-200 space-y-3 shadow-2xs">
            <div className="flex items-center justify-between flex-wrap gap-2 border-b border-stone-100 pb-2.5">
              <div>
                <h4 className="text-xs font-black uppercase text-stone-900 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-purple-600" />
                  <span>Point-By-Point Coordinate Table (পয়েন্ট ম্যানুয়ালি যোগ ও এডিট):</span>
                </h4>
                <p className="text-[11px] text-stone-500 mt-0.5">
                  প্রতিটি পয়েন্টের অক্ষাংশ (Lat) ও দ্রাঘিমাংশ (Lng) সংখ্যা টাইপ করে বা পজিশন সরিয়ে ফাইন টিউন করুন।
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  onChange([
                    ...points,
                    {
                      lat: Number((center.lat + (Math.random() - 0.5) * 0.02).toFixed(5)),
                      lng: Number((center.lng + (Math.random() - 0.5) * 0.02).toFixed(5))
                    }
                  ])
                }
                className="bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-300 font-bold text-xs px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5 text-purple-600" />
                <span>+ Add Point (নতুন পয়েন্ট)</span>
              </button>
            </div>

            {/* Points Table */}
            <div className="max-h-60 overflow-y-auto border border-stone-200 rounded-2xl overflow-hidden text-xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-stone-100 text-stone-700 font-bold uppercase text-[10px] border-b border-stone-200">
                    <th className="p-2.5">Point #</th>
                    <th className="p-2.5">Latitude (অক্ষাংশ)</th>
                    <th className="p-2.5">Longitude (দ্রাঘিমাংশ)</th>
                    <th className="p-2.5 text-right">Reorder & Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 font-mono">
                  {points.map((pt, idx) => (
                    <tr
                      key={idx}
                      className={`hover:bg-purple-50/40 transition-colors ${
                        selectedPointIndex === idx ? 'bg-amber-50/80 font-extrabold' : ''
                      }`}
                    >
                      <td className="p-2.5">
                        <span className="font-extrabold text-purple-900 bg-purple-100 px-2 py-0.5 rounded-md text-[11px]">
                          P#{idx + 1}
                        </span>
                      </td>

                      <td className="p-2.5">
                        <input
                          type="number"
                          step="0.0001"
                          value={pt.lat}
                          onChange={(e) => handlePointCoordinateChange(idx, 'lat', e.target.value)}
                          className="w-32 bg-stone-50 border border-stone-300 rounded-lg px-2 py-1 font-bold text-stone-900 focus:border-purple-600 focus:bg-white"
                        />
                      </td>

                      <td className="p-2.5">
                        <input
                          type="number"
                          step="0.0001"
                          value={pt.lng}
                          onChange={(e) => handlePointCoordinateChange(idx, 'lng', e.target.value)}
                          className="w-32 bg-stone-50 border border-stone-300 rounded-lg px-2 py-1 font-bold text-stone-900 focus:border-purple-600 focus:bg-white"
                        />
                      </td>

                      <td className="p-2.5 text-right space-x-1">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => handleMovePointUp(idx)}
                          className="p-1 rounded-lg bg-stone-100 hover:bg-purple-100 text-stone-700 disabled:opacity-30 cursor-pointer"
                          title="Move point up"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          disabled={idx === points.length - 1}
                          onClick={() => handleMovePointDown(idx)}
                          className="p-1 rounded-lg bg-stone-100 hover:bg-purple-100 text-stone-700 disabled:opacity-30 cursor-pointer"
                          title="Move point down"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeletePoint(idx)}
                          className="p-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 cursor-pointer"
                          title="Delete point"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
