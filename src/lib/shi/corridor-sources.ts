/**
 * Corridors evidence SOURCE layer — pluggable adapters.
 *
 * CONNECT → NORMALIZE → (features/signals elsewhere)
 *
 * Live today: CAD parcels · TxDOT AADT · TxDOT projects.
 * Future slots are registered as "planned" / "unavailable" —
 * never pretended as integrated.
 */

export type CorridorSourceId =
  | "cad_parcels"
  | "txdot_aadt"
  | "txdot_projects"
  | "cad_observation"
  | "building_permits"
  | "subdivision_plats"
  | "zoning_landuse"
  | "utilities_infra"
  | "flood_environment"
  | "clerk_deeds"
  | "mls_licensed";

export type SourceStatus = "live" | "degraded" | "unavailable" | "planned";

export type SourceCategory =
  | "property"
  | "transportation"
  | "entitlement"
  | "environment"
  | "market";

/** Registry entry — adapter identity + honesty. */
export type CorridorSourceAdapter = {
  id: CorridorSourceId;
  /** Professional label (never table names) */
  label: string;
  category: SourceCategory;
  /** Default status when not overridden by a run */
  defaultStatus: SourceStatus;
  provider: string;
  honesty: string;
};

/** Per-analysis use of a source. */
export type CorridorSourceUse = {
  id: CorridorSourceId;
  label: string;
  category: SourceCategory;
  status: SourceStatus;
  provider: string;
  /** Short status line for the UI */
  note: string;
  honesty: string;
  /** True when this source contributed observed facts/signals */
  contributed: boolean;
};

export const CORRIDOR_SOURCE_HONESTY =
  "Archie only uses sources marked Live for this analysis. Planned sources are listed so expansion is ready — they are not treated as present.";

/**
 * Canonical adapter registry.
 * Adding a county/provider later = connect → normalize → validate → index —
 * not a Corridors rewrite.
 */
export const CORRIDOR_SOURCE_ADAPTERS: CorridorSourceAdapter[] = [
  {
    id: "cad_parcels",
    label: "County property records",
    category: "property",
    defaultStatus: "live",
    provider: "County appraisal / CAD (Story Home ingest)",
    honesty:
      "Parcel fields and values from county files Archie has loaded — appraisal observation, not sale price.",
  },
  {
    id: "txdot_aadt",
    label: "Published traffic counts",
    category: "transportation",
    defaultStatus: "live",
    provider: "TxDOT Open Data (AADT Annuals)",
    honesty:
      "Annual average daily traffic — planning averages, not live congestion.",
  },
  {
    id: "txdot_projects",
    label: "Highway projects",
    category: "transportation",
    defaultStatus: "live",
    provider: "TxDOT Project Tracker",
    honesty: "Public project lines near the area — schedule/status can change.",
  },
  {
    id: "cad_observation",
    label: "County observation changes",
    category: "property",
    defaultStatus: "live",
    provider: "Archie CAD observation events",
    honesty:
      "What Archie saw change between county file loads — not deed or sale dates.",
  },
  {
    id: "building_permits",
    label: "Building permits",
    category: "entitlement",
    defaultStatus: "planned",
    provider: "Not connected",
    honesty: "Adapter reserved — not used until a lawful feed is connected.",
  },
  {
    id: "subdivision_plats",
    label: "Subdivision plats",
    category: "entitlement",
    defaultStatus: "planned",
    provider: "Not connected",
    honesty: "Adapter reserved — not used until a lawful feed is connected.",
  },
  {
    id: "zoning_landuse",
    label: "Zoning / land use",
    category: "entitlement",
    defaultStatus: "planned",
    provider: "Not connected",
    honesty: "Adapter reserved — not used until a lawful feed is connected.",
  },
  {
    id: "utilities_infra",
    label: "Utilities & infrastructure",
    category: "environment",
    /** Live — status resolved per pass (point desk). */
    defaultStatus: "live",
    provider: "PUCT CCN (official shapefile, launch 7 clip)",
    honesty:
      "Certificated water/sewer service area from PUCT — not a tap guarantee. Retracted when the owned dataset cannot be read.",
  },
  {
    id: "flood_environment",
    label: "Flood / environmental",
    category: "environment",
    /** Live adapter — status resolved per pass (see resolveSourcesForAnalysis). */
    defaultStatus: "live",
    provider: "FEMA NFHL (public MapServer)",
    honesty:
      "Effective flood hazard zones from FEMA — not an insurance quote. Retracted from UI when the query fails.",
  },
  {
    id: "clerk_deeds",
    label: "Deed / transfer history",
    category: "property",
    defaultStatus: "planned",
    provider: "County clerk (owned dark store — not connected)",
    honesty:
      "Dark until Archie owns clerk-grade records for launch 7. CAD owner changes are not deeds. No DataTree / ATTOM rent.",
  },
  {
    id: "mls_licensed",
    label: "Licensed listing context",
    category: "market",
    defaultStatus: "planned",
    provider: "Not connected",
    honesty:
      "MLS stays separate from public-record research until properly licensed and scoped.",
  },
];

export function getSourceAdapter(
  id: CorridorSourceId,
): CorridorSourceAdapter | undefined {
  return CORRIDOR_SOURCE_ADAPTERS.find((a) => a.id === id);
}

/**
 * Build the source strip for one analysis run.
 * Does not invent availability — planned stays planned.
 */
