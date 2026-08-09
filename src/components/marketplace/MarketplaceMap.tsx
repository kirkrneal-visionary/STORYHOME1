"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Circle,
  MapContainer,
  Marker,
  Polygon,
  Rectangle,
  TileLayer,
  Tooltip,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import type { DemoListing } from "@/lib/demo-data";
import { formatUsd } from "@/lib/demo-data";
import {
  EAST_TEXAS_CENTER,
  EAST_TEXAS_DEFAULT_ZOOM,
  type DrawnBoundary,
  type LatLng,
  type MapBounds,
  boundaryLabel,
} from "@/lib/geo";
import { cn } from "@/lib/utils";
import "leaflet/dist/leaflet.css";

export type DrawTool = "pan" | "polygon" | "radius" | "rectangle";

type MarketplaceMapProps = {
  listings: DemoListing[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  boundary: DrawnBoundary | null;
  onBoundaryChange: (boundary: DrawnBoundary | null) => void;
  className?: string;
};

function priceLabel(price: number) {
  if (price >= 1_000_000) return `$${(price / 1_000_000).toFixed(2)}M`;
  return `$${Math.round(price / 1000)}K`;
}

function priceIcon(price: number, active: boolean) {
  return L.divIcon({
    className: "",
    iconSize: [64, 28],
    iconAnchor: [32, 28],
    html: `<div style="
      background:${active ? "#F0B93B" : "#0E1E38"};
      color:${active ? "#0E1E38" : "#F7F4EC"};
      border:2px solid ${active ? "#0E1E38" : "#F0B93B"};
      border-radius:999px;
      padding:4px 8px;
      font:700 11px/1 ui-monospace,monospace;
      box-shadow:0 6px 18px rgba(0,0,0,.35);
      white-space:nowrap;
      transform:translateY(${active ? "-2px" : "0"});
    ">${priceLabel(price)}</div>`,
  });
}

function MapController({
  selected,
}: {
  selected: DemoListing | null;
}) {
  const map = useMap();
  useEffect(() => {
    if (!selected) return;
    map.flyTo([selected.lat, selected.lng], Math.max(map.getZoom(), 11), {
      duration: 0.6,
    });
  }, [map, selected]);
  return null;
}

function DrawEngine({
  tool,
  draftPoints,
  setDraftPoints,
  radiusMiles,
  onBoundaryChange,
  setShowSearchArea,
}: {
  tool: DrawTool;
  draftPoints: LatLng[];
  setDraftPoints: (points: LatLng[]) => void;
  radiusMiles: number;
  onBoundaryChange: (boundary: DrawnBoundary | null) => void;
  setShowSearchArea: (show: boolean) => void;
}) {
  useMapEvents({
    click(e) {
      const point = { lat: e.latlng.lat, lng: e.latlng.lng };
      if (tool === "polygon") {
        setDraftPoints([...draftPoints, point]);
        return;
      }
      if (tool === "radius") {
        onBoundaryChange({
          type: "circle",
          center: point,
          radiusMiles,
        });
        setDraftPoints([]);
        return;
      }
      if (tool === "rectangle") {
        if (draftPoints.length === 0) {
          setDraftPoints([point]);
          return;
        }
        const a = draftPoints[0];
        const b = point;
        onBoundaryChange({
          type: "rectangle",
          bounds: {
            north: Math.max(a.lat, b.lat),
            south: Math.min(a.lat, b.lat),
            east: Math.max(a.lng, b.lng),
            west: Math.min(a.lng, b.lng),
          },
        });
        setDraftPoints([]);
      }
    },
    dblclick(e) {
      if (tool !== "polygon" || draftPoints.length < 2) return;
      e.originalEvent.preventDefault();
      const closed = [...draftPoints, { lat: e.latlng.lat, lng: e.latlng.lng }];
      if (closed.length >= 3) {
        onBoundaryChange({ type: "polygon", points: closed });
        setDraftPoints([]);
      }
    },
    moveend() {
      if (tool === "pan") setShowSearchArea(true);
    },
  });
  return null;
}

function SearchAreaButton({
  show,
  onSearch,
}: {
  show: boolean;
  onSearch: (bounds: MapBounds) => void;
}) {
  const map = useMap();
  if (!show) return null;
  return (
    <button
      type="button"
      onClick={() => {
        const b = map.getBounds();
        onSearch({
          north: b.getNorth(),
          south: b.getSouth(),
          east: b.getEast(),
          west: b.getWest(),
        });
      }}
      className="absolute top-3 left-1/2 z-[500] -translate-x-1/2 rounded-full bg-gold px-4 py-2 text-xs font-bold text-navy shadow-lg"
    >
      Search this area
    </button>
  );
}

export function MarketplaceMap({
  listings,
  selectedId,
  onSelect,
  boundary,
  onBoundaryChange,
  className,
}: MarketplaceMapProps) {
  const [tool, setTool] = useState<DrawTool>("pan");
  const [draftPoints, setDraftPoints] = useState<LatLng[]>([]);
  const [radiusMiles, setRadiusMiles] = useState(10);
  const [showSearchArea, setShowSearchArea] = useState(false);

  const selected = useMemo(
    () => listings.find((l) => l.id === selectedId) ?? null,
    [listings, selectedId],
  );

  const draftPath = useMemo(
    () => draftPoints.map((p) => [p.lat, p.lng] as [number, number]),
    [draftPoints],
  );

  function applyPolygon() {
    if (draftPoints.length < 3) return;
    onBoundaryChange({ type: "polygon", points: draftPoints });
    setDraftPoints([]);
    setTool("pan");
  }

  function clearBoundary() {
    onBoundaryChange(null);
    setDraftPoints([]);
    setShowSearchArea(false);
    setTool("pan");
  }

  return (
    <div className={cn("relative isolate h-full min-h-[360px] w-full", className)}>
      <MapContainer
        center={[EAST_TEXAS_CENTER.lat, EAST_TEXAS_CENTER.lng]}
        zoom={EAST_TEXAS_DEFAULT_ZOOM}
        className="h-full w-full"
        scrollWheelZoom
        doubleClickZoom={tool !== "polygon"}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapController selected={selected} />
        <DrawEngine
          tool={tool}
          draftPoints={draftPoints}
          setDraftPoints={setDraftPoints}
          radiusMiles={radiusMiles}
          onBoundaryChange={(b) => {
            onBoundaryChange(b);
            setShowSearchArea(false);
            setTool("pan");
          }}
          setShowSearchArea={setShowSearchArea}
        />
        <SearchAreaButton
          show={showSearchArea && tool === "pan"}
          onSearch={(bounds) => {
            onBoundaryChange({ type: "viewport", bounds });
            setShowSearchArea(false);
          }}
        />

        {boundary?.type === "polygon" && (
          <Polygon
            positions={boundary.points.map((p) => [p.lat, p.lng] as [number, number])}
            pathOptions={{
              color: "#F0B93B",
              fillColor: "#F0B93B",
              fillOpacity: 0.18,
              weight: 2,
            }}
          />
        )}
        {boundary?.type === "circle" && (
          <Circle
            center={[boundary.center.lat, boundary.center.lng]}
            radius={boundary.radiusMiles * 1609.34}
            pathOptions={{
              color: "#F0B93B",
              fillColor: "#F0B93B",
              fillOpacity: 0.15,
              weight: 2,
            }}
          />
        )}
        {(boundary?.type === "rectangle" || boundary?.type === "viewport") && (
          <Rectangle
            bounds={[
              [boundary.bounds.south, boundary.bounds.west],
              [boundary.bounds.north, boundary.bounds.east],
            ]}
            pathOptions={{
              color: "#F0B93B",
              fillColor: "#F0B93B",
              fillOpacity: 0.12,
              weight: 2,
              dashArray: boundary.type === "viewport" ? "6 6" : undefined,
            }}
          />
        )}

        {draftPath.length > 0 && (
          <Polygon
            positions={draftPath}
            pathOptions={{
              color: "#F0B93B",
              fillOpacity: 0.08,
              dashArray: "4 6",
              weight: 2,
            }}
          />
        )}

        {listings.map((listing) => (
          <Marker
            key={listing.id}
            position={[listing.lat, listing.lng]}
            icon={priceIcon(listing.price, listing.id === selectedId)}
            eventHandlers={{
              click: () => onSelect(listing.id),
            }}
            zIndexOffset={listing.id === selectedId ? 1000 : 0}
          >
            <Tooltip direction="top" offset={[0, -24]}>
              <div className="text-xs">
                <strong>{formatUsd(listing.price)}</strong>
                <div>{listing.addressSerif}</div>
                <div>
                  {listing.beds} bd · {listing.baths} ba · {listing.city}
                </div>
              </div>
            </Tooltip>
          </Marker>
        ))}
      </MapContainer>

      {/* Map toolbar — Zillow/Realtor style */}
      <div className="absolute top-3 left-3 z-[500] flex max-w-[min(100%,420px)] flex-wrap gap-1.5">
        {(
          [
            ["pan", "Move"],
            ["polygon", "Draw"],
            ["radius", "Radius"],
            ["rectangle", "Box"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              setTool(id);
              setDraftPoints([]);
              setShowSearchArea(false);
            }}
            className={cn(
              "rounded-full px-3 py-1.5 text-[11px] font-bold shadow-md",
              tool === id
                ? "bg-gold text-navy"
                : "border border-hairline bg-navy/90 text-paper",
            )}
          >
            {label}
          </button>
        ))}
        {tool === "radius" && (
          <select
            value={radiusMiles}
            onChange={(e) => setRadiusMiles(Number(e.target.value))}
            className="rounded-full border border-hairline bg-navy/90 px-2 py-1.5 text-[11px] font-semibold text-paper"
          >
            {[5, 10, 15, 25, 50].map((m) => (
              <option key={m} value={m}>
                {m} mi
              </option>
            ))}
          </select>
        )}
        {tool === "polygon" && draftPoints.length >= 3 && (
          <button
            type="button"
            onClick={applyPolygon}
            className="rounded-full bg-gold px-3 py-1.5 text-[11px] font-bold text-navy shadow-md"
          >
            Apply shape
          </button>
        )}
        {(boundary || draftPoints.length > 0) && (
          <button
            type="button"
            onClick={clearBoundary}
            className="rounded-full border border-hairline bg-navy/90 px-3 py-1.5 text-[11px] font-bold text-paper shadow-md"
          >
            Clear boundary
          </button>
        )}
      </div>

      <div className="absolute right-3 bottom-3 z-[500] max-w-[220px] rounded-lg border border-hairline bg-navy/90 px-3 py-2 text-[11px] text-paper shadow-lg">
        {tool === "polygon" && (
          <p>Click to drop points. Double-click or Apply to finish.</p>
        )}
        {tool === "radius" && (
          <p>Click the map center for a {radiusMiles}-mile search radius.</p>
        )}
        {tool === "rectangle" && (
          <p>Click two corners to box an area.</p>
        )}
        {tool === "pan" && (
          <p>
            {boundaryLabel(boundary)
              ? `Boundary: ${boundaryLabel(boundary)}`
              : "Pan the map, then Search this area — or draw a custom boundary."}
          </p>
        )}
      </div>
    </div>
  );
}
