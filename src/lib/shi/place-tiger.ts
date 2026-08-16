/**
 * DC-3 — Census TIGER place + unified school district for launch 7.
 * Free public TIGERweb. Zoning districts are NOT invented —
 * city limits → VERIFY with city planning; outside city → no city zoning layer.
 */

import {
  CORRIDOR_COUNTIES,
  isLaunchCorridorFips,
} from "@/lib/shi/corridors";
import {
  evidenceChip,
  type EvidenceChip,
  type EvidenceTier,
} from "@/lib/shi/evidence-tier";

const PLACE_URL =
  "https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/Places_CouSub_ConCity_SubMCD/MapServer/4/query";

const COUSUB_URL =
  "https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/Places_CouSub_ConCity_SubMCD/MapServer/1/query";

const SCHOOL_URL =
  "https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/School/MapServer/0/query";

const FETCH_TIMEOUT_MS = 12_000;

export const PLACE_TIGER_HONESTY =
  "Census TIGER incorporated place / county subdivision — boundary context, not zoning approval.";

export const SCHOOL_TIGER_HONESTY =
  "Census TIGER unified school district boundary — pairs with CAD school codes; not school quality or assignment guarantees.";

export const ZONING_CONTEXT_HONESTY =
  "Archie does not invent zoning districts. Inside a city: verify with city planning. Outside: no city zoning layer on this desk.";

const COVERAGE_READY: ReadonlySet<string> = new Set(
  CORRIDOR_COUNTIES.map((c) => c.fips as string),
);

export type PlaceFact = {
  version: "place-tiger-v1";
  countyFips: string;
  lat: number;
  lng: number;
  placeName: string | null;
  placeGeoid: string | null;
  countySubdivision: string | null;
  incorporated: boolean;
  tier: EvidenceTier;
  chip: EvidenceChip;
  headline: string;
  detail: string;
  honesty: string;
  userReveal: boolean;
  gateNote: string | null;
  queriedAt: string;
};

export type SchoolDistrictFact = {
  version: "school-tiger-v1";
  countyFips: string;
  lat: number;
  lng: number;
  districtName: string | null;
  geoid: string | null;
  tier: EvidenceTier;
  chip: EvidenceChip;
  headline: string;
  detail: string;
  honesty: string;
  userReveal: boolean;
  gateNote: string | null;
  queriedAt: string;
};

export type ZoningContextFact = {
  version: "zoning-context-v1";
  countyFips: string;
  lat: number;
  lng: number;
  /** Never a district code unless we host an official city layer (none yet). */
  districtCode: string | null;
  placeName: string | null;
  status: "city_verify" | "no_city_layer" | "unavailable";
  tier: EvidenceTier;
  chip: EvidenceChip;
  headline: string;
  detail: string;
  honesty: string;
  userReveal: boolean;
  gateNote: string | null;
  queriedAt: string;
};

function str(v: unknown): string | null {
  if (typeof v === "string" && v.trim()) return v.trim();
  return null;
}

async function tigerPointQuery(
  url: string,
  lat: number,
  lng: number,
  outFields: string,
): Promise<Record<string, unknown>[]> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const qs = new URLSearchParams({
      f: "json",
      geometry: `${lng},${lat}`,
      geometryType: "esriGeometryPoint",
      inSR: "4326",
      spatialRel: "esriSpatialRelIntersects",
      outFields,
      returnGeometry: "false",
    });
    const res = await fetch(`${url}?${qs.toString()}`, {
      signal: ctrl.signal,
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`TIGER query failed (${res.status})`);
    const body = (await res.json()) as {
      features?: Array<{ attributes?: Record<string, unknown> }>;
      error?: { message?: string };
    };
    if (body.error) throw new Error(body.error.message || "TIGER query error");
    return (body.features ?? [])
      .map((f) => f.attributes ?? {})
      .filter((a) => Object.keys(a).length > 0);
  } finally {
    clearTimeout(timer);
  }
}

