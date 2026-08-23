/**
 * ACS 5-year local housing context for launch 7.
 *
 * Owned clip: data/shi/acs5-housing-launch7.json
 * Geography: Census tract containing the parcel pin.
 * Household change is Not verified until a non-overlapping vintage is ingested.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { pointInPolygon, type LatLng } from "@/lib/geo";
import {
  CORRIDOR_COUNTIES,
  isLaunchCorridorFips,
} from "@/lib/shi/corridors";
import {
  evidenceChip,
  type EvidenceChip,
  type EvidenceTier,
} from "@/lib/shi/evidence-tier";

export const HOUSING_ACS_VERSION = "acs5-housing-launch7-v1" as const;
export const HOUSING_SOURCE_LABEL = "U.S. Census Bureau ACS 5-year (2019–2023)";

export const HOUSING_ACS_HONESTY =
  "Local housing context is the ACS 5-year estimate for the Census tract that contains the parcel pin. It is surrounding housing evidence — not apartment demand, not a forecast, and not a custom count of a drawn outline.";

const DATA_REL = path.join("data", "shi", "acs5-housing-launch7.json");

const COVERAGE_READY: ReadonlySet<string> = new Set(
  CORRIDOR_COUNTIES.map((c) => c.fips as string),
);

export type HousingTractRecord = {
  geoid: string;
  countyFips: string;
  population: number | null;
  households: number | null;
  ownerHouseholds: number | null;
  renterHouseholds: number | null;
  renterShare: number | null;
  housingUnits: number | null;
  vacantUnits: number | null;
  vacancyRate: number | null;
  medianHouseholdIncome: number | null;
  averageHouseholdSize: number | null;
  medianGrossRent: number | null;
  unitsInStructure2plus: number | null;
  householdChange: number | null;
  populationChange: number | null;
};

export type HousingFact = {
  version: typeof HOUSING_ACS_VERSION;
  countyFips: string;
  lat: number;
  lng: number;
  geoid: string | null;
  geographyLabel: string;
  vintageLabel: string;
  population: number | null;
  households: number | null;
  renterHouseholds: number | null;
  renterShare: number | null;
  householdChange: number | null;
  vacancyRate: number | null;
  medianHouseholdIncome: number | null;
  averageHouseholdSize: number | null;
  housingUnits: number | null;
  medianGrossRent: number | null;
  tier: EvidenceTier;
  chip: EvidenceChip;
  headline: string;
  detail: string;
  honesty: string;
  userReveal: boolean;
  gateNote: string | null;
  datasetAsOf: string | null;
  queriedAt: string;
};

type GeomRow = {
  geoid: string;
  type: "Polygon" | "MultiPolygon";
  coordinates: number[][][] | number[][][][];
};

type HousingDataset = {
  version: string;
  source: string;
  asOf: string;
  vintageLabel: string;
  honesty: string;
  householdChangeStatus?: string;
  tracts: HousingTractRecord[];
  geometries: GeomRow[];
};

type IndexedTract = {
  rec: HousingTractRecord;
  rings: LatLng[][];
};

let cached: {
  byGeoid: Map<string, HousingTractRecord>;
  index: IndexedTract[];
  asOf: string;
  vintageLabel: string;
  honesty: string;
} | null = null;
let loadError: string | null = null;

export function isHousingCoverageReady(countyFips: string): boolean {
  return isLaunchCorridorFips(countyFips) && COVERAGE_READY.has(countyFips);
}

function ringToLatLng(ring: number[][]): LatLng[] {
  return ring.map(([lng, lat]) => ({ lat, lng }));
}

function geometryRings(geom: GeomRow): LatLng[][] {
  if (geom.type === "Polygon") {
    const coords = geom.coordinates as number[][][];
    return coords[0] ? [ringToLatLng(coords[0])] : [];
  }
  const coords = geom.coordinates as number[][][][];
  return coords
    .map((poly) => (poly[0] ? ringToLatLng(poly[0]) : null))
    .filter((r): r is LatLng[] => Boolean(r && r.length >= 3));
}

async function loadDataset() {
  if (cached) return cached;
  if (loadError) throw new Error(loadError);
  try {
    const raw = await readFile(path.join(process.cwd(), DATA_REL), "utf8");
    const data = JSON.parse(raw) as HousingDataset;
    if (data.version !== HOUSING_ACS_VERSION) {
      throw new Error("ACS housing dataset version mismatch");
    }
    if (!Array.isArray(data.tracts) || data.tracts.length < 7) {
      throw new Error("ACS housing dataset missing or too thin");
    }
    const byGeoid = new Map(data.tracts.map((t) => [t.geoid, t]));
    const index: IndexedTract[] = [];
    for (const g of data.geometries) {
      const rec = byGeoid.get(g.geoid);
      if (!rec) continue;
      const rings = geometryRings(g);
      if (!rings.length) continue;
      index.push({ rec, rings });
    }
    cached = {
      byGeoid,
      index,
      asOf: data.asOf,
      vintageLabel: data.vintageLabel,
      honesty: data.honesty || HOUSING_ACS_HONESTY,
    };
    return cached;
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Could not load ACS housing";
    throw new Error(loadError);
  }
}

export function __resetHousingAcsCacheForTests() {
  cached = null;
  loadError = null;
}

export function lookupHousingByGeoid(
  geoid: string,
): HousingTractRecord | null {
  if (!cached) return null;
  return cached.byGeoid.get(geoid) ?? null;
}

export function findHousingTractAtPoint(lat: number, lng: number): HousingTractRecord | null {
  if (!cached) return null;
  const point: LatLng = { lat, lng };
  for (const row of cached.index) {
    if (row.rings.some((ring) => pointInPolygon(point, ring))) return row.rec;
  }
  return null;
}

function retracted(opts: {
  countyFips: string;
  lat: number;
  lng: number;
  gateNote: string;
  queriedAt: string;
}): HousingFact {
  return {
    version: HOUSING_ACS_VERSION,
    countyFips: opts.countyFips,
    lat: opts.lat,
    lng: opts.lng,
    geoid: null,
    geographyLabel: "Census tract",
    vintageLabel: "2019–2023",
    population: null,
    households: null,
    renterHouseholds: null,
    renterShare: null,
    householdChange: null,
    vacancyRate: null,
    medianHouseholdIncome: null,
    averageHouseholdSize: null,
    housingUnits: null,
    medianGrossRent: null,
    tier: "UNKNOWN",
    chip: evidenceChip({
      tier: "UNKNOWN",
      source: HOUSING_SOURCE_LABEL,
    }),
    headline: "Local housing context unavailable",
    detail: opts.gateNote,
    honesty: HOUSING_ACS_HONESTY,
    userReveal: false,
    gateNote: opts.gateNote,
    datasetAsOf: null,
    queriedAt: opts.queriedAt,
  };
}

function pct(n: number | null): string | null {
  if (n == null || !Number.isFinite(n)) return null;
  return `${Math.round(n * 100)}%`;
}

export function headlineForHousing(rec: HousingTractRecord | null): string {
  if (!rec) return "No Census tract match at this pin";
  const renter = pct(rec.renterShare);
  if (renter && rec.households != null) {
    return `${rec.households.toLocaleString("en-US")} households · ${renter} renter`;
  }
  if (rec.population != null) {
    return `Population ${rec.population.toLocaleString("en-US")}`;
  }
  return "Local housing context";
}

export function detailForHousing(rec: HousingTractRecord | null): string {
  if (!rec) {
    return "Archie could not match this pin to a Census tract in the launch-7 housing file.";
  }
  const bits: string[] = [];
  if (rec.population != null) {
    bits.push(`Population ${rec.population.toLocaleString("en-US")}`);
  }
  if (rec.households != null) {
    bits.push(`Households ${rec.households.toLocaleString("en-US")}`);
  }
  const renter = pct(rec.renterShare);
  if (renter) bits.push(`Renter households ${renter}`);
  if (rec.medianHouseholdIncome != null) {
    bits.push(
      `Median household income $${Math.round(rec.medianHouseholdIncome).toLocaleString("en-US")}`,
    );
  }
  bits.push("Household change is not verified in this vintage.");
  bits.push("This is the tract around the pin — not a custom count of your outline.");
  return bits.join(" · ");
}

export async function fetchHousingAtPoint(opts: {
  countyFips: string;
  lat: number;
  lng: number;
}): Promise<HousingFact> {
  const queriedAt = new Date().toISOString();
  const { countyFips, lat, lng } = opts;

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return retracted({
      countyFips,
      lat,
      lng,
      gateNote: "Need a valid map point to read local housing context.",
      queriedAt,
    });
  }
  if (!isHousingCoverageReady(countyFips)) {
    return retracted({
      countyFips,
      lat,
      lng,
      gateNote: "Local housing context is scoped to the launch 7 counties.",
      queriedAt,
    });
  }

  try {
    const ds = await loadDataset();
    const rec = findHousingTractAtPoint(lat, lng);
    const tier: EvidenceTier = rec ? "KNOWN" : "UNKNOWN";
    return {
      version: HOUSING_ACS_VERSION,
      countyFips,
      lat,
      lng,
      geoid: rec?.geoid ?? null,
      geographyLabel: rec
        ? `Census tract ${rec.geoid}`
        : "Census tract (no match)",
      vintageLabel: ds.vintageLabel,
      population: rec?.population ?? null,
      households: rec?.households ?? null,
      renterHouseholds: rec?.renterHouseholds ?? null,
      renterShare: rec?.renterShare ?? null,
      householdChange: rec?.householdChange ?? null,
      vacancyRate: rec?.vacancyRate ?? null,
      medianHouseholdIncome: rec?.medianHouseholdIncome ?? null,
      averageHouseholdSize: rec?.averageHouseholdSize ?? null,
      housingUnits: rec?.housingUnits ?? null,
      medianGrossRent: rec?.medianGrossRent ?? null,
      tier,
      chip: evidenceChip({
        tier,
        source: HOUSING_SOURCE_LABEL,
        asOf: ds.asOf,
        label: rec ? `Tract ${rec.geoid}` : "No tract match",
      }),
      headline: headlineForHousing(rec),
      detail: detailForHousing(rec),
      honesty: ds.honesty,
      userReveal: Boolean(rec),
      gateNote: rec
        ? null
        : "No Census tract in the launch-7 housing file contains this pin.",
      datasetAsOf: ds.asOf,
      queriedAt,
    };
  } catch (e) {
    return retracted({
      countyFips,
      lat,
      lng,
      gateNote: e instanceof Error ? e.message : "Housing desk failed",
      queriedAt,
    });
  }
}

export async function ensureHousingIndex() {
  return loadDataset();
}
