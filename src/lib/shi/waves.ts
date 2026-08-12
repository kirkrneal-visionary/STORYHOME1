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
    status: "current",
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
    id: "ARCHIE-TRUTH-MARKET",
    name: "Truth lane · market projection (future)",
    goal: "Broader evidence vs weak claims, plus market scenarios (RE, financial, risk, odds) with honest confidence.",
    status: "planned",
    frontend: [
      "Evidence strength labels",
      "Scenario views with assumptions + ranges",
    ],
    backend: [
      "Server-side evidence engines",
      "Never ship proprietary weights to the browser",
    ],
    outOfScope: [
      "Guaranteed predictions",
      "Seller-probability theater",
    ],
  },
];

/** Active wave — CAD ownership observation + Stability Index. */
export const ARCHIE_CURRENT_WAVE = "ARCHIE-OWNER-CHURN" as const;

/** @deprecated Use ARCHIE_CURRENT_WAVE */
export const SHI_CURRENT_LINE = ARCHIE_CURRENT_WAVE;
