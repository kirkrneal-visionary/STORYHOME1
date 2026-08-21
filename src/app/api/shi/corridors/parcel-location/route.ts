import { NextRequest, NextResponse } from "next/server";
import {
  FRONTAGE_BUFFER_M,
  INTERSECTION_JOIN_M,
  INTERSECTION_SEARCH_M,
  MIN_FRONTAGE_FT,
  approxFrontageFromGeojson,
  approxIntersectionDistanceFromGeojson,
  buildParcelLocationIntel,
  stationFallbackIntel,
  type FrontageRoadHit,
  type IntersectionDistanceHit,
  type ParcelLocationIntel,
} from "@/lib/shi/corridor-frontage";
import {
  isLaunchCorridorFips,
  resolveCorridorCounty,
  type TrafficCorridorSegment,
  type TrafficStation,
} from "@/lib/shi/corridors";
import { deriveParcelPosition } from "@/lib/shi/parcel-position-engine";
import {
  buildParcelPositionProfile,
  type ParcelCadSnapshot,
} from "@/lib/shi/parcel-position-profile";
import { softCacheCountyTraffic } from "@/lib/shi/corridor-segment-cache";
import { requireStoryPro } from "@/lib/shi/require-pro";
import {
  readCountyTrafficObservations,
  stationsFromCachedObservations,
} from "@/lib/shi/traffic-observation-cache";
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
 * C2.0-C + IX-1 — parcel location intel (approx frontage, dual-road,
 * confidence, approx meters to mapped-road crossing).
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
  let intersectionHit: IntersectionDistanceHit | null = null;
  let intersectionTier: ParcelLocationIntel["intersectionTier"] = null;

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
        /* IX-1 PostGIS crossing distance (soft-fail) */
        try {
          const { data: ix, error: ixErr } = await gate.supabase.rpc(
            "corridor_parcel_intersection_distance",
            {
              p_prop_id: propId,
              p_source: parcelSource,
              p_join_m: INTERSECTION_JOIN_M,
              p_search_m: INTERSECTION_SEARCH_M,
            },
          );
          if (!ixErr && Array.isArray(ix) && ix[0]) {
            const row = ix[0] as {
              approx_distance_m?: number;
              route_a?: string;
              route_b?: string;
            };
            const m = Number(row.approx_distance_m);
            if (Number.isFinite(m) && row.route_a && row.route_b) {
              intersectionHit = {
                approxDistanceToIntersectionM: m,
                routeA: String(row.route_a),
                routeB: String(row.route_b),
              };
              intersectionTier = "CALCULATED";
            }
          }
        } catch {
          /* retract meters — keep frontage */
        }
        intel = buildParcelLocationIntel({
          roads,
          source: "postgis",
          observationYear: year,
          intersection: intersectionHit,
          intersectionTier,
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
      const ixHit = approxIntersectionDistanceFromGeojson({
        parcelGeojson: parcelGeo,
        segments,
      });
      intel = buildParcelLocationIntel({
        roads,
        source: "client_approx",
        observationYear: observationYear || null,
        stationNearby: roads.length > 0,
        intersection: ixHit,
        intersectionTier: ixHit ? "ESTIMATED" : null,
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

  let stations: TrafficStation[] = [];
  try {
    const cachedRows = await readCountyTrafficObservations(
      gate.supabase,
      countyFips,
    );
    stations = stationsFromCachedObservations(
      cachedRows,
      countyFips,
      county.name,
    );
  } catch {
    stations = [];
  }
  if (stations.length === 0) {
    try {
      const live = await fetchCountyTraffic(countyFips);
      stations = live.stations ?? [];
      void softCacheCountyTraffic({
        countyFips,
        segments: live.segments ?? [],
        stations,
      });
    } catch {
      stations = [];
    }
  }

  const position = deriveParcelPosition({
    propId,
    source: parcelSource,
    intel,
    stations,
    lat: Number.isFinite(lat) ? lat : null,
    lng: Number.isFinite(lng) ? lng : null,
  });

  let cad: ParcelCadSnapshot = {
    propId,
    source: parcelSource,
    ownerName: null,
    situsAddress: null,
    legalAcreage: null,
    marketValue: null,
  };
  try {
    const { data: row } = await gate.supabase
      .from("county_parcels")
      .select("prop_id, source, owner_name, situs_address, legal_acreage, market_value")
      .eq("prop_id", propId)
      .eq("source", parcelSource)
      .maybeSingle();
    if (row && String(row.prop_id) === propId) {
      cad = {
        propId: String(row.prop_id),
        source: String(row.source ?? parcelSource),
        ownerName: row.owner_name == null ? null : String(row.owner_name),
        situsAddress:
          row.situs_address == null ? null : String(row.situs_address),
        legalAcreage:
          row.legal_acreage == null || !Number.isFinite(Number(row.legal_acreage))
            ? null
            : Number(row.legal_acreage),
        marketValue:
          row.market_value == null || !Number.isFinite(Number(row.market_value))
            ? null
            : Number(row.market_value),
      };
    }
  } catch {
    /* keep empty CAD — do not borrow another parcel */
  }

  const profile = buildParcelPositionProfile({ position, cad });

  return NextResponse.json(
    {
      intel,
      position,
      profile,
      honesty: {
        frontageLabel: "APPROX",
        surveyed: false,
        intersectionRuleVersion: intel.intersectionRuleVersion,
        note:
          "Frontage and intersection distance are approximate from mapped roads — not a survey. Meters retract when no crossing is found.",
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
