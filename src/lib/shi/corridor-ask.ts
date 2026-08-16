/**
 * Corridors 2.0-F + F2 — Ask Archie (canned intents → deterministic facts).
 * LLM never invents property/traffic statistics.
 * F2 deepens Ask using Site-panel desk facts already on context (no new GIS).
 *
 * Rule version: corridor-ask-v1.1
 */

import type { TrafficStation } from "@/lib/shi/corridors";
import {
  CORRIDOR_STATUS_LABEL,
  TRAFFIC_INTENSITY_LABEL,
  corridorStatusFromHistory,
  trafficIntensityClass,
  vehiclesPerDayCaption,
} from "@/lib/shi/corridor-language";
import {
  formatApproxFrontageFt,
  type ParcelLocationIntel,
} from "@/lib/shi/corridor-frontage";
import {
  associateParcelTraffic,
  formatAcres,
  type CorridorParcelPick,
} from "@/lib/shi/corridor-parcel-traffic";
import {
  exposureBandLabel,
  scoreCommercialExposure,
  type RankedSite,
} from "@/lib/shi/corridor-exposure";
import type { GrowthWatchArea } from "@/lib/shi/growth-watch";

export const CORRIDOR_ASK_RULE_VERSION = "corridor-ask-v1.1" as const;

export const CORRIDOR_ASK_HONESTY =
  "Archie answers from published TxDOT counts, mapped roads, and CAD parcels already on this desk — never invents statistics.";

export type CorridorAskIntentId =
  | "strongest_sites"
  | "parcel_traffic"
  | "corridor_growth"
  | "high_traffic_roads"
  | "growth_patterns"
  | "explain_exposure"
  | "compare_hint"
  | "parcel_frontage"
  | "parcel_intersection"
  | "parcel_confidence"
  | "parcel_exposure";

export type CorridorAskIntent = {
  id: CorridorAskIntentId;
  label: string;
  /** Short chip label */
  chip: string;
  match: RegExp;
};

/** Canned intents — keyword match only, no LLM. */
export const CORRIDOR_ASK_INTENTS: CorridorAskIntent[] = [
  {
    id: "strongest_sites",
    label: "Which sites have the strongest traffic exposure?",
    chip: "Strongest sites",
    match:
      /strongest|best\s+site|best\s+parcel|top\s+site|traffic\s+exposure\s+site|find\s+strong/i,
  },
  {
    id: "parcel_traffic",
    label: "What's the traffic near this parcel?",
    chip: "This parcel",
    match:
      /this\s+parcel|near\s+(this\s+)?(parcel|property|site)|traffic\s+(here|near)|parcel\s+traffic/i,
  },
  {
    id: "corridor_growth",
    label: "Is traffic growing on this corridor?",
    chip: "Growing?",
    match:
      /grow(ing|th)?|rising|declin|corridor\s+status|is\s+traffic\s+up/i,
  },
  {
    id: "high_traffic_roads",
    label: "Which roads have the highest traffic in this county?",
    chip: "Busiest roads",
    match:
      /highest\s+traffic|busiest|high\s+traffic\s+road|most\s+vehicles|top\s+road|aadt/i,
  },
  {
    id: "growth_patterns",
    label: "Any growth patterns nearby?",
    chip: "Growth patterns",
    match: /growth\s+pattern|watch\s+area|momentum|where.?s\s+growing/i,
  },
  {
    id: "explain_exposure",
    label: "What does commercial exposure mean?",
    chip: "Explain exposure",
    match:
      /what\s+does\s+(commercial\s+)?exposure|explain\s+(commercial\s+)?exposure|how\s+(is|does).*(score|exposure)/i,
  },
  {
    id: "compare_hint",
    label: "How do I compare these properties?",
    chip: "How to compare",
    match: /compare\s+(these\s+)?propert|compare\s+site|side\s+by\s+side/i,
  },
  {
    id: "parcel_frontage",
    label: "What's the approx frontage on this parcel?",
    chip: "Frontage",
    match:
      /frontage|how\s+much\s+front|road\s+front|feet\s+of\s+front|along\s+the\s+road/i,
  },
  {
    id: "parcel_intersection",
    label: "Is this a corner or dual-road parcel?",
    chip: "Corner / dual",
    match:
      /corner|dual[- ]?road|intersection|two\s+roads|crossroads|at\s+the\s+corner/i,
  },
  {
    id: "parcel_confidence",
    label: "How confident is the location data here?",
    chip: "Data confidence",
    match:
      /data\s+confidence|how\s+confident|confidence\s+(here|on)|reliable\s+(frontage|data)|limited\s+data/i,
  },
  {
    id: "parcel_exposure",
    label: "What's the commercial exposure on this parcel?",
    chip: "This exposure",
    match:
      /this\s+(parcel.?s?\s+)?exposure|exposure\s+(here|score|on\s+this)|commercial\s+exposure\s+(here|for\s+this|on\s+this)/i,
  },
];

