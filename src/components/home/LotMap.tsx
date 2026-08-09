"use client";

import { useEffect, useMemo } from "react";
import { MapContainer, Polygon, TileLayer, Tooltip, useMap } from "react-leaflet";
import type { LatLngBoundsExpression } from "leaflet";
import type { CountyParcel, GeoJsonPolygon } from "@/lib/supabase/parcels";
import "leaflet/dist/leaflet.css";

type Ring = [number, number][]; // [lat, lng]

/** GeoJSON ([lng,lat]) -> Leaflet rings ([lat,lng]). Handles Polygon + MultiPolygon. */
function toLeafletRings(geo: GeoJsonPolygon | null): Ring[] {
  if (!geo) return [];
  const rings: Ring[] = [];
  if (geo.type === "Polygon") {
    for (const ring of geo.coordinates as number[][][]) {
      rings.push(ring.map(([lng, lat]) => [lat, lng] as [number, number]));
    }
  } else {
    for (const poly of geo.coordinates as number[][][][]) {
      for (const ring of poly) {
        rings.push(ring.map(([lng, lat]) => [lat, lng] as [number, number]));
      }
    }
  }
  return rings;
}

function FitBounds({ bounds }: { bounds: LatLngBoundsExpression | null }) {
  const map = useMap();
  useEffect(() => {
    if (bounds) map.fitBounds(bounds, { padding: [24, 24] });
  }, [map, bounds]);
  return null;
}

export default function LotMap({ parcels }: { parcels: CountyParcel[] }) {
  const shapes = useMemo(
    () =>
      parcels
        .map((p) => ({ parcel: p, rings: toLeafletRings(p.geojson) }))
        .filter((s) => s.rings.length > 0),
    [parcels],
  );

  const bounds = useMemo<LatLngBoundsExpression | null>(() => {
    const pts: [number, number][] = [];
    for (const s of shapes) for (const r of s.rings) pts.push(...r);
    if (pts.length === 0) return null;
    const lats = pts.map((p) => p[0]);
    const lngs = pts.map((p) => p[1]);
    return [
      [Math.min(...lats), Math.min(...lngs)],
      [Math.max(...lats), Math.max(...lngs)],
    ];
  }, [shapes]);

  const center = useMemo<[number, number]>(() => {
    const first = parcels.find((p) => p.centroidLat != null && p.centroidLng != null);
    return first ? [first.centroidLat!, first.centroidLng!] : [30.71, -94.93];
  }, [parcels]);

  if (shapes.length === 0) return null;

  return (
    <div className="h-64 w-full overflow-hidden rounded-xl border border-hairline">
      <MapContainer center={center} zoom={16} scrollWheelZoom={false} className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds bounds={bounds} />
        {shapes.map(({ parcel, rings }) => (
          <Polygon
            key={parcel.id}
            positions={rings}
            pathOptions={{ color: "#F0B93B", fillColor: "#F0B93B", fillOpacity: 0.18, weight: 2 }}
          >
            <Tooltip sticky>
              <div className="text-xs">
                <strong>{parcel.legalDescription}</strong>
                <div>{parcel.legalAcreage} ac · Prop {parcel.propId}</div>
              </div>
            </Tooltip>
          </Polygon>
        ))}
      </MapContainer>
    </div>
  );
}
