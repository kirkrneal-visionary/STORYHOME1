/**
 * Batch parcel-position derive for a drawn area — Phase 4.
 * One county context. Each parcel keeps its own frontage / traffic.
 * Soft-fail per parcel. Never copy a neighbor's derived fields.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  approxFrontageFromGeojson,
  approxIntersectionDistanceFromGeojson,
  buildParcelLocationIntel,
  type ParcelLocationIntel,
} from "@/lib/shi/corridor-frontage";
import type {
  TrafficCorridorSegment,
  TrafficStation,
} from "@/lib/shi/corridors";
import { softCacheCountyTraffic } from "@/lib/shi/corridor-segment-cache";
import { deriveParcelPosition } from "@/lib/shi/parcel-position-engine";
import {
  AREA_POSITION_SCAN_CAP,
  type AreaScanRow,
} from "@/lib/shi/parcel-position-area";
import {
  buildParcelPositionProfile,
  type ParcelCadSnapshot,
} from "@/lib/shi/parcel-position-profile";
import {
  readCountyTrafficObservations,
  stationsFromCachedObservations,
} from "@/lib/shi/traffic-observation-cache";
import { fetchCountyTraffic } from "@/lib/shi/traffic-txdot";

const CAD_SCAN_SELECT =
  "prop_id, source, owner_name, situs_address, legal_acreage, market_value, geojson, centroid_lat, centroid_lng";

export type AreaScanInputParcel = {
  propId: string;
  lat?: number | null;
  lng?: number | null;
  acres?: number | null;
};

type ParcelGeo = {
  type: "Polygon" | "MultiPolygon";
  coordinates: number[][][] | number[][][][];
};

export type CountyScanContext = {
  countyFips: string;
  countyName: string;
  source: string;
  stations: TrafficStation[];
  segments: TrafficCorridorSegment[];
};

function asParcelGeo(raw: unknown): ParcelGeo | null {
  if (!raw || typeof raw !== "object") return null;
  const g = raw as { type?: string; coordinates?: unknown };
  if (
    (g.type === "Polygon" || g.type === "MultiPolygon") &&
    Array.isArray(g.coordinates)
  ) {
    return g as ParcelGeo;
  }
  return null;
}

function num(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function mapCachedSegments(
  rows: Array<{
    id?: unknown;
    route_id?: unknown;
    aadt?: unknown;
    geom?: unknown;
  }>,
  countyFips: string,
): TrafficCorridorSegment[] {
  return rows
    .map((r) => {
      const geom = r.geom as
        | GeoJSON.LineString
        | GeoJSON.MultiLineString
        | null;
      if (
        !geom ||
        (geom.type !== "LineString" && geom.type !== "MultiLineString")
      ) {
        return null;
      }
      return {
        id: String(r.id),
        routeId: String(r.route_id),
        aadt:
          r.aadt != null && Number.isFinite(Number(r.aadt))
            ? Number(r.aadt)
            : null,
        countyFips,
        geometry: geom,
      } satisfies TrafficCorridorSegment;
    })
    .filter((s): s is TrafficCorridorSegment => s != null);
}

export async function loadCountyScanContext(opts: {
  supabase: SupabaseClient;
  countyFips: string;
  countyName: string;
  source: string;
}): Promise<CountyScanContext> {
  let stations: TrafficStation[] = [];
  let segments: TrafficCorridorSegment[] = [];

  try {
    const cachedRows = await readCountyTrafficObservations(
      opts.supabase,
      opts.countyFips,
    );
    stations = stationsFromCachedObservations(
      cachedRows,
      opts.countyFips,
      opts.countyName,
    );
  } catch {
    stations = [];
  }

  try {
    const { data: cached } = await opts.supabase
      .from("corridor_road_segments")
      .select("id, route_id, aadt, geom")
      .eq("county_fips", opts.countyFips)
      .limit(800);
    if (Array.isArray(cached) && cached.length > 0) {
      segments = mapCachedSegments(cached, opts.countyFips);
    }
  } catch {
    segments = [];
  }

  if (stations.length === 0 || segments.length === 0) {
    try {
      const live = await fetchCountyTraffic(opts.countyFips);
      if (stations.length === 0) stations = live.stations ?? [];
      if (segments.length === 0) segments = live.segments ?? [];
      void softCacheCountyTraffic({
        countyFips: opts.countyFips,
        segments: live.segments ?? [],
        stations: live.stations ?? [],
      });
    } catch {
      /* keep whatever cache we have */
    }
  }

  return {
    countyFips: opts.countyFips,
    countyName: opts.countyName,
    source: opts.source,
    stations,
    segments,
  };
}

