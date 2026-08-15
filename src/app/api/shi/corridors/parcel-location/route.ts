import { NextRequest, NextResponse } from "next/server";
import {
  FRONTAGE_BUFFER_M,
  MIN_FRONTAGE_FT,
  approxFrontageFromGeojson,
  buildParcelLocationIntel,
  stationFallbackIntel,
  type FrontageRoadHit,
  type ParcelLocationIntel,
} from "@/lib/shi/corridor-frontage";
import {
  isLaunchCorridorFips,
  resolveCorridorCounty,
  type TrafficCorridorSegment,
} from "@/lib/shi/corridors";
import { softCacheCountyTraffic } from "@/lib/shi/corridor-segment-cache";
import { requireStoryPro } from "@/lib/shi/require-pro";
import { fetchCountyTraffic } from "@/lib/shi/traffic-txdot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type ParcelGeo = {
  type: "Polygon" | "MultiPolygon";
  coordinates: number[][][] | number[][][][];
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

/**
 * C2.0-C — parcel location intel (approx frontage, dual-road, confidence).
 * Prefer PostGIS RPC when segment cache is warm; else JS approx + live TxDOT.
 */
export async function GET(req: NextRequest) {
  const gate = await requireStoryPro();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const sp = req.nextUrl.searchParams;
  const propId = (sp.get("propId") ?? "").trim();
  const source = (sp.get("source") ?? "").trim();
  const countyFips =
    (sp.get("countyFips") ?? sp.get("fips") ?? "").trim() ||
    resolveCorridorCounty(null).fips;
  const lat = Number(sp.get("lat"));
  const lng = Number(sp.get("lng"));

  if (!propId) {
    return NextResponse.json({ error: "propId is required" }, { status: 400 });
  }
  if (!isLaunchCorridorFips(countyFips)) {
    const fallback = resolveCorridorCounty(null);
    return NextResponse.json(
      {
        error: `Corridors supports the launch 7 counties only. Try countyFips=${fallback.fips}.`,
      },
      { status: 400 },
    );
  }

  const county = resolveCorridorCounty(countyFips);
  const parcelSource = source || county.source;

  let intel: ParcelLocationIntel | null = null;
  let cacheNote: string | null = null;

  /* 1) PostGIS frontage when migration + cache are live */
  try {
    const { data, error } = await gate.supabase.rpc("corridor_parcel_frontage", {
      p_prop_id: propId,
      p_source: parcelSource,
      p_buffer_m: FRONTAGE_BUFFER_M,
    });
    if (!error && Array.isArray(data) && data.length > 0) {
      const roads: FrontageRoadHit[] = data
        .map(
          (r: {
            route_id?: string;
            approx_frontage_ft?: number;
            aadt?: number | null;
            segment_id?: string;
          }) => ({
            routeId: String(r.route_id ?? ""),
            approxFrontageFt: Math.round(Number(r.approx_frontage_ft) || 0),
            aadt:
              r.aadt != null && Number.isFinite(Number(r.aadt))
                ? Number(r.aadt)
                : null,
            segmentId: String(r.segment_id ?? ""),
          }),
        )
        .filter(
          (r) => r.routeId && r.approxFrontageFt >= MIN_FRONTAGE_FT,
        );
      if (roads.length > 0) {
        const year = Math.max(
          ...roads.map((r) => 0),
          new Date().getFullYear(),
        );
        intel = buildParcelLocationIntel({
          roads,
          source: "postgis",
          observationYear: year,
        });
      }
    } else if (error) {
      cacheNote = "postgis_rpc_unavailable";
    }
  } catch {
    cacheNote = "postgis_rpc_unavailable";
  }

  /* 2) JS approx from parcel geojson + segments (cache or live TxDOT) */
  if (!intel) {
    let parcelGeo: ParcelGeo | null = null;
    try {
      const { data: row } = await gate.supabase
        .from("county_parcels")
        .select("geojson")
        .eq("prop_id", propId)
        .eq("source", parcelSource)
        .maybeSingle();
      parcelGeo = asParcelGeo(row?.geojson);
    } catch {
      parcelGeo = null;
    }

    let segments: TrafficCorridorSegment[] = [];
    try {
      const { data: cached } = await gate.supabase
        .from("corridor_road_segments")
        .select("id, route_id, aadt, geom")
        .eq("county_fips", countyFips)
        .limit(800);
      if (Array.isArray(cached) && cached.length > 0) {
        segments = cached
          .map((r) => {
            const geom = r.geom as
              | GeoJSON.LineString
              | GeoJSON.MultiLineString
              | null;
            if (!geom || (geom.type !== "LineString" && geom.type !== "MultiLineString")) {
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
        if (segments.length) cacheNote = cacheNote ?? "segments_from_cache";
      }
    } catch {
      /* cold / missing table */
    }

    if (segments.length === 0) {
      try {
        const live = await fetchCountyTraffic(countyFips);
        segments = live.segments ?? [];
        cacheNote = "segments_from_live_txdot";
        void softCacheCountyTraffic({
          countyFips,
          segments: live.segments ?? [],
          stations: live.stations ?? [],
        });
        if (!parcelGeo && Number.isFinite(lat) && Number.isFinite(lng)) {
          intel = stationFallbackIntel(live.stations ?? [], lat, lng);
        }
      } catch {
        cacheNote = "live_txdot_failed";
      }
    }

    if (!intel && parcelGeo && segments.length > 0) {
      const roads = approxFrontageFromGeojson({
        parcelGeojson: parcelGeo,
        segments,
      });
      const observationYear = Math.max(
        0,
        ...segments.map(() => new Date().getFullYear()),
      );
      intel = buildParcelLocationIntel({
        roads,
        source: "client_approx",
        observationYear: observationYear || null,
        stationNearby: roads.length > 0,
      });
    } else if (
      !intel &&
      Number.isFinite(lat) &&
      Number.isFinite(lng)
    ) {
      try {
        const live = await fetchCountyTraffic(countyFips);
        intel = stationFallbackIntel(live.stations ?? [], lat, lng);
        cacheNote = cacheNote ?? "station_fallback";
      } catch {
        intel = buildParcelLocationIntel({
          roads: [],
          source: "station_fallback",
          stationNearby: false,
        });
      }
    }
  }

  if (!intel) {
    intel = buildParcelLocationIntel({
      roads: [],
      source: "station_fallback",
      stationNearby: false,
    });
  }

  return NextResponse.json(
    {
      intel,
      honesty: {
        frontageLabel: "APPROX",
        surveyed: false,
        note:
          "Frontage is approximate from mapped roads — not a survey. Never claims measured-at-property without segment association.",
      },
      cacheNote,
      county: { fips: county.fips, name: county.name, source: county.source },
      propId,
    },
    {
      headers: { "Cache-Control": "private, max-age=60" },
    },
  );
}
