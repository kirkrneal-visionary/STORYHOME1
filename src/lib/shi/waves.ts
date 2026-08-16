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
    status: "done",
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
    id: "ARCHIE-CORRIDORS-V2",
    name: "Corridors V.2 · compare · save · report",
    goal: "Compare two drawn areas, save studies into Vault, and produce a Development Intelligence Report — still evidence, never guaranteed futures.",
    status: "done",
    frontend: [
      "Compare another area (A/B evidence contrast)",
      "Save study → Study Vault Corridors folder + local reopen",
      "Development Intelligence Report print product",
    ],
    backend: [
      "compareCorridorAnalyses + corridor-report HTML",
      "Reuse shiSaveFrame / folders (RLS) — no CAD writes",
      "Browser corridor study memory linked to vaultFrameId",
    ],
    outOfScope: [
      "Fake accuracy / guaranteed appreciation",
      "Full validation backtest harness (next)",
      "New licensed data pretended as live",
    ],
  },
  {
    id: "ARCHIE-CORRIDORS-MAP-TOOLBOX",
    name: "Corridors · map-native toolbox · draw lock",
    goal: "Put Navigate/Freehand/Box/Radius/Traffic on the map; hard-lock pan while drawing; near-precision freehand with undo/done.",
    status: "done",
    frontend: [
      "In-map toolbox (Research-class, Corridors-tuned)",
      "Hard navigation lock for whole draw mode",
      "Undo / Done / Cancel · Escape discard",
      "Hero CTAs removed — draw is a map instrument",
    ],
    backend: [
      "nav-lock helper + corridor freehand precision knobs",
      "No CAD writes · reuse Draw OS",
    ],
    outOfScope: [
      "Vertex drag-edit after seal (later)",
      "Destructive Research map rewrite",
    ],
  },
  {
    id: "ARCHIE-CORRIDORS-VALIDATION",
    name: "Corridors · validation · honest confidence",
    goal: "Backtest harness + confidence from coverage, agreement, and labeled outcomes — never hard-coded accuracy theater.",
    status: "done",
    frontend: [
      "Validation block on analysis card",
      "Coverage / agreement scores",
      "Publish hit rate only when sample qualifies",
    ],
    backend: [
      "corridor-validation backtest ledger + fixture corpus",
      "computeValidatedConfidence wired into compose",
      "Production ledger ready for labeled outcomes",
    ],
    outOfScope: [
      "Fake 87% accuracy claims",
      "Auto-rewrite production algorithms from unchecked AI",
    ],
  },
  {
    id: "ARCHIE-CORRIDORS-ADAPTERS",
    name: "Corridors · pluggable evidence sources",
    goal: "SOURCE adapter registry — CAD + TxDOT live; future feeds planned/unavailable never faked; professional feedback channel that does not mutate CAD.",
    status: "done",
    frontend: [
      "Evidence sources strip on analysis card",
      "Planned adapters listed but not treated as present",
      "Private quality flags (stale / questionable / missing / incorrect)",
    ],
    backend: [
      "corridor-sources adapter registry + resolveSourcesForAnalysis",
      "composeCorridorAnalysis includes sources",
      "corridor-feedback local quality ledger (no CAD writes)",
    ],
    outOfScope: [
      "Pretending permits/zoning/MLS are connected",
      "Mutating county records from feedback",
    ],
  },
  {
    id: "ARCHIE-OBS-OPS",
    name: "Observation health · empty-state honesty",
    goal: "Make Ownership Stability and County observation feed trustworthy — distinguish migrations pending vs awaiting next pull vs truly quiet.",
    status: "done",
    frontend: [
      "Observation setup banner on County observation feed",
      "County pull status · presence marking readiness",
      "Clearer Building history reasons",
      "Missing from latest full pull chip when absent_at set",
    ],
    backend: [
      "getObservationReadiness on GET /api/shi/changes",
      "Property detail loads absent_at (soft if column missing)",
      "No new migration — apply existing 0027/0028",
    ],
    outOfScope: [
      "Inventing backfilled change events",
      "Deed / MLS sale timeline claims",
    ],
  },
  {
    id: "STORY-CONTINUUM-VISIBILITY",
    name: "Story Continuum · visibility pass",
    goal: "Make Continuum perceptible on phone + desktop — room-step, swipe belonging, study cue, lateral dissolve — without brand redesign or slideshow.",
    status: "done",
    frontend: [
      "Tuned browse / social / study temperatures",
      "Stronger swipe peek underlay",
      "Nav markNavigate for honest direction",
      "Cool study arrival cue (CSS, not neon)",
    ],
    backend: [
      "Token + physics only — no CAD / Archie logic changes",
    ],
    outOfScope: [
      "Brand / layout redesign",
      "Desktop full-width slideshow",
      "Stealing map gestures",
    ],
  },
  {
    id: "STORY-MESSAGES-REFERRALS",
    name: "Messages & Referrals · hide shell theater",
    goal: "Remove fake inbox/board and unread badges until real product ships — deep links stay honest, listing inquire still goes to Story Pro leads.",
    status: "done",
    frontend: [
      "Nav / footer / profile / agent CTAs no longer promise live Messages or Referrals",
      "Honest pause landings on /messages and /referrals",
      "Hard-coded unreadMessages / openReferralCount removed",
    ],
    backend: [
      "No schema delete — tables may remain for a future finish wave",
      "Inquire → Story Pro leads unchanged",
    ],
    outOfScope: [
      "Building a real DM inbox this wave",
      "Fake kanban or reputation theater",
    ],
  },
  {
    id: "STORY-ANALYTICS-FOUNDATION",
    name: "Analytics foundation · privacy-reviewed events",
    goal: "First-party event catalog + noop/console sink for funnel and Archie usage — no PII props, no third-party SDK, no fake dashboards.",
    status: "done",
    frontend: [
      "track() on marketplace, listing, inquire, login, portal tabs, Archie modules",
      "Parcel open with county FIPS only",
      "Study reopen boolean only",
    ],
    backend: [
      "src/lib/analytics catalog + scrubber",
      "NEXT_PUBLIC_ANALYTICS_SINK=noop|console|remote",
    ],
    outOfScope: [
      "PostHog / Segment / session replay",
      "Who-viewed-what audit without separate design",
      "Fake product analytics dashboard",
    ],
  },
  {
    id: "STORY-ANALYTICS-DESTINATION",
    name: "Analytics destination · first-party ingest",
    goal: "Store catalog events in product_analytics_events via POST /api/analytics — soft-fail if migration pending; no third-party; no public event feed.",
    status: "done",
    frontend: [
      "Default sink remote (fire-and-forget)",
      "console/noop still available via env",
    ],
    backend: [
      "Migration 0029 product_analytics_events + RLS",
      "POST /api/analytics catalog gate + server scrub",
      "Migration 0030 table grants for anon/authenticated/service_role",
    ],
    outOfScope: [
      "Admin cross-user analytics UI",
      "IP / fingerprint storage",
      "Vendor SDKs",
    ],
  },
  {
    id: "ARCHIE-INTELLIGENCE-SCENARIOS",
    name: "Intelligence scenarios · CAD value stress board",
    goal: "Research property scenario board (rungs 8–10): assumption-first CAD value stress + carry ranges, coverage from tax years/lookalikes — never sale forecast or seller probability.",
    status: "done",
    frontend: [
      "ShiIntelligenceScenarioBoard on CAD evidence panel",
      "Low/mid/high value stress knobs + rate/down/term",
      "Coverage chip + meeting-pack print",
    ],
    backend: [
      "runIntelligenceScenario pure compose (no CAD mutation)",
      "Armor scripts/test-intelligence-scenarios.mjs",
    ],
    outOfScope: [
      "Seller probability / AVM true value",
      "Corridors traffic growth scenarios (separate)",
      "Optional predictive models",
    ],
  },
  {
    id: "ARCHIE-COUNTY-OPS-SCALE",
    name: "County/ops scale · status honesty + refresh readiness",
    goal: "Truthful CAD coverage counts, ingest/absence caps, feed indexes, and refresh force-gates so multi-county expansion cannot silently lie or backfill giants.",
    status: "done",
    frontend: [
      "CadCountyStatusPanel coverage honesty line (DB/unique, not features)",
      "/api/cad/status coverage + displayParcelCount",
    ],
    backend: [
      "Migration 0031 ops-scale status columns + observed_at index",
      "ingest post-dedupe counts + CAD_MAX_INGEST_ROWS soft cap",
      "cad:audit persist + refresh --force gate for empty optional/giant",
    ],
    outOfScope: [
      "38-county / Montgomery full load in this wave",
      "Fake admin ops dashboard",
      "Invented storage GB without Query A–C paste",
    ],
  },
  {
    id: "STORY-FEEL-WAVE-1",
    name: "Feel Wave 1 · shell & material site-wide",
    goal: "One material language everywhere: atmosphere, debossed wells, soft chrome, sheets, display type — expensive clothes without feature creep or brand rewrite.",
    status: "done",
    frontend: [
      "globals tokens: radius, elev-deboss/raise, atmosphere, story-well/sheet/chrome",
      "Fraunces display + Poppins UI; GlobalNav/tabs story-chrome",
      "ListingCard + SaveToSuiteModal sheet language",
    ],
    backend: ["Armor scripts/test-story-feel-wave-1.mjs"],
    outOfScope: [
      "Per-room content redesign (Waves 2–4)",
      "Brand color rewrite",
      "New product features",
    ],
  },
  {
    id: "STORY-FEEL-WAVE-2",
    name: "Feel Wave 2 · consumer rooms calm",
    goal: "Home / Marketplace / Listing wear Wave 1 clothes: hero budget, softer toolbar, sheet filters, full-bleed listing photo, fewer equal boxes.",
    status: "done",
    frontend: [
      "HomeSearchHero first-viewport budget + story-surface search",
      "SearchToolbar story-chrome + field-input; filter sheet on phone",
      "Listing detail overlay back + story-well specs + story-surface agent",
    ],
    backend: ["Armor scripts/test-story-feel-wave-2.mjs"],
    outOfScope: [
      "Pro / Archie room polish (Waves 3–4)",
      "New marketplace features",
      "Brand rewrite",
    ],
  },
  {
    id: "STORY-FEEL-WAVE-3",
    name: "Feel Wave 3 · agent workrooms calm",
    goal: "Story Pro shell, CRM, listing forms, tools, and settings wear Wave 1 clothes — premium desk density without admin-panel cardboard.",
    status: "done",
    frontend: [
      "BrokerPortal story-chrome tabs",
      "broker/ui field-input + CRM/listing/tool story-surface/card/well",
      "Settings + community soft surfaces",
    ],
    backend: ["Armor scripts/test-story-feel-wave-3.mjs"],
    outOfScope: [
      "Archie Research/Corridors polish (Wave 4)",
      "New CRM features",
      "Brand rewrite",
    ],
  },
  {
    id: "STORY-FEEL-WAVE-4",
    name: "Feel Wave 4 · Archie study calm",
    goal: "Research, evidence, scenarios, Corridors, CAD status, and observation wear Wave 1 clothes — quieter study room, map sacred, toolbox secondary.",
    status: "done",
    frontend: [
      "PropertyIntelligenceView story-surface + field-input",
      "Evidence/scenario/change-feed/frames story-well",
      "Research + Corridors map story-chrome toolboxes",
      "Farms/Prospects/Vault soft surfaces + sheets",
    ],
    backend: ["Armor scripts/test-story-feel-wave-4.mjs"],
    outOfScope: [
      "Seller probability / AVM theater",
      "New predictive models",
      "Brand rewrite",
    ],
  },
  {
    id: "STORY-GLASS-AB",
    name: "Story Glass · Phase A/B shell",
    goal: "Graphite operating environment + Story Glass tokens; living header and floating phone bottom nav — prototype room Marketplace.",
    status: "done",
    frontend: [
      "globals env/glass/type tokens; navy as brand not wall",
      "useLivingHeader Full→Compact→Minimal with hysteresis",
      "story-glass-nav floating pill; Marketplace shell insets",
    ],
    backend: ["Armor scripts/test-story-glass-ab.mjs"],
    outOfScope: [
      "Global page redesign (Phases C–F)",
      "Sound / haptics shipping",
      "New product features / GRPT",
    ],
  },
  {
    id: "STORY-GLASS-C",
    name: "Story Glass · Phase C browse",
    goal: "Marketplace + Listing wear Story Glass — map canvas chrome, denser content-owns-screen list, living-header listing photo plane.",
    status: "done",
    frontend: [
      "MarketplaceMap tool/CAD/parcels story-glass (no navy/90)",
      "SearchToolbar story-glass; denser ListingCard story-surface",
      "Listing detail header tokens + glass back + bottom clearance",
    ],
    backend: ["Armor scripts/test-story-glass-c.mjs"],
    outOfScope: [
      "CAD/Continuum cache logic changes",
      "Home/social/Pro/Archie migration (D–F)",
      "Sound / new features",
    ],
  },
  {
    id: "STORY-GLASS-D",
    name: "Story Glass · Phase D Home / social",
    goal: "Home, Suites, Following, Network, Profile, and agent rooms wear living-header insets + Story Glass wells — no cardboard social empty states.",
    status: "done",
    frontend: [
      "HomeSearchHero story-glass search + header/bottom tokens",
      "Saved/Suites/Following/Network/Profile inset tokens",
      "SuitePlayer + Network list story-surface/well; agent env banner",
    ],
    backend: ["Armor scripts/test-story-glass-d.mjs"],
    outOfScope: [
      "Story Pro / Archie migration (E–F)",
      "Follow feature / Messages E2E",
      "Sound / GRPT",
    ],
  },
  {
    id: "STORY-GLASS-E",
    name: "Story Glass · Phase E Story Pro work",
    goal: "Story Pro portal, CRM empties, community, settings, and listing CAD map chrome wear living-header insets + Story Glass — Archie left for Phase F.",
    status: "done",
    frontend: [
      "BrokerPortal/Settings/ShellPaused shell tokens",
      "CRM/community empty states story-well",
      "ListingCadMap floating story-glass chrome",
    ],
    backend: ["Armor scripts/test-story-glass-e.mjs"],
    outOfScope: [
      "Archie Research/Corridors glass (Phase F)",
      "CRM feature work / GRPT",
      "Sound",
    ],
  },
  {
    id: "STORY-GLASS-F",
    name: "Story Glass · Phase F Archie study",
    goal: "Archie ribbon + Research/Corridors map chrome and study panels wear living-header/ribbon tokens + Story Glass — map sacred, clothing only.",
    status: "done",
    frontend: [
      "--story-archie-ribbon-h + BrokerPortal Archie living inset",
      "NetworkContextRibbon story-glass under living header",
      "Research/Corridors map + CAD overlay story-glass chrome",
      "Corridor analysis/compare + Archie mark story-surface",
    ],
    backend: ["Armor scripts/test-story-glass-f.mjs"],
    outOfScope: [
      "CAD math / honesty copy / Continuum cache",
      "Sound / GRPT / new features",
    ],
  },
  {
    id: "STORY-GLASS-G",
    name: "Story Glass · Phase G Feedback sound",
    goal: "Sparse, warm Web Audio room/success cues — always on as the experience; silent only under reduced motion.",
    status: "done",
    frontend: [
      "Synthesized cue vocabulary + Web Audio engine",
      "SoundProvider: always-on unlock + route/module bridges",
      "No Settings mute — sound is permanent clothing",
      "Inquire success + gold primary tap cues",
    ],
    backend: ["Armor scripts/test-story-glass-g.mjs"],
    outOfScope: [
      "Haptics shipping / GRPT / MP3 asset packs",
      "Sound on every story-press",
      "Mute toggle / stripping always-on sound",
      "CAD / Continuum logic changes",
    ],
  },
  {
    id: "STORY-SHELL-HEADER",
    name: "Unified shell · overlay header",
    goal: "Instagram-class overlay living header across phone/tablet/desktop — content under chrome; nav language deferred.",
    status: "done",
    frontend: [
      "story-overlay-header + --story-safe-top + viewport-fit cover",
      "no bottom hairline / black rule under overlay header (all states)",
      "Mobile menu · centered brand · actions; desktop brand + links",
      "Media heroes under header; rooms use safe-top pads",
      "Archie ribbon tracks safe-top",
    ],
    backend: ["Armor scripts/test-story-shell-header.mjs"],
    outOfScope: [
      "MapStage / wordmark asset / room memory",
      "GRPT / CAD / sound changes",
    ],
  },
  {
    id: "STORY-SHELL-NAV",
    name: "Unified shell · floating bottom dock",
    goal: "Bring the mobile Story Glass floating pill nav to tablet/desktop as a centered dock — same visual language, preview-first.",
    status: "done",
    frontend: [
      "story-bottom-dock + story-glass-nav on all breakpoints",
      "Desktop: centered floating pill (max ~32rem), not full-bleed",
      "Rooms keep --story-bottom-clearance under the dock on md+",
    ],
    backend: ["Armor scripts/test-story-shell-nav.mjs"],
    outOfScope: [
      "Merging to production without owner review",
      "Wordmark / MapStage / scroll-hide brand",
      "GRPT / CAD / sound changes",
      "Replacing desktop header utility cluster",
    ],
  },
  {
    id: "STORY-WALK",
    name: "Story Walk · Agent World · Living Mark",
    goal: "SW-1…SW-8 LIVE — Agent World, Living Mark, analytics, share, Story Walk film + social share.",
    status: "done",
    frontend: [
      "SW-1…SW-8 LIVE: Agent World, library, presence, play caps, analytics, share link",
      "SW-7 LIVE: Story Walk compositor — pick listings → Living Mark + photo walk → WebM",
      "SW-8 LIVE: Share film (native file/link/clipboard) + encode harden",
    ],
    backend: [
      "Armor scripts/test-story-walk-sw1…sw8.mjs",
      "Migration 0032_living_marks.sql",
      "Migration 0033_agent_world_engagement.sql",
    ],
    outOfScope: [
      "Permanent guest fingerprinting",
      "GRPT / CAD / map theater",
      "Fake engagement metrics",
    ],
  },
  {
    id: "ARCHIE-CORRIDORS-2",
    name: "Corridors 2.0 · parcel traffic + commercial location",
    goal: "Help pros answer which property has the best traffic exposure — land-first, plain language, no Corridors rewrite.",
    status: "done",
    frontend: [
      "C2.0-A…F LIVE: language · parcel · frontage · exposure/sites · property compare/CTAs · Ask Archie",
      "C2.0-F2 shipping: Ask deepen — frontage · corner/dual · confidence · this exposure (desk facts)",
      "Ask Archie: corridor-ask-v2.1 — F2 desk deepen + DC flood/utilities/env/deeds; no LLM stats; intersection distance TBD",
      "Preserve v1 toolbox · growth watch · scenarios · analyze · area compare",
    ],
    backend: [
      "Armor scripts/test-corridors-2a…2f.mjs · test:corridors-2f2",
      "Migration 0034_corridor_road_segments.sql · 0035 grants · RPC corridor_parcel_frontage",
      "API parcel-location · strongest-sites · softCache on traffic GET",
    ],
    outOfScope: [
      "Rebuild Corridors from scratch",
      "Survey-grade frontage / intersection distance claims",
      "LLM-invented traffic counts",
      "Live congestion / seller probability",
    ],
  },
  {
    id: "ARCHIE-DATA-COVERAGE",
    name: "Data Coverage · free public truth (DC-1…5)",
    goal: "Peer-grade flood / utilities / environment for launch 7 without click-metered landlords — reveal only when polished; retract on fail.",
    status: "done",
    frontend: [
      "DC-1: ShiFloodEvidencePanel on Research + Corridors parcel (KNOWN/VERIFY chips)",
      "DC-2: ShiUtilitiesEvidencePanel — PUCT water/sewer CCN certificated areas",
      "DC-3: ShiEnvironmentEvidencePanel — NWI · TIGER place/ISD · zoning VERIFY context",
      "DC-3: deeper CAD facts — abstract · tract · first/last seen",
      "DC-4: ShiEvidenceChip shared across Research / Corridors / Ask / print reports",
      "DC-4: corridor-ask-v2 desk intents flood_zone · utilities_ccn · environment_desk",
      "DC-5: ShiDeedsEvidencePanel dark store — userReveal false until clerk-grade",
      "DC-5: Ask deed_history honesty · clerk_deeds source planned",
      "userReveal gate — no half panel, no upsell",
    ],
    backend: [
      "GET /api/shi/flood — FEMA NFHL point query",
      "GET /api/shi/utilities — PUCT CCN point-in-polygon on owned launch-7 clip",
      "GET /api/shi/environment — NWI + TIGER place/school + zoning context",
      "GET /api/shi/deeds — dark store knowledge path (always retracted until coverage)",
      "data/shi/puct-ccn-launch7.json · npm run rebuild:puct-ccn",
      "Armor npm run test:data-coverage-dc1 · dc2 · dc3 · dc4 · dc5",
    ],
    outOfScope: [
      "ATTOM / Regrid / Zoneomics / DataTree",
      "Live congestion SKUs",
      "Deed history user reveal before clerk-grade for launch 7",
      "Paywall for any evidence field",
    ],
  },
  {
    id: "AGENT-WORLD-POLISH",
    name: "Agent World polish · visitor surface (AW-1)",
    goal: "Clarify public Agent World CTAs, trust strip, empty states, presence feel, and mobile — not a redesign.",
    status: "done",
    frontend: [
      "AW-1: visitor CTA hierarchy — primary listings; hide Find agents on visitor",
      "AW-1: trust strip 3-col mobile · empty listings / bio states",
      "AW-1: Living Mark enter motion + atmosphere sheen (reduce-motion safe)",
      "Markers data-agent-world-polish=aw-1",
    ],
    backend: ["Armor npm run test:agent-world-polish"],
    outOfScope: [
      "Full Agent World redesign / social clone",
      "Story Walk film changes",
      "New engagement event taxonomy",
    ],
  },
  {
    id: "ARCHIE-LAUNCH7-MAP",
    name: "Launch 7 map sovereignty · CDN/R2 ops (L7-3)",
    goal: "Own launch-7 basemap end-to-end — API cache today, CDN/R2 when credentials land, expand playbook ready.",
    status: "done",
    frontend: [
      "L7-1: OpenFreeMap liberty schema (no OSM.org tile hotlink)",
      "L7-2: MapLibre → /api/map/launch7/streets + /imagery",
      "L7-3: NEXT_PUBLIC_LAUNCH7_CDN_BASE flips serve mode to CDN",
      "L7-3: data-map-sovereignty=l7-3 · Research data-map-free-world",
    ],
    backend: [
      "GET /api/map/launch7/status — CDN/R2 readiness + footprint",
      "npm run publish:launch7-tiles · refresh:launch7-tiles · plan:launch7-expand",
      "Armor test:launch7-map-l1 · l2 · l3",
    ],
    outOfScope: [
      "Mapbox as Research basemap",
      "Google Maps JS as Research canvas",
      "ATTOM / Regrid parcel basemap landlords",
    ],
  },
  {
    id: "ARCHIE-DEEDS",
    name: "Owned clerk deeds · index then reveal (DEEDS-1…2)",
    goal: "Own clerk-grade deed index for launch 7 before any user reveal — no DataTree / ATTOM / CAD-as-deed.",
    status: "current",
    frontend: [
      "DEEDS-1: ShiDeedsEvidencePanel stays retracted (DEEDS_USER_REVEAL_OPEN false)",
      "DEEDS-1: Ask deed_history honesty unchanged — dark until DEEDS-2",
    ],
    backend: [
      "DEEDS-1: deeds-clerk-v1.1 · clerk-coverage-launch7.json · migration 0036",
      "DEEDS-1: npm run ingest:clerk-deeds · Armor test:data-coverage-deeds1",
      "DEEDS-2 next: peer-grade readyFips → open user reveal",
    ],
    outOfScope: [
      "DataTree / ATTOM / CoreLogic deed SKUs",
      "CAD owner diffs as transfer dates",
      "User reveal before peer-grade for launch 7",
      "Paywall / upsell for deed history",
    ],
  },
];

/** Current product line — owned clerk deeds scaffold. */
export const ARCHIE_CURRENT_WAVE = "ARCHIE-DEEDS" as const;

/** @deprecated Use ARCHIE_CURRENT_WAVE */
export const SHI_CURRENT_LINE = ARCHIE_CURRENT_WAVE;
