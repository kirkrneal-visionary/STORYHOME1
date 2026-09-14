/**
 * Background job classification. Production ingest stays authoritative.
 * Story Labs must not run a second copy against production.
 */

export const BACKGROUND_JOBS = [
  {
    id: "cad-refresh",
    name: "CAD 72h refresh",
    source: ".github/workflows/cad-refresh.yml",
    class: "PRODUCTION_ONLY",
    note: "Writes county_parcels / observation history. Never point this Action at staging credentials that resolve to production.",
  },
  {
    id: "cad-ingest",
    name: "CAD ingest scripts",
    source: "scripts/ingest-cad.mjs",
    class: "PRODUCTION_ONLY",
    note: "Manual / Action. Disabled against production from Story Labs.",
  },
  {
    id: "clerk-deeds",
    name: "Clerk deeds ingest",
    source: "scripts/ingest-clerk-deeds.mjs",
    class: "PRODUCTION_ONLY",
    note: "Writes clerk_deed_transfers.",
  },
  {
    id: "listing-activity",
    name: "Listing activity write",
    source: "src/app/api/listing-activity/route.ts",
    class: "STAGING_SAFE",
    note: "Safe when the app uses a staging Supabase project.",
  },
  {
    id: "product-analytics",
    name: "Product analytics ingest",
    source: "src/app/api/analytics/route.ts",
    class: "STAGING_SAFE",
    note: "Events are tagged with env. Staging must use a separate project or be excluded from reports.",
  },
  {
    id: "billing-webhook",
    name: "Billing webhook",
    source: "src/app/api/billing/webhook/route.ts",
    class: "STAGING_SIMULATED",
    note: "Test-mode secret only in Labs. Live secret fails closed.",
  },
  {
    id: "launch7-tiles",
    name: "Launch-7 tile publish",
    source: "scripts/publish-launch7-tiles.mjs",
    class: "DISABLED_IN_STAGING",
    note: "Publishes shared CDN objects. Do not run from Labs.",
  },
] as const;

export type BackgroundJobClass =
  | "PRODUCTION_ONLY"
  | "STAGING_SAFE"
  | "DISABLED_IN_STAGING"
  | "STAGING_SIMULATED";
