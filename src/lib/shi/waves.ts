/**
 * Archie's Intelligence — product waves.
 *
 * User-facing name is always Archie's Intelligence (never "SHI").
 * Internal API/table prefixes may still use `shi` for stability until a
 * dedicated rename wave — that is plumbing, not product brand.
 *
 * Listing-form CAD stays MLS-limited (pin/search for listing tracts only).
 * Archie's Intelligence is the full professional Property Intelligence product.
 */

export const ARCHIE_PRODUCT = {
  shortName: "Archie",
  menuLabel: "INTELLIGENCE",
  fullName: "Archie's Intelligence",
  subtitle: "Property Intelligence for Story Pro",
  positioning: "Research your market. Public records. Professional workflow.",
  /** Menu mark — cleaned bloodhound asset (no frame). */
  markSrc: "/brand/archie-intelligence.png",
} as const;

/** @deprecated Use ARCHIE_PRODUCT — kept so older imports keep working. */
export const SHI_PRODUCT = ARCHIE_PRODUCT;

export type ShiWaveStatus = "done" | "current" | "planned";

export type ShiWave = {
  id: string;
  name: string;
  goal: string;
  status: ShiWaveStatus;
  frontend: string[];
  backend: string[];
  outOfScope: string[];
};

export const SHI_WAVES: ShiWave[] = [
  {
    id: "SHI-0",
    name: "Shell & brand entry",
    goal: "Put Archie's Intelligence on the Story Pro menu with a brandable mark and its own page.",
    status: "done",
    frontend: [
      "Story Pro tab: Intelligence + Archie mark",
      "Dedicated Property Intelligence page shell",
      "Deep link /portal/intelligence",
      "Copy: Archie's Intelligence (not CAD filenames)",
    ],
    backend: [
      "No ingest changes",
      "Reuse existing authenticated pro gate on /portal",
    ],
    outOfScope: [
      "Listing-form CAD redesign (stays MLS-limited)",
      "Marketplace / My Home redesign",
    ],
  },
  {
    id: "SHI-1",
    name: "Search · Map · Property record",
    goal: "County-first search and map with a real property record.",
    status: "done",
    frontend: [
      "Search + filters (county-first, real fields)",
      "MapLibre parcel map (MVT viewport tiles)",
      "Property Intelligence panel + results",
      "County labels + freshness chips",
    ],
    backend: [
      "GET /api/shi/search + searchProperties",
      "GET /api/shi/property + getProperty",
      "Reuse /api/parcels/{z}/{x}/{y}",
      "GET /api/shi/freshness (pro-safe DTO)",
    ],
    outOfScope: ["Bulk county download", "Plugins"],
  },
  {
    id: "SHI-2",
    name: "Relationships · Area · History · Frames",
    goal: "Owner matches, area analyze, Market Frames, Study Vault.",
    status: "done",
    frontend: [
      "Owner relationships EXACT / POSSIBLE",
      "Market Frames · Analyzer · Study Vault",
      "Observed CAD history (values/ingest only)",
    ],
    backend: [
      "owner-matches · area · studies APIs",
      "shi_study_* + RLS · hard caps",
    ],
    outOfScope: ["Deed / ownership-transfer history"],
  },
  {
    id: "SHI-3",
    name: "Prospects · Notes · CRM convert",
    goal: "Property-native opportunity pipeline on top of public records without mutating CAD.",
    status: "done",
    frontend: [
      "Save Prospect from Research property record",
      "Prospects module — pipeline + dossier",
      "Statuses + private notes + tags + Activity",
      "Create Seller Lead (prefill; no invented contact)",
      "Mobile dossier sheet · metric chips · related intelligence (3.3)",
    ],
    backend: [
      "shi_prospects / shi_prospect_notes + RLS (migration 0025)",
      "GET/POST /api/shi/prospects · PATCH status/tags · notes",
      "convertProspectToSellerLead → seller_clients",
    ],
    outOfScope: [
      "Phone/email scraping",
      "Writing into county_parcels from prospects",
      "Custom statuses / Salesforce clone",
    ],
  },
  {
    id: "SHI-4",
    name: "Farms · Change intelligence",
    goal: "Saved territories with honest since-last-review change feed.",
    status: "done",
    frontend: [
      "Save as Farm from analyzed Market Frame",
      "Farms ribbon module — list + territory dossier",
      "Since your last review summary + change feed",
      "Mark reviewed · research property hand-off",
    ],
    backend: [
      "shi_farms / shi_farm_baselines + RLS (migration 0026)",
      "Live membership via analyzeArea (county-locked, capped)",
      "Baseline diff (appeared / disappeared / owner / situs / value / acreage)",
    ],
    outOfScope: [
      "Destructive CAD replace logic (separate reliability wave)",
    ],
  },
  {
    id: "SHI-5",
    name: "Find Similar · Portfolio · act-loop",
    goal: "Deterministic similarity + confident owner portfolios + act on results.",
    status: "done",
    frontend: [
      "Find Similar with explainable reasons (no fake %)",
      "Owner portfolio: exact vs possible kept separate",
      "Discover map pins · bulk Prospects · Farm from selection",
    ],
    backend: [
      "POST /api/shi/similar · GET /api/shi/portfolio",
      "Reuse prospects + farms create — no new migration",
    ],
    outOfScope: [
      "Generative AI similarity",
      "AVM / seller probability scores",
      "Silent merge of uncertain owner matches",
    ],
  },
  {
    id: "ARCHIE-FOUNDATION",
    name: "Federated shell · Prospects hub",
    goal: "Mobile federated Network menu + Prospects decision hub.",
    status: "done",
    frontend: [
      "N3 mobile Network menu drawer + Archie node",
      "Prospects clickable pipeline metrics",
      "Related intelligence: Research · Discover · Farms",
    ],
    backend: ["No new migration", "Internal /api/shi/* prefixes for stability"],
    outOfScope: ["Market projection models"],
  },
  {
    id: "ARCHIE-OWNER-CHURN",
    name: "Ownership Stability Index · CAD observation",
    goal: "Watch CAD owner fields across pulls and show an explainable 300–850 stability index — evidence of observed churn, not a sale prediction.",
    status: "done",
    frontend: [
      "Ownership Stability Index on property record",
      "Observed history includes owner-field changes",
      "Honest copy: not credit score / not will-sell / not deed dates",
    ],
    backend: [
      "Migration 0027: first_seen_at / last_seen_at + county_parcel_change_events",
      "Ingest compare owner id/name before upsert",
      "getProperty loads events + computeOwnershipChurnSignal",
    ],
    outOfScope: [
      "Predicting that an owner will sell",
      "Deed / MLS sale timeline claims",
      "Full county change feed UI (4.3 full)",
      "Absence marking on full pulls (follow-up)",
    ],
  },
  {
    id: "ARCHIE-CHANGE-FEED",
    name: "County observation change feed",
    goal: "Show what Archie saw change between CAD pulls across a county — owner, address, value, acreage, and presence — without claiming deed or sale dates.",
    status: "done",
    frontend: [
      "County observation feed on Research + Farms",
      "Field filter (owner, address, value, acreage, presence)",
      "Open property from a feed row into Research",
      "Property history includes presence + expanded fields",
    ],
    backend: [
      "Migration 0028: county_parcels.absent_at (lightweight, no backfill)",
      "Ingest diffs situs / market_value / legal_acreage + owner fields",
      "Full-pull (--all) absence marking with cap + reappearance events",
      "GET /api/shi/changes county feed",
    ],
    outOfScope: [
      "Predicting that an owner will sell",
      "Deed / MLS sale timeline claims",
      "Market projection scenarios (ARCHIE-TRUTH-MARKET)",
    ],
  },
  {
    id: "ARCHIE-TRUTH-MARKET",
    name: "Truth lane · CAD evidence · thin market context",
    goal: "Label evidence strength from county files, surface CAD value trajectory and frame band, plus illustrative carry under explicit user assumptions — never seller probability.",
    status: "done",
    frontend: [
      "CAD evidence · market context on property record",
      "Evidence strength chips (strong / observed / present / weak / absent)",
      "Vs active Market Frame CAD median when analyzed",
      "Illustrative carry (rate / down / term) on CAD market value",
    ],
    backend: [
      "buildCadEvidenceLane + value trajectory (no new migration)",
      "compareSubjectToFrame from existing area analysis",
      "Reuse finance monthlyMortgagePayment — assumptions stay client-side",
    ],
    outOfScope: [
      "Guaranteed predictions / AVM true-value claims",
      "Seller-probability theater",
      "MLS sale comps as if they were CAD truth",
    ],
  },
  {
    id: "ARCHIE-LOOKALIKE-CONTEXT",
    name: "Lookalike CAD band · assumption ranges",
    goal: "Compose Find Similar into an honest lookalike CAD appraisal band and show illustrative carry ranges under explicit rate/down assumptions.",
    status: "done",
    frontend: [
      "Lookalike CAD band on evidence panel",
      "Vs lookalike median / min–max range",
      "Assumption ranges (rate ±1% and common down payments)",
    ],
    backend: [
      "compareSubjectToLookalikes + buildAssumptionCarryCases (no migration)",
      "Reuse POST /api/shi/similar from evidence panel",
    ],
    outOfScope: [
      "Seller-probability theater",
      "Treating lookalikes as MLS sale comps",
      "Fake similarity percent scores",
    ],
  },
  {
    id: "ARCHIE-CORRIDORS-TRAFFIC",
    name: "Corridors · custom Traffic tool · TxDOT AADT",
    goal: "Give Story Pro a dedicated Corridors room with a custom Traffic tool and ≥5 years of TxDOT AADT for the launch 7 counties — planning counts, not live congestion.",
    status: "done",
    frontend: [
      "Archie module Corridors (after Research)",
      "Custom Traffic tool (tap stations)",
      "Station dossier with year chips + trend label",
      "Corridor linework colored by current AADT",
    ],
    backend: [
      "GET /api/shi/corridors/traffic (Pro gate)",
      "TxDOT Open Data proxy — AADT Annuals + 2024 corridor lines",
      "Launch-county FIPS lock — no paid traffic plugin",
    ],
    outOfScope: [
      "Growth watch heatmaps (Wave 2)",
      "Investor scenario board (Wave 3)",
      "Live congestion feeds",
      "Seller-probability theater",
    ],
  },
  {
    id: "ARCHIE-GROWTH-WATCH",
    name: "Corridors · growth watch areas",
    goal: "Evidence-backed developmental watch zones from traffic trends + CAD observation pulse — explainable reasons, no fake heat scores.",
    status: "done",
    frontend: [
      "Growth watch toggle + map polygons",
      "Watch area list with reason chips",
      "Handoff into Research",
    ],
    backend: [
      "buildGrowthWatchAreas from TxDOT stations",
      "Optional CAD change pulse via county_parcel_change_events",
    ],
    outOfScope: ["Unnamed heat scores", "Deed/sale oracles", "Scenario board"],
  },
  {
    id: "ARCHIE-GROWTH-SCENARIOS",
    name: "Corridors · growth scenarios",
    goal: "Assumption-first projection board for land developers / investor sit-downs with coverage confidence and meeting pack.",
    status: "done",
    frontend: [
      "Scenario knobs (horizon + low/base/high annual growth %)",
      "Optional illustrative absorption",
      "Conservative / base / upside AADT ranges",
      "Coverage confidence + Meeting pack print",
    ],
    backend: [
      "Client compose runGrowthScenario — assumptions stay explicit",
      "No secret weights; no guaranteed returns",
    ],
    outOfScope: [
      "Guaranteed returns",
      "Live congestion cosplay",
      "Seller-probability theater",
    ],
  },
  {
    id: "ARCHIE-CORRIDORS-LAND-LOOP",
    name: "Corridors · land loop · TxDOT projects",
    goal: "Open a Growth Watch box as a Research map frame and show nearby TxDOT Project Tracker lines — so traffic thesis meets parcels.",
    status: "done",
    frontend: [
      "Study land in Research queues watch bbox frame",
      "TxDOT projects toggle + cyan linework on Corridors map",
      "Project list on selected watch dossier",
    ],
    backend: [
      "GET /api/shi/corridors/projects (Pro gate)",
      "TxDOT_Projects public FeatureServer by county + bbox",
    ],
    outOfScope: [
      "Auto Prospect/Farm create without user confirm",
      "Paid live congestion",
    ],
  },
  {
    id: "ARCHIE-CORRIDORS-PRESENTATION",
    name: "Corridors · presentation · traffic memory",
    goal: "Investor-room presentation mode, printable map pack, and browser-stored traffic looks so Archie can show what changed since last time.",
    status: "done",
    frontend: [
      "Presentation mode — big road labels, clean map chrome",
      "Print map pack (county · watch · top stations · memory)",
      "Memory tab — since we last looked + Remember this look",
    ],
    backend: [
      "Client localStorage traffic snapshots (no new migration)",
      "Map glyphs for symbol labels",
    ],
    outOfScope: [
      "Paid live congestion feeds",
      "Server-synced multi-device memory (later)",
      "Seller-probability theater",
    ],
  },
  {
    id: "ARCHIE-CORRIDORS-V1",
    name: "Corridors V.1 · geographic development intelligence",
    goal: "Draw an area → analyze → explain. Stations become evidence; patterns and interpretation lead. Complexity behind the glass.",
    status: "current",
    frontend: [
      "Corridor Intelligence hero + Draw an Area primary CTA",
      "Calm map — progressive station disclosure",
      "Observed facts · derived signals · Archie interpretation",
      "Gold selection contrast · evidence drawer",
    ],
    backend: [
      "composeCorridorAnalysis + POST /api/shi/corridors/analyze",
      "Reuse analyzeArea + TxDOT (no CAD writes)",
      "Model version corridors-v1.0.0",
    ],
    outOfScope: [
      "Fake accuracy percentages",
      "Development Intelligence Report (next ship)",
      "Server-synced study baselines (next ship)",
      "New data licenses pretended as live",
    ],
  },
  {
    id: "ARCHIE-OBS-OPS",
    name: "Observation health · empty-state honesty",
    goal: "Make Ownership Stability and County observation feed trustworthy — distinguish migrations pending vs awaiting next pull vs truly quiet.",
    status: "planned",
    frontend: [
      "Observation setup / readiness copy on feed + stability",
      "County pull status tied to freshness",
      "Clear Building history vs quiet tracking",
    ],
    backend: [
      "Observation readiness DTO (events table / absent_at / tracking)",
      "Apply existing 0027/0028 — prefer no new migration",
    ],
    outOfScope: [
      "Inventing backfilled change events",
      "Deed / MLS sale timeline claims",
    ],
  },
];

/** Active wave — Corridors V.1 geographic development intelligence. */
export const ARCHIE_CURRENT_WAVE = "ARCHIE-CORRIDORS-V1" as const;

/** @deprecated Use ARCHIE_CURRENT_WAVE */
export const SHI_CURRENT_LINE = ARCHIE_CURRENT_WAVE;