export type CorridorAskFact = {
  label: string;
  value: string;
  detail?: string;
};

export type CorridorAskAnswer = {
  intentId: CorridorAskIntentId | "unknown";
  intentLabel: string;
  honesty: string;
  ruleVersion: typeof CORRIDOR_ASK_RULE_VERSION;
  summary: string;
  facts: CorridorAskFact[];
  missing: string[];
  /** Optional UI hint for the host view */
  hint?:
    | "draw_area"
    | "select_parcel"
    | "select_station"
    | "run_strongest"
    | "open_compare"
    | null;
};

export type CorridorAskContext = {
  countyName: string;
  stations: TrafficStation[];
  watchAreas: GrowthWatchArea[];
  selectedParcel: CorridorParcelPick | null;
  selectedStation: TrafficStation | null;
  parcelIntel: ParcelLocationIntel | null;
  rankedSites: RankedSite[];
  hasAnalysisBoundary: boolean;
  compareCount: number;
};

/** Same labels as property compare — mapped-road heuristic, not survey. */
export function askIntersectionLabel(
  intel: ParcelLocationIntel | null | undefined,
): string {
  if (!intel) return "—";
  if (intel.cornerLikely) return "Corner likely";
  if (intel.dualRoad) return "Dual-road";
  if (intel.roads.length === 1) return "Single frontage";
  return "—";
}

export function matchCorridorAskIntent(
  text: string,
): CorridorAskIntent | null {
  const q = text.trim();
  if (!q) return null;
  for (const intent of CORRIDOR_ASK_INTENTS) {
    if (intent.match.test(q)) return intent;
  }
  return null;
}

function topStations(stations: TrafficStation[], n = 5): TrafficStation[] {
  return [...stations]
    .filter((s) => s.latestAadt != null && Number.isFinite(s.latestAadt))
    .sort((a, b) => (b.latestAadt ?? 0) - (a.latestAadt ?? 0))
    .slice(0, n);
}

function needParcel(
  intentId: CorridorAskIntentId,
  intentLabel: string,
  ctx: CorridorAskContext,
): CorridorAskAnswer | null {
  if (ctx.selectedParcel) return null;
  return {
    intentId,
    intentLabel,
    honesty: CORRIDOR_ASK_HONESTY,
    ruleVersion: CORRIDOR_ASK_RULE_VERSION,
    summary:
      "Select a parcel on the map (zoom in until outlines appear) to answer from desk facts.",
    facts: [],
    missing: ["No parcel selected."],
    hint: "select_parcel",
  };
}