export function buildZoningContext(opts: {
  countyFips: string;
  lat: number;
  lng: number;
  place: PlaceFact;
  queriedAt: string;
}): ZoningContextFact {
  if (!opts.place.userReveal) {
    return {
      version: "zoning-context-v1",
      countyFips: opts.countyFips,
      lat: opts.lat,
      lng: opts.lng,
      districtCode: null,
      placeName: null,
      status: "unavailable",
      tier: "UNKNOWN",
      chip: evidenceChip({ tier: "UNKNOWN", source: "City zoning (not connected)" }),
      headline: "Zoning context unavailable",
      detail: opts.place.gateNote || "Place context did not load.",
      honesty: ZONING_CONTEXT_HONESTY,
      userReveal: false,
      gateNote: opts.place.gateNote,
      queriedAt: opts.queriedAt,
    };
  }

  if (opts.place.incorporated && opts.place.placeName) {
    const name = opts.place.placeName.replace(/\s+city$/i, "");
    return {
      version: "zoning-context-v1",
      countyFips: opts.countyFips,
      lat: opts.lat,
      lng: opts.lng,
      districtCode: null,
      placeName: opts.place.placeName,
      status: "city_verify",
      tier: "VERIFY",
      chip: evidenceChip({
        tier: "VERIFY",
        source: "City planning (verify)",
        asOf: opts.queriedAt.slice(0, 10),
        label: "VERIFY zoning",
      }),
      headline: `Inside ${name} — confirm zoning with city planning`,
      detail: `Census shows this point in ${opts.place.placeName}. Archie does not invent district codes without an official city zoning layer on the desk. Call or check the city zoning map before relying.`,
      honesty: ZONING_CONTEXT_HONESTY,
      userReveal: true,
      gateNote: null,
      queriedAt: opts.queriedAt,
    };
  }

  return {
    version: "zoning-context-v1",
    countyFips: opts.countyFips,
    lat: opts.lat,
    lng: opts.lng,
    districtCode: null,
    placeName: null,
    status: "no_city_layer",
    tier: "KNOWN",
    chip: evidenceChip({
      tier: "KNOWN",
      source: "No city zoning layer",
      asOf: opts.queriedAt.slice(0, 10),
    }),
    headline: "Outside incorporated city — no city zoning layer",
    detail: opts.place.countySubdivision
      ? `County subdivision: ${opts.place.countySubdivision}. Unincorporated areas often have little or no municipal zoning — verify with the county before relying.`
      : "Unincorporated / no Census incorporated place at this point. Do not invent a zoning district.",
    honesty: ZONING_CONTEXT_HONESTY,
    userReveal: true,
    gateNote: null,
    queriedAt: opts.queriedAt,
  };
}