export function resolveSourcesForAnalysis(opts: {
  parcelCount: number;
  trafficAvailable: boolean;
  trafficError?: string | null;
  stationCount: number;
  projectCount?: number;
  projectsAvailable?: boolean;
  cadPulseAvailable?: boolean;
  cadPulseNote?: string | null;
  /** DC-1 — flood fact contributed when userReveal */
  floodAvailable?: boolean;
  floodNote?: string | null;
  /** DC-2 — utilities CCN contributed when userReveal */
  utilitiesAvailable?: boolean;
  utilitiesNote?: string | null;
}): CorridorSourceUse[] {
  const uses: CorridorSourceUse[] = [];

  for (const adapter of CORRIDOR_SOURCE_ADAPTERS) {
    if (adapter.id === "utilities_infra") {
      if (opts.utilitiesAvailable === undefined) {
        uses.push({
          id: adapter.id,
          label: adapter.label,
          category: adapter.category,
          status: "planned",
          provider: adapter.provider,
          note: "Point utilities desk — open a parcel for PUCT CCN",
          honesty: adapter.honesty,
          contributed: false,
        });
        continue;
      }
      const ok = Boolean(opts.utilitiesAvailable);
      uses.push({
        id: adapter.id,
        label: adapter.label,
        category: adapter.category,
        status: ok ? "live" : "degraded",
        provider: adapter.provider,
        note: ok
          ? opts.utilitiesNote || "PUCT CCN available"
          : opts.utilitiesNote || "Utilities not revealed for this pass",
        honesty: adapter.honesty,
        contributed: ok,
      });
      continue;
    }

    if (adapter.id === "flood_environment") {
      /* undefined = this analysis pass did not query flood (point desk only). */
      if (opts.floodAvailable === undefined) {
        uses.push({
          id: adapter.id,
          label: adapter.label,
          category: adapter.category,
          status: "planned",
          provider: adapter.provider,
          note: "Point flood desk — open a parcel for FEMA zone",
          honesty: adapter.honesty,
          contributed: false,
        });
        continue;
      }
      const ok = Boolean(opts.floodAvailable);
      uses.push({
        id: adapter.id,
        label: adapter.label,
        category: adapter.category,
        status: ok ? "live" : "degraded",
        provider: adapter.provider,
        note: ok
          ? opts.floodNote || "FEMA flood zone available"
          : opts.floodNote || "Flood not revealed for this pass",
        honesty: adapter.honesty,
        contributed: ok,
      });
      continue;
    }

    if (adapter.id === "clerk_deeds") {
      uses.push({
        id: adapter.id,
        label: adapter.label,
        category: adapter.category,
        status: "planned",
        provider: adapter.provider,
        note: "Dark store — no user reveal until clerk-grade for launch 7",
        honesty: adapter.honesty,
        contributed: false,
      });
      continue;
    }

    if (adapter.defaultStatus === "planned") {
      uses.push({
        id: adapter.id,
        label: adapter.label,
        category: adapter.category,
        status: "planned",
        provider: adapter.provider,
        note: "Not connected yet",
        honesty: adapter.honesty,
        contributed: false,
      });
      continue;
    }

    if (adapter.id === "cad_parcels") {
      const ok = opts.parcelCount > 0;
      uses.push({
        id: adapter.id,
        label: adapter.label,
        category: adapter.category,
        status: ok ? "live" : "degraded",
        provider: adapter.provider,
        note: ok
          ? `${opts.parcelCount.toLocaleString("en-US")} parcels in outline`
          : "No parcels found in this outline",
        honesty: adapter.honesty,
        contributed: ok,
      });
      continue;
    }

    if (adapter.id === "txdot_aadt") {
      if (!opts.trafficAvailable) {
        uses.push({
          id: adapter.id,
          label: adapter.label,
          category: adapter.category,
          status: "unavailable",
          provider: adapter.provider,
          note: opts.trafficError || "Traffic history temporarily unavailable",
          honesty: adapter.honesty,
          contributed: false,
        });
      } else {
        uses.push({
          id: adapter.id,
          label: adapter.label,
          category: adapter.category,
          status: opts.stationCount > 0 ? "live" : "degraded",
          provider: adapter.provider,
          note:
            opts.stationCount > 0
              ? `${opts.stationCount} stations in outline`
              : "No count stations inside this outline",
          honesty: adapter.honesty,
          contributed: opts.stationCount > 0,
        });
      }
      continue;
    }

    if (adapter.id === "txdot_projects") {
      const avail = opts.projectsAvailable !== false;
      const n = opts.projectCount ?? 0;
      uses.push({
        id: adapter.id,
        label: adapter.label,
        category: adapter.category,
        status: !avail ? "unavailable" : n > 0 ? "live" : "degraded",
        provider: adapter.provider,
        note: !avail
          ? "Projects temporarily unavailable"
          : n > 0
            ? `${n} project${n === 1 ? "" : "s"} in view`
            : "No projects returned in this view",
        honesty: adapter.honesty,
        contributed: avail && n > 0,
      });
      continue;
    }

    if (adapter.id === "cad_observation") {
      const avail = Boolean(opts.cadPulseAvailable);
      uses.push({
        id: adapter.id,
        label: adapter.label,
        category: adapter.category,
        status: avail ? "live" : "degraded",
        provider: adapter.provider,
        note: avail
          ? opts.cadPulseNote || "Observation pulse available"
          : "No recent observation pulse for this county",
        honesty: adapter.honesty,
        contributed: avail,
      });
    }
  }

  return uses;
}

export function liveSourceCount(sources: CorridorSourceUse[]): number {
  return sources.filter((s) => s.status === "live" && s.contributed).length;
}