function answerStrongest(ctx: CorridorAskContext): CorridorAskAnswer {
  if (ctx.rankedSites.length > 0) {
    const top = ctx.rankedSites.slice(0, 5);
    return {
      intentId: "strongest_sites",
      intentLabel: CORRIDOR_ASK_INTENTS[0]!.label,
      honesty: CORRIDOR_ASK_HONESTY,
      ruleVersion: CORRIDOR_ASK_RULE_VERSION,
      summary: `Top ${top.length} ranked sites in your outline by commercial-exposure-v1 (traffic factors + land size) — not an AI score.`,
      facts: top.map((s) => ({
        label: `#${s.rank} ${s.situsAddress?.trim() || `CAD #${s.propId}`}`,
        value: `${s.commercial.score}/${s.commercial.maxScore}`,
        detail: exposureBandLabel(s.commercial.band),
      })),
      missing: [],
      hint: null,
    };
  }
  if (!ctx.hasAnalysisBoundary) {
    return {
      intentId: "strongest_sites",
      intentLabel: CORRIDOR_ASK_INTENTS[0]!.label,
      honesty: CORRIDOR_ASK_HONESTY,
      ruleVersion: CORRIDOR_ASK_RULE_VERSION,
      summary:
        "Draw an area on the map, then tap Find Strongest Sites — Archie ranks land from published traffic + acreage.",
      facts: [],
      missing: ["No drawn area yet.", "No ranked sites yet."],
      hint: "draw_area",
    };
  }
  return {
    intentId: "strongest_sites",
    intentLabel: CORRIDOR_ASK_INTENTS[0]!.label,
    honesty: CORRIDOR_ASK_HONESTY,
    ruleVersion: CORRIDOR_ASK_RULE_VERSION,
    summary:
      "You have an outline — tap Find Strongest Sites to rank parcels. Archie will not invent a ranking without that run.",
    facts: [],
    missing: ["Strongest Sites not run for this outline yet."],
    hint: "run_strongest",
  };
}

function answerParcel(ctx: CorridorAskContext): CorridorAskAnswer {
  if (!ctx.selectedParcel) {
    return {
      intentId: "parcel_traffic",
      intentLabel: CORRIDOR_ASK_INTENTS[1]!.label,
      honesty: CORRIDOR_ASK_HONESTY,
      ruleVersion: CORRIDOR_ASK_RULE_VERSION,
      summary:
        "Select a parcel on the map (zoom in until outlines appear) to read nearby published traffic.",
      facts: [],
      missing: ["No parcel selected."],
      hint: "select_parcel",
    };
  }
  const pick = ctx.selectedParcel;
  const assoc = associateParcelTraffic(pick, ctx.stations);
  const facts: CorridorAskFact[] = [
    {
      label: "Parcel",
      value: pick.situsAddress?.trim() || `CAD #${pick.propId}`,
      detail: formatAcres(pick.legalAcreage),
    },
  ];
  const missing: string[] = [];
  if (assoc.kind === "estimated") {
    const s = assoc.station;
    facts.push({
      label: "Vehicles / day",
      value:
        s.latestAadt != null
          ? Math.round(s.latestAadt).toLocaleString("en-US")
          : "—",
      detail: `${vehiclesPerDayCaption(s.latestYear)} · ${assoc.label}`,
    });
    facts.push({
      label: "Nearest count",
      value: `${assoc.distanceMiles.toFixed(2)} mi`,
      detail: s.onRoad || s.stationId,
    });
  } else {
    missing.push(assoc.detail);
  }
  if (ctx.parcelIntel && ctx.parcelIntel.totalApproxFrontageFt > 0) {
    facts.push({
      label: "Approx. frontage",
      value: formatApproxFrontageFt(ctx.parcelIntel.totalApproxFrontageFt),
      detail: ctx.parcelIntel.cornerLikely
        ? "Corner likely"
        : ctx.parcelIntel.dualRoad
          ? "Dual-road"
          : ctx.parcelIntel.confidenceWhy,
    });
  } else {
    missing.push("Approx frontage not available yet for this parcel.");
  }
  return {
    intentId: "parcel_traffic",
    intentLabel: CORRIDOR_ASK_INTENTS[1]!.label,
    honesty: CORRIDOR_ASK_HONESTY,
    ruleVersion: CORRIDOR_ASK_RULE_VERSION,
    summary:
      assoc.kind === "estimated"
        ? assoc.detail
        : "Published traffic near this parcel is limited.",
    facts,
    missing,
    hint: null,
  };
}

