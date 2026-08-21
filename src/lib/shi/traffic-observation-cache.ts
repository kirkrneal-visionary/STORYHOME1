/**
 * Read cached TxDOT station-year observations.
 * Founder Interpreter (build process only) — not a product.
 *
 * Writes stay in corridor-segment-cache (service role, fire-and-forget).
 * Reads use the authenticated Story Pro client — no service-role in this file.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  isLaunchCorridorFips,
  trendFromHistory,
  type TrafficStation,
  type TrafficYearPoint,
} from "@/lib/shi/corridors";

export type CachedTrafficObservation = {
  countyFips: string;
  stationId: string;
  onRoad: string | null;
  year: number;
  aadt: number | null;
  lat: number | null;
  lng: number | null;
  source: string;
  updatedAt: string | null;
};

const OBS_SELECT =
  "county_fips, station_id, on_road, year, aadt, lat, lng, source, updated_at";

/**
 * Soft-read. Empty on error, non-launch FIPS, or a cold cache.
 * Never invents a count.
 */
export async function readCountyTrafficObservations(
  supabase: SupabaseClient,
  countyFips: string,
): Promise<CachedTrafficObservation[]> {
  const fips = countyFips.trim();
  if (!fips || !isLaunchCorridorFips(fips)) return [];

  const { data, error } = await supabase
    .from("corridor_traffic_observations")
    .select(OBS_SELECT)
    .eq("county_fips", fips)
    .order("year", { ascending: false })
    .limit(4000);

  if (error || !Array.isArray(data)) return [];

  return data
    .map((r) => {
      const row = r as Record<string, unknown>;
      const year = Number(row.year);
      const lat = row.lat == null ? null : Number(row.lat);
      const lng = row.lng == null ? null : Number(row.lng);
      const aadt = row.aadt == null ? null : Number(row.aadt);
      const stationId = String(row.station_id ?? "").trim();
      if (!stationId || !Number.isFinite(year) || year < 1900) return null;
      return {
        countyFips: String(row.county_fips ?? fips),
        stationId,
        onRoad: row.on_road == null ? null : String(row.on_road),
        year,
        aadt: aadt != null && Number.isFinite(aadt) ? aadt : null,
        lat: lat != null && Number.isFinite(lat) ? lat : null,
        lng: lng != null && Number.isFinite(lng) ? lng : null,
        source: String(row.source ?? "txdot"),
        updatedAt: row.updated_at == null ? null : String(row.updated_at),
      } satisfies CachedTrafficObservation;
    })
    .filter((r): r is CachedTrafficObservation => r != null);
}

/** Rebuild stations from cached year rows. History newest → older. */
export function stationsFromCachedObservations(
  rows: CachedTrafficObservation[],
  countyFips: string,
  countyName = "",
): TrafficStation[] {
  const byStation = new Map<string, CachedTrafficObservation[]>();
  for (const row of rows) {
    const list = byStation.get(row.stationId) ?? [];
    list.push(row);
    byStation.set(row.stationId, list);
  }

  const stations: TrafficStation[] = [];
  for (const [stationId, list] of byStation) {
    const years = [...list].sort((a, b) => b.year - a.year);
    const history: TrafficYearPoint[] = years.map((y) => ({
      year: y.year,
      aadt: y.aadt,
    }));
    const latest = years.find((y) => y.aadt != null) ?? years[0];
    if (!latest) continue;
    const lat = years.find((y) => y.lat != null)?.lat;
    const lng = years.find((y) => y.lng != null)?.lng;
    if (lat == null || lng == null) continue;
    stations.push({
      id: `${countyFips}:${stationId}`,
      stationId,
      onRoad: latest.onRoad,
      countyName,
      countyFips,
      category: null,
      latestYear: latest.year,
      latestAadt: latest.aadt,
      history,
      trendLabel: trendFromHistory(history),
      lat,
      lng,
    });
  }

  return stations.sort((a, b) => (b.latestAadt ?? -1) - (a.latestAadt ?? -1));
}
