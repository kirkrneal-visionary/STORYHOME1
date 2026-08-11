/**
 * Archie's Intelligence (product waves; code paths still use `shi` for APIs).
 * Listing-form CAD stays MLS-limited (pin/search for listing tracts only).
 * Archie's Intelligence is the full professional Property Intelligence product.
 */

export const SHI_PRODUCT = {
  shortName: "Archie",
  menuLabel: "INTELLIGENCE",
  fullName: "Archie's Intelligence",
  subtitle: "Property Intelligence for Story Pro",
  positioning: "Research your market. Public records. Professional workflow.",
  /** Menu mark — cleaned bloodhound asset (no frame). */
  markSrc: "/brand/archie-intelligence.png",
} as const;

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
    goal: "Put SHI on the Story Pro menu with a brandable mark and its own page.",
    status: "done",
    frontend: [
      "Story Pro tab: SHI + ShiIcon",
      "Dedicated Property Intelligence page shell",
      "Deep link /portal/intelligence",
      "Copy: Story Home Intelligence (not CAD filenames)",
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
    goal: "Universal property search + map research + property intelligence panel.",
    status: "done",
    frontend: [
      "Left: search + filters (county-first, real fields only)",
      "Center: MapLibre parcel map (viewport load)",
      "Right: Property Intelligence panel",
      "Results list/table",
      "County labels (Polk County) — never polk_cad in UI",
      "Freshness chips from county status",
    ],
    backend: [
      "Property Intelligence query layer (searchProperties, getProperty)",
      "Indexed search endpoints / safe Supabase selects",
      "Viewport parcel query (no full 345k client download)",
      "County freshness DTO (pro-safe subset only)",
      "Report missing indexes — do not slow-scan",
    ],
    outOfScope: [
      "CAD ingest / 72h refresh changes",
      "Fake AI scores",
      "Bulk county download",
    ],
  },
  {
    id: "SHI-2",
    name: "Relationships · Area · History",
    goal: "Owner matches, multi-tract, area analysis, observed CAD history.",
    status: "done",
    frontend: [
      "Owner relationship panel (EXACT / POSSIBLE match wording)",
      "Multi-tract visualization",
      "Area analyze (draw/radius/bounds → metrics)",
      "Record history timeline (only observed CAD changes)",
    ],
    backend: [
      "Owner match service with confidence tiers",
      "Area aggregation queries (counts, medians, classifications)",
      "Property history events (if table exists; else document need)",
      "Multi-tract fetch by linked prop ids",
    ],
    outOfScope: [
      "Absentee-owner claims",
      "Invented ownership history",
    ],
  },
  {
    id: "SHI-2.5",
    name: "Market Frames · Analyzer · Study folders",
    goal: "Multi-box market frames, on-demand parcel value estimates, save/reopen in county folders.",
    status: "done",
    frontend: [
      "Multi-frame box/radius/freehand draw (many frames on map)",
      "Analyze active frame → parcel list + estimated area value",
      "Study folders (square tiles + acronym) by county",
      "Save capture bundle (geometry + metrics + map thumbnail)",
      "Reopen saved frames onto the map",
    ],
    backend: [
      "shi_study_folders / shi_market_frames / shi_frame_snapshots + RLS",
      "County-locked analyze with hard caps (no infinite jobs)",
      "Thumbnail storage (shi-studies) private to owner",
      "Never write CAD; never overwrite other agents",
    ],
    outOfScope: [
      "Background infinite recompute",
      "Cross-agent shared folders (v1)",
    ],
  },
  {
    id: "SHI-2.6",
    name: "Cockpit · Study Vault · Draw OS",
    goal: "Research cockpit layout, Study Vault submenu, shared freehand toolbox on Marketplace.",
    status: "done",
    frontend: [
      "SHI submenu: Research | Study Vault (Community-style)",
      "3-split Research + Map Memory vault cards",
      "Study Vault rename/delete/thumbnails/reopen",
      "Shared Draw OS freehand on Marketplace refine map",
    ],
    backend: [
      "Folder/frame PATCH+DELETE owner-gated APIs",
      "Signed thumbnail URLs (owner path prefix only)",
      "Boundary safety caps shared helper",
      "Armor script for freehand downsample + span caps",
    ],
    outOfScope: [
      "SHI-3 prospects",
      "Listing-form CAD redesign",
    ],
  },
  {
    id: "SHI-2.7",
    name: "Analyzer harden · county lock · vault trust",
    goal: "Finish Analyzer/Vault backlog before SHI-3: county-locked frames, server recompute, indexes.",
    status: "done",
    frontend: [
      "Frame county locked at draw time",
      "Save form clears stale folders + surfaces errors",
      "Honest capped-analysis messaging",
    ],
    backend: [
      "Server recomputes analysis on save (never trust client metrics)",
      "Resave can move frame to another folder",
      "Owner-match triggers + trgm/centroid indexes (migration 0024)",
    ],
    outOfScope: [
      "SHI-3 prospects",
      "Farms / change intel",
    ],
  },
  {
    id: "SHI-2.8",
    name: "Research perfect · draw trust · vault UX",
    goal: "One polish pass so Research feels finished before Prospects: keep drafts on fail, radius/freehand warns, reopen/remove trust.",
    status: "done",
    frontend: [
      "Keep freehand/box drafts when create is rejected",
      "Radius + freehand live size warnings · Pan/Esc",
      "Remove/reopen/select frame clears stale market data",
      "Vault dialog errors · analyze loading · reopen banner",
    ],
    backend: [
      "Honest area API boundary copy (box / freehand / radius)",
      "No new migrations — 0024 already applied",
    ],
    outOfScope: [
      "SHI-3 prospects",
      "Farms / change intel",
    ],
  },
  {
    id: "SHI-3",
    name: "Prospects · Notes · CRM convert",
    goal: "Property-native opportunity pipeline on top of public records without mutating CAD.",
    status: "current",
    frontend: [
      "Save Prospect from Research property record",
      "Prospects module (ribbon) — pipeline + dossier",
      "Statuses + private notes",
      "Create Seller Lead (prefill; no invented contact)",
      "Research ↔ Prospects hand-off",
    ],
    backend: [
      "shi_prospects / shi_prospect_notes + RLS (migration 0025)",
      "GET/POST /api/shi/prospects · PATCH detail · notes",
      "convertProspectToSellerLead → seller_clients",
      "Strict separation: public parcel vs agent private data",
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
    goal: "Saved territories wired to CAD refresh deltas.",
    status: "planned",
    frontend: [
      "Save farm from map selection",
      "Farm detail + property count",
      "Since last review: new / changed / inactive",
    ],
    backend: [
      "saved_farms table (geometry + metadata) + RLS",
      "Farm membership as references to parcels (not CAD copies)",
      "Delta detection against 72h refresh / last_seen",
      "Meaningful change filters (no noise)",
    ],
    outOfScope: [
      "Destructive CAD replace logic (separate reliability wave)",
    ],
  },
  {
    id: "SHI-5",
    name: "Find Similar · Portfolio polish",
    goal: "Deterministic similarity + confident owner portfolios.",
    status: "planned",
    frontend: [
      "Find Similar with explainable criteria",
      "Owner portfolio map + totals",
    ],
    backend: [
      "Deterministic similar-property query builder",
      "Portfolio aggregation for EXACT owner matches only",
    ],
    outOfScope: [
      "Generative AI similarity",
      "AVM / seller probability scores",
    ],
  },
];