function answerGrowth(ctx: CorridorAskContext): CorridorAskAnswer {
  const station =
    ctx.selectedStation ??
    (ctx.selectedParcel
      ? (() => {
          const a = associateParcelTraffic(ctx.selectedParcel!, ctx.stations);
          return a.kind === "estimated" ? a.station : null;
        })()
      : null);
  if (!station) {
    return {
      intentId: "corridor_growth",
      intentLabel: CORRIDOR_ASK_INTENTS[2]!.label,
      honesty: CORRIDOR_ASK_HONESTY,
      ruleVersion: CORRIDOR_ASK_RULE_VERSION,
      summary:
        "Select a traffic station (Traffic tool) or a parcel to read corridor status from published history.",
      facts: [],
      missing: ["No station or parcel context selected."],
      hint: "select_station",
    };
  }
  const status = corridorStatusFromHistory(station.history);
  return {
    intentId: "corridor_growth",
    intentLabel: CORRIDOR_ASK_INTENTS[2]!.label,
    honesty: CORRIDOR_ASK_HONESTY,
    ruleVersion: CORRIDOR_ASK_RULE_VERSION,
    summary: `${station.onRoad || station.stationId}: ${CORRIDOR_STATUS_LABEL[status.status]}.`,
    facts: [
      {
        label: "Corridor status",
        value: CORRIDOR_STATUS_LABEL[status.status],
        detail: status.why,
      },
      {
        label: "Vehicles / day",
        value:
          station.latestAadt != null
            ? Math.round(station.latestAadt).toLocaleString("en-US")
            : "—",
        detail: vehiclesPerDayCaption(station.latestYear),
      },
      {
        label: "Change",
        value:
          status.changePct != null
            ? `${status.changePct >= 0 ? "+" : ""}${status.changePct.toFixed(1)}%`
            : "—",
        detail: "Across published TxDOT years (corridor-status-v1).",
      },
    ],
    missing: [],
    hint: null,
  };
}

function answerHighRoads(ctx: CorridorAskContext): CorridorAskAnswer {
  const top = topStations(ctx.stations, 5);
  if (!top.length) {
    return {
      intentId: "high_traffic_roads",
      intentLabel: CORRIDOR_ASK_INTENTS[3]!.label,
      honesty: CORRIDOR_ASK_HONESTY,
      ruleVersion: CORRIDOR_ASK_RULE_VERSION,
      summary: `No published station counts loaded for ${ctx.countyName}.`,
      facts: [],
      missing: ["Traffic payload empty or failed to load."],
      hint: null,
    };
  }
  return {
    intentId: "high_traffic_roads",
    intentLabel: CORRIDOR_ASK_INTENTS[3]!.label,
    honesty: CORRIDOR_ASK_HONESTY,
    ruleVersion: CORRIDOR_ASK_RULE_VERSION,
    summary: `Highest published vehicles/day among loaded TxDOT stations in ${ctx.countyName}.`,
    facts: top.map((s) => ({
      label: s.onRoad || s.stationId,
      value:
        s.latestAadt != null
          ? `${Math.round(s.latestAadt).toLocaleString("en-US")}/day`
          : "—",
      detail: `${TRAFFIC_INTENSITY_LABEL[trafficIntensityClass(s.latestAadt)]} · ${vehiclesPerDayCaption(s.latestYear)}`,
    })),
    missing: [],
    hint: null,
  };
}

function answerPatterns(ctx: CorridorAskContext): CorridorAskAnswer {
  const areas = ctx.watchAreas.slice(0, 5);
  if (!areas.length) {
    return {
      intentId: "growth_patterns",
      intentLabel: CORRIDOR_ASK_INTENTS[4]!.label,
      honesty: CORRIDOR_ASK_HONESTY,
      ruleVersion: CORRIDOR_ASK_RULE_VERSION,
      summary: `No growth-watch patterns for ${ctx.countyName} right now.`,
      facts: [],
      missing: ["Growth Watch returned no areas."],
      hint: null,
    };
  }
  return {
    intentId: "growth_patterns",
    intentLabel: CORRIDOR_ASK_INTENTS[4]!.label,
    honesty: CORRIDOR_ASK_HONESTY,
    ruleVersion: CORRIDOR_ASK_RULE_VERSION,
    summary:
      "Growth patterns are evidence clusters — not a hot score or sale prediction.",
    facts: areas.map((a) => ({
      label: a.title,
      value: a.strength,
      detail: a.reasons[0]?.detail ?? a.reasons[0]?.label,
    })),
    missing: [],
    hint: null,
  };
}