function intelForParcel(opts: {
  geo: ParcelGeo | null;
  segments: TrafficCorridorSegment[];
}): ParcelLocationIntel {
  if (opts.geo && opts.segments.length > 0) {
    const roads = approxFrontageFromGeojson({
      parcelGeojson: opts.geo,
      segments: opts.segments,
    });
    const ixHit = approxIntersectionDistanceFromGeojson({
      parcelGeojson: opts.geo,
      segments: opts.segments,
    });
    return buildParcelLocationIntel({
      roads,
      source: "client_approx",
      observationYear: new Date().getFullYear(),
      stationNearby: roads.length > 0,
      intersection: ixHit,
      intersectionTier: ixHit ? "ESTIMATED" : null,
    });
  }
  return buildParcelLocationIntel({
    roads: [],
    source: "station_fallback",
    stationNearby: false,
  });
}

/**
 * Derive one profile per requested parcel. Unknown stays unknown.
 * CAD row must match that prop_id — never borrow a neighbor.
 */
export async function scanAreaPositions(opts: {
  supabase: SupabaseClient;
  context: CountyScanContext;
  parcels: AreaScanInputParcel[];
}): Promise<AreaScanRow[]> {
  const incoming = opts.parcels
    .filter((p) => typeof p.propId === "string" && p.propId.trim())
    .slice(0, AREA_POSITION_SCAN_CAP);
  if (incoming.length === 0) return [];

  const ids = [...new Set(incoming.map((p) => p.propId.trim()))];
  let rows: Array<Record<string, unknown>> = [];
  try {
    const { data, error } = await opts.supabase
      .from("county_parcels")
      .select(CAD_SCAN_SELECT)
      .eq("source", opts.context.source)
      .in("prop_id", ids);
    if (!error && Array.isArray(data)) {
      rows = data as Array<Record<string, unknown>>;
    }
  } catch {
    rows = [];
  }

  const byId = new Map<string, Record<string, unknown>>();
  for (const row of rows) {
    const id = String(row.prop_id ?? "");
    if (id) byId.set(id, row);
  }

  const out: AreaScanRow[] = [];
  for (const req of incoming) {
    const propId = req.propId.trim();
    const cadRow = byId.get(propId);
    if (cadRow && String(cadRow.prop_id) !== propId) continue;

    const lat = num(req.lat) ?? num(cadRow?.centroid_lat);
    const lng = num(req.lng) ?? num(cadRow?.centroid_lng);
    const acres = num(req.acres) ?? num(cadRow?.legal_acreage);
    const geo = asParcelGeo(cadRow?.geojson);
    const intel = intelForParcel({
      geo,
      segments: opts.context.segments,
    });
    const position = deriveParcelPosition({
      propId,
      source: opts.context.source,
      intel,
      stations: opts.context.stations,
      lat,
      lng,
    });
    const cad: ParcelCadSnapshot = {
      propId,
      source: opts.context.source,
      ownerName:
        cadRow?.owner_name == null ? null : String(cadRow.owner_name),
      situsAddress:
        cadRow?.situs_address == null ? null : String(cadRow.situs_address),
      legalAcreage: num(cadRow?.legal_acreage),
      marketValue: num(cadRow?.market_value),
    };
    const profile = buildParcelPositionProfile({ position, cad });
    out.push({
      position,
      profile,
      acres,
      lat,
      lng,
    });
  }
  return out;
}