export async function fetchPlaceAtPoint(opts: {
  countyFips: string;
  lat: number;
  lng: number;
}): Promise<PlaceFact> {
  const queriedAt = new Date().toISOString();
  const { countyFips, lat, lng } = opts;

  const fail = (gateNote: string): PlaceFact => ({
    version: "place-tiger-v1",
    countyFips,
    lat,
    lng,
    placeName: null,
    placeGeoid: null,
    countySubdivision: null,
    incorporated: false,
    tier: "UNKNOWN",
    chip: evidenceChip({ tier: "UNKNOWN", source: "Census TIGER" }),
    headline: "Place context unavailable",
    detail: gateNote,
    honesty: PLACE_TIGER_HONESTY,
    userReveal: false,
    gateNote,
    queriedAt,
  });

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return fail("Need a valid map point for place context.");
  }
  if (!isLaunchCorridorFips(countyFips) || !COVERAGE_READY.has(countyFips)) {
    return fail("Place desk is scoped to the launch 7 counties.");
  }

  try {
    const [places, cousubs] = await Promise.all([
      tigerPointQuery(PLACE_URL, lat, lng, "NAME,GEOID,STATE,PLACE"),
      tigerPointQuery(COUSUB_URL, lat, lng, "NAME,GEOID"),
    ]);
    const place = places[0];
    const cousub = cousubs[0];
    const placeName = place ? str(place.NAME) : null;
    const incorporated = Boolean(placeName);
    const countySubdivision = cousub ? str(cousub.NAME) : null;

    const headline = incorporated
      ? `Place · ${placeName}`
      : countySubdivision
        ? `Unincorporated · ${countySubdivision}`
        : "No Census place / subdivision at this point";

    return {
      version: "place-tiger-v1",
      countyFips,
      lat,
      lng,
      placeName,
      placeGeoid: place ? str(place.GEOID) : null,
      countySubdivision,
      incorporated,
      tier: "KNOWN",
      chip: evidenceChip({
        tier: "KNOWN",
        source: "Census TIGER",
        asOf: queriedAt.slice(0, 10),
        label: placeName || countySubdivision || "No place",
      }),
      headline,
      detail: incorporated
        ? `Incorporated place boundary from Census TIGER (${placeName}).`
        : countySubdivision
          ? `No incorporated city at this point. County subdivision: ${countySubdivision}.`
          : "Census TIGER returned no place or county subdivision here.",
      honesty: PLACE_TIGER_HONESTY,
      userReveal: true,
      gateNote: null,
      queriedAt,
    };
  } catch (e) {
    const msg =
      e instanceof Error && e.name === "AbortError"
        ? "TIGER place query timed out"
        : e instanceof Error
          ? e.message
          : "TIGER place query failed";
    return fail(msg);
  }
}

export async function fetchSchoolDistrictAtPoint(opts: {
  countyFips: string;
  lat: number;
  lng: number;
}): Promise<SchoolDistrictFact> {
  const queriedAt = new Date().toISOString();
  const { countyFips, lat, lng } = opts;

  const fail = (gateNote: string): SchoolDistrictFact => ({
    version: "school-tiger-v1",
    countyFips,
    lat,
    lng,
    districtName: null,
    geoid: null,
    tier: "UNKNOWN",
    chip: evidenceChip({ tier: "UNKNOWN", source: "Census TIGER schools" }),
    headline: "School district unavailable",
    detail: gateNote,
    honesty: SCHOOL_TIGER_HONESTY,
    userReveal: false,
    gateNote,
    queriedAt,
  });

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return fail("Need a valid map point for school district.");
  }
  if (!isLaunchCorridorFips(countyFips) || !COVERAGE_READY.has(countyFips)) {
    return fail("School desk is scoped to the launch 7 counties.");
  }

  try {
    const rows = await tigerPointQuery(SCHOOL_URL, lat, lng, "NAME,GEOID");
    const row = rows[0];
    const districtName = row ? str(row.NAME) : null;
    const geoid = row ? str(row.GEOID) : null;

    return {
      version: "school-tiger-v1",
      countyFips,
      lat,
      lng,
      districtName,
      geoid,
      tier: "KNOWN",
      chip: evidenceChip({
        tier: "KNOWN",
        source: "Census TIGER schools",
        asOf: queriedAt.slice(0, 10),
        label: districtName || "No USD",
      }),
      headline: districtName
        ? `School district · ${districtName}`
        : "No unified school district polygon at this point",
      detail: districtName
        ? `Census TIGER unified school district: ${districtName}${geoid ? ` · GEOID ${geoid}` : ""}. Cross-check CAD school code on the property record.`
        : "No unified school district returned here — verify with CAD school code / TEA.",
      honesty: SCHOOL_TIGER_HONESTY,
      userReveal: true,
      gateNote: null,
      queriedAt,
    };
  } catch (e) {
    const msg =
      e instanceof Error && e.name === "AbortError"
        ? "TIGER school query timed out"
        : e instanceof Error
          ? e.message
          : "TIGER school query failed";
    return fail(msg);
  }
}