function answerExplainExposure(): CorridorAskAnswer {
  return {
    intentId: "explain_exposure",
    intentLabel: CORRIDOR_ASK_INTENTS[5]!.label,
    honesty: CORRIDOR_ASK_HONESTY,
    ruleVersion: CORRIDOR_ASK_RULE_VERSION,
    summary:
      "Commercial exposure is a transparent sum (commercial-exposure-v1): vehicles/day, corridor status, approx frontage, data confidence, plus land size. Open WHY? on any site for the factor breakdown.",
    facts: [
      {
        label: "Vehicles / day",
        value: "up to 35 pts",
        detail: "From traffic-intensity-v1 classes.",
      },
      {
        label: "Corridor status",
        value: "up to 20 pts",
        detail: "From corridor-status-v1 history.",
      },
      {
        label: "Approx. frontage",
        value: "up to 20 pts",
        detail: "Mapped roads — never surveyed.",
      },
      {
        label: "Data confidence",
        value: "up to 10 pts",
        detail: "HIGH / MODERATE / LIMITED.",
      },
      {
        label: "Land size",
        value: "up to 15 pts",
        detail: "Keeps the score land-first.",
      },
    ],
    missing: [],
    hint: null,
  };
}

function answerCompare(ctx: CorridorAskContext): CorridorAskAnswer {
  if (ctx.compareCount >= 2) {
    return {
      intentId: "compare_hint",
      intentLabel: CORRIDOR_ASK_INTENTS[6]!.label,
      honesty: CORRIDOR_ASK_HONESTY,
      ruleVersion: CORRIDOR_ASK_RULE_VERSION,
      summary: `You have ${ctx.compareCount} properties in compare — scroll to Compare properties for traffic, growth, frontage, intersection, acreage, and data year. No automatic winner.`,
      facts: [
        {
          label: "In compare",
          value: String(ctx.compareCount),
          detail: "Max 4 sites.",
        },
      ],
      missing: [],
      hint: "open_compare",
    };
  }
  return {
    intentId: "compare_hint",
    intentLabel: CORRIDOR_ASK_INTENTS[6]!.label,
    honesty: CORRIDOR_ASK_HONESTY,
    ruleVersion: CORRIDOR_ASK_RULE_VERSION,
    summary:
      "Tap Compare on 2–4 parcels (Site panel or Strongest Sites list). Archie shows tradeoffs — never a forced winner.",
    facts: [],
    missing:
      ctx.compareCount === 1
        ? ["Only one property in compare — add another."]
        : ["No properties in compare yet."],
    hint: "select_parcel",
  };
}

