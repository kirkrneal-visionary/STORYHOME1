/**
 * Corridors 2.0-C — soft persist TxDOT segments / observations into PostGIS.
 * Never blocks live TxDOT; failures are swallowed.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type {
  TrafficCorridorSegment,
  TrafficStation,
} from "@/lib/shi/corridors";

function serviceClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

function toMultiLine(
  geom: GeoJSON.LineString | GeoJSON.MultiLineString,
): GeoJSON.MultiLineString {
  if (geom.type === "MultiLineString") return geom;
  return { type: "MultiLineString", coordinates: [geom.coordinates] };
}

/** EWKT for PostgREST geometry columns (more reliable than raw GeoJSON objects). */
function multiLineEwkt(geom: GeoJSON.LineString | GeoJSON.MultiLineString): string {
  const multi = toMultiLine(geom);
  const parts = multi.coordinates
    .map(
      (path) =>
        `(${path.map(([lng, lat]) => `${lng} ${lat}`).join(", ")})`,
    )
    .join(", ");
  return `SRID=4326;MULTILINESTRING(${parts})`;
}

function pointEwkt(lng: number, lat: number): string {
  return `SRID=4326;POINT(${lng} ${lat})`;
}

/** Fire-and-forget upsert after a successful live TxDOT county fetch. */
export async function softCacheCountyTraffic(opts: {
  countyFips: string;
  segments: TrafficCorridorSegment[];
  stations: TrafficStation[];
}): Promise<{ ok: boolean; reason?: string }> {
  const sb = serviceClient();
  if (!sb) return { ok: false, reason: "no_service_role" };

  try {
    if (opts.segments.length > 0) {
      const rows = opts.segments.slice(0, 800).map((s) => ({
        id: s.id,
        county_fips: opts.countyFips,
        route_id: s.routeId,
        aadt: s.aadt,
        geom: multiLineEwkt(s.geometry),
        source: "txdot",
        updated_at: new Date().toISOString(),
      }));
      const { error } = await sb.from("corridor_road_segments").upsert(rows, {
        onConflict: "id",
      });
      if (error) return { ok: false, reason: error.message };
    }

    if (opts.stations.length > 0) {
      const now = new Date().toISOString();
      const seen = new Set<string>();
      const obs: Array<{
        county_fips: string;
        station_id: string;
        on_road: string | null;
        year: number;
        aadt: number | null;
        lat: number;
        lng: number;
        geom: string;
        source: string;
        updated_at: string;
      }> = [];
      for (const s of opts.stations) {
        const years = [
          ...s.history,
          { year: s.latestYear, aadt: s.latestAadt },
        ];
        for (const h of years) {
          if (h.year == null || !Number.isFinite(h.year) || h.year < 1900) {
            continue;
          }
          if (h.aadt == null || !Number.isFinite(h.aadt)) continue;
          const key = `${s.stationId}:${h.year}`;
          if (seen.has(key)) continue;
          seen.add(key);
          obs.push({
            county_fips: opts.countyFips,
            station_id: s.stationId,
            on_road: s.onRoad,
            year: h.year,
            aadt: h.aadt,
            lat: s.lat,
            lng: s.lng,
            geom: pointEwkt(s.lng, s.lat),
            source: "txdot",
            updated_at: now,
          });
        }
      }
      const rows = obs.slice(0, 1200);
      if (rows.length) {
        const { error } = await sb
          .from("corridor_traffic_observations")
          .upsert(rows, { onConflict: "county_fips,station_id,year" });
        if (error) return { ok: false, reason: error.message };
      }
    }

    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      reason: e instanceof Error ? e.message : "cache_failed",
    };
  }
}