/** F2 — approx frontage from mapped roads already on the desk. */
function answerFrontage(ctx: CorridorAskContext): CorridorAskAnswer {
  const intent = CORRIDOR_ASK_INTENTS.find((i) => i.id === "parcel_frontage")!;
  const gate = needParcel("parcel_frontage", intent.label, ctx);
  if (gate) return gate;
  const intel = ctx.parcelIntel;
  if (!intel || intel.totalApproxFrontageFt <= 0) {
    return {
      intentId: "parcel_frontage",
      intentLabel: intent.label,
      honesty: CORRIDOR_ASK_HONESTY,
      ruleVersion: CORRIDOR_ASK_RULE_VERSION,
      summary:
        "Approx frontage is not on the desk yet for this parcel (waiting on mapped roads / polygon).",
      facts: [],
      missing: ["Parcel location intel empty or zero frontage."],
      hint: "select_parcel",
    };
  }
  const facts: CorridorAskFact[] = [
    {
      label: "Approx. frontage",
      value: formatApproxFrontageFt(intel.totalApproxFrontageFt),
      detail: `${intel.source} · never a survey`,
    },
  ];
  for (const road of intel.roads.slice(0, 4)) {
    facts.push({
      label: road.routeId || "Mapped road",
      value: formatApproxFrontageFt(road.approxFrontageFt),
      detail:
        road.aadt != null
          ? `Nearby AADT ~${Math.round(road.aadt).toLocaleString("en-US")}`
          : "No AADT on this segment",
    });
  }
  return {
    intentId: "parcel_frontage",
    intentLabel: intent.label,
    honesty: CORRIDOR_ASK_HONESTY,
    ruleVersion: CORRIDOR_ASK_RULE_VERSION,
    summary:
      "Approx frontage from mapped roads touching this parcel — directional only, not surveyed.",
    facts,
    missing: [],
    hint: null,
  };
}

/**
 * F2 — corner / dual from mapped-road heuristic.
 * Honest: no meter distance-to-intersection until a versioned field ships.
 */
function answerIntersection(ctx: CorridorAskContext): CorridorAskAnswer {
  const intent = CORRIDOR_ASK_INTENTS.find(
    (i) => i.id === "parcel_intersection",
  )!;
  const gate = needParcel("parcel_intersection", intent.label, ctx);
  if (gate) return gate;
  const intel = ctx.parcelIntel;
  if (!intel) {
    return {
      intentId: "parcel_intersection",
      intentLabel: intent.label,
      honesty: CORRIDOR_ASK_HONESTY,
      ruleVersion: CORRIDOR_ASK_RULE_VERSION,
      summary:
        "Intersection reading needs parcel location intel (mapped roads). Select a parcel and wait for the Site panel to load.",
      facts: [],
      missing: ["No parcel location intel yet."],
      hint: "select_parcel",
    };
  }
  const label = askIntersectionLabel(intel);
  return {
    intentId: "parcel_intersection",
    intentLabel: intent.label,
    honesty: CORRIDOR_ASK_HONESTY,
    ruleVersion: CORRIDOR_ASK_RULE_VERSION,
    summary:
      "Corner / dual is a mapped-road heuristic — not surveyed intersection distance (distance TBD until we own a versioned field).",
    facts: [
      {
        label: "Intersection",
        value: label,
        detail:
          intel.roads.length === 0
            ? "No mapped roads touching this parcel yet."
            : `${intel.roads.length} mapped road${intel.roads.length === 1 ? "" : "s"} on desk`,
      },
      {
        label: "Dual-road",
        value: intel.dualRoad ? "Yes" : "No",
      },
      {
        label: "Corner likely",
        value: intel.cornerLikely ? "Yes" : "No",
        detail: intel.confidenceWhy,
      },
    ],
    missing: [],
    hint: null,
  };
}

function answerConfidence(ctx: CorridorAskContext): CorridorAskAnswer {
  const intent = CORRIDOR_ASK_INTENTS.find((i) => i.id === "parcel_confidence")!;
  const gate = needParcel("parcel_confidence", intent.label, ctx);
  if (gate) return gate;
  const intel = ctx.parcelIntel;
  if (!intel) {
    return {
      intentId: "parcel_confidence",
      intentLabel: intent.label,
      honesty: CORRIDOR_ASK_HONESTY,
      ruleVersion: CORRIDOR_ASK_RULE_VERSION,
      summary: "Data confidence appears after parcel location intel loads.",
      facts: [],
      missing: ["No parcel location intel yet."],
      hint: "select_parcel",
    };
  }
  const assoc = associateParcelTraffic(ctx.selectedParcel!, ctx.stations);
  return {
    intentId: "parcel_confidence",
    intentLabel: intent.label,
    honesty: CORRIDOR_ASK_HONESTY,
    ruleVersion: CORRIDOR_ASK_RULE_VERSION,
    summary: `Location data confidence is ${intel.confidence.toUpperCase()} for this parcel.`,
    facts: [
      {
        label: "Confidence",
        value: intel.confidence.toUpperCase(),
        detail: intel.confidenceWhy,
      },
      {
        label: "Frontage source",
        value: intel.source,
        detail: intel.ruleVersion,
      },
      {
        label: "Traffic association",
        value: assoc.confidence.toUpperCase(),
        detail: assoc.detail,
      },
    ],
    missing: [],
    hint: null,
  };
}

function answerParcelExposure(ctx: CorridorAskContext): CorridorAskAnswer {
  const intent = CORRIDOR_ASK_INTENTS.find((i) => i.id === "parcel_exposure")!;
  const gate = needParcel("parcel_exposure", intent.label, ctx);
  if (gate) return gate;
  const pick = ctx.selectedParcel!;
  const commercial = scoreCommercialExposure({
    pick,
    stations: ctx.stations,
    intel: ctx.parcelIntel,
    legalAcreage: pick.legalAcreage,
  });
  const topFactors = [...commercial.factors]
    .sort((a, b) => b.points - a.points)
    .slice(0, 3);
  return {
    intentId: "parcel_exposure",
    intentLabel: intent.label,
    honesty: CORRIDOR_ASK_HONESTY,
    ruleVersion: CORRIDOR_ASK_RULE_VERSION,
    summary: `Commercial exposure for this parcel is ${commercial.score}/${commercial.maxScore} · ${exposureBandLabel(commercial.band)} (commercial-exposure-v1) — open WHY? on the Site panel for the full breakdown.`,
    facts: [
      {
        label: "Commercial exposure",
        value: `${commercial.score}/${commercial.maxScore}`,
        detail: exposureBandLabel(commercial.band),
      },
      ...topFactors.map((f) => ({
        label: f.label,
        value: `${f.points}/${f.maxPoints}`,
        detail: f.detail,
      })),
    ],
    missing: [],
    hint: null,
  };
}

/**
 * Resolve a canned intent (or free-text match) into facts from desk context.
 */
export function answerCorridorAsk(
  queryOrIntentId: string,
  ctx: CorridorAskContext,
): CorridorAskAnswer {
  const asId = CORRIDOR_ASK_INTENTS.find((i) => i.id === queryOrIntentId);
  const intent = asId ?? matchCorridorAskIntent(queryOrIntentId);

  if (!intent) {
    return {
      intentId: "unknown",
      intentLabel: "Ask Archie",
      honesty: CORRIDOR_ASK_HONESTY,
      ruleVersion: CORRIDOR_ASK_RULE_VERSION,
      summary:
        "Try a canned question below. Archie only answers from data already on this Corridors desk — no invented counts.",
      facts: CORRIDOR_ASK_INTENTS.map((i) => ({
        label: i.chip,
        value: i.label,
      })),
      missing: ["No matching canned intent."],
      hint: null,
    };
  }

  switch (intent.id) {
    case "strongest_sites":
      return answerStrongest(ctx);
    case "parcel_traffic":
      return answerParcel(ctx);
    case "corridor_growth":
      return answerGrowth(ctx);
    case "high_traffic_roads":
      return answerHighRoads(ctx);
    case "growth_patterns":
      return answerPatterns(ctx);
    case "explain_exposure":
      return answerExplainExposure();
    case "compare_hint":
      return answerCompare(ctx);
    case "parcel_frontage":
      return answerFrontage(ctx);
    case "parcel_intersection":
      return answerIntersection(ctx);
    case "parcel_confidence":
      return answerConfidence(ctx);
    case "parcel_exposure":
      return answerParcelExposure(ctx);
    default:
      return {
        intentId: "unknown",
        intentLabel: intent.label,
        honesty: CORRIDOR_ASK_HONESTY,
        ruleVersion: CORRIDOR_ASK_RULE_VERSION,
        summary: "Intent not wired.",
        facts: [],
        missing: ["Unhandled intent."],
        hint: null,
      };
  }
}
