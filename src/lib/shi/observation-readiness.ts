/**
 * Observation readiness — why County observation feed / Stability may be empty.
 *
 * Distinguishes data HEALTH from market ACTIVITY.
 * Never invents change events. Never treats a failed/partial pull as quiet.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export type ObservationReadinessStatus =
  | "migrations_needed"
  | "awaiting_next_pull"
  | "quiet"
  | "active"
  | "pick_county"
  | "source_failed"
  | "refresh_delayed"
  | "partial_pull";

/** Internal data-health overlay — not a market forecast. */
export type CountyObservationHealth =
  | "current"
  | "refresh_delayed"
  | "source_failed"
  | "partial_pull"
  | "unknown";

export type ObservationReadiness = {
  source: string;
  status: ObservationReadinessStatus;
  statusLabel: string;
  detail: string;
  health: CountyObservationHealth;
  eventsTableAvailable: boolean;
  absentColumnAvailable: boolean;
  trackingStarted: boolean;
  eventCount: number;
  lastEventAt: string | null;
  countyName: string | null;
  lastPullAt: string | null;
  lastAttemptAt: string | null;
  lastError: string | null;
  ingestCapped: boolean;
  parcelCount: number | null;
  pullStale: boolean | null;
  /** Short agent-facing next step when not active/quiet. */
  nextStep: string | null;
};

export type CountyStatusHealthInput = {
  last_error?: string | null;
  last_success_at?: string | null;
  last_attempt_at?: string | null;
  ingest_capped?: boolean | null;
  refresh_interval_hours?: number | null;
};

const DEFAULT_REFRESH_HOURS = 72;

export function freshnessStale(
  lastSuccessAt: string | null | undefined,
  refreshIntervalHours: number,
): boolean {
  if (!lastSuccessAt) return true;
  const ageMs = Date.now() - new Date(lastSuccessAt).getTime();
  if (!Number.isFinite(ageMs)) return true;
  return ageMs > refreshIntervalHours * 3600 * 1000;
}

export function refreshWindowHours(
  refreshIntervalHours: number | null | undefined,
): number {
  const n = Number(refreshIntervalHours ?? DEFAULT_REFRESH_HOURS);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_REFRESH_HOURS;
}

export function countyHealthFromStatus(
  row: CountyStatusHealthInput | null | undefined,
): CountyObservationHealth {
  if (!row) return "unknown";
  const windowH = refreshWindowHours(row.refresh_interval_hours);
  const lastError = (row.last_error || "").trim();
  const lastSuccess = row.last_success_at ?? null;
  const lastAttempt = row.last_attempt_at ?? null;
  if (row.ingest_capped) return "partial_pull";
  if (lastError) {
    if (!lastSuccess) return "source_failed";
    if (lastAttempt) {
      const a = new Date(lastAttempt).getTime();
      const s = new Date(lastSuccess).getTime();
      if (Number.isFinite(a) && Number.isFinite(s) && a > s + 1000) {
        return "source_failed";
      }
    } else {
      return "source_failed";
    }
  }
  if (freshnessStale(lastSuccess, windowH)) return "refresh_delayed";
  if (lastSuccess) return "current";
  return "unknown";
}

export type ClassifyObservationInput = {
  eventsTableAvailable: boolean;
  trackingStarted: boolean;
  eventCount: number;
  successivePullSeen: boolean;
  health: CountyObservationHealth;
};

/**
 * Health wins over “quiet/active” so a failed county never looks like a quiet market.
 * Events may still exist from last-known-good — the banner explains health.
 */
export function classifyObservationStatus(
  input: ClassifyObservationInput,
): ObservationReadinessStatus {
  if (!input.eventsTableAvailable) return "migrations_needed";
  if (input.health === "partial_pull") return "partial_pull";
  if (input.health === "source_failed") return "source_failed";
  if (input.health === "refresh_delayed") return "refresh_delayed";
  if (input.eventCount > 0) return "active";
  if (!input.trackingStarted) return "migrations_needed";
  if (!input.successivePullSeen) return "awaiting_next_pull";
  return "quiet";
}

function copyForStatus(
  status: ObservationReadinessStatus,
  extras: {
    eventCount: number;
    lastError: string | null;
    countyName: string | null;
  },
): { statusLabel: string; detail: string; nextStep: string | null } {
  switch (status) {
    case "pick_county":
      return {
        statusLabel: "Pick a county",
        detail: "Select a county to check observation readiness.",
        nextStep: null,
      };
    case "migrations_needed":
      return {
        statusLabel: "Observation setup needed",
        detail:
          extras.eventCount === 0
            ? "Change-events table or tracking stamps are missing. Apply observation migrations, then refresh the county CAD."
            : "Observation setup is incomplete for this county.",
        nextStep:
          "Run supabase/migrations/0027_cad_observation_events.sql in the SQL editor, then refresh the county CAD.",
      };
    case "source_failed":
      return {
        statusLabel: "Source unavailable",
        detail:
          "Archie could not verify a new county observation. Last verified data remains in place.",
        nextStep: extras.lastError
          ? `Last error: ${extras.lastError.slice(0, 160)}`
          : "Retry the county CAD refresh when the source is reachable.",
      };
    case "refresh_delayed":
      return {
        statusLabel: "Refresh delayed",
        detail:
          "County data has not refreshed on its expected schedule. Last verified observation remains in use.",
        nextStep: "Wait for the next scheduled county refresh, or run a verified full pull.",
      };
    case "partial_pull":
      return {
        statusLabel: "Partial observation",
        detail:
          "The last county pull was incomplete. Archie did not treat missing parcels as disappeared, and last verified data remains in use.",
        nextStep: "Run a verified full-county pull before using absence or “quiet market” claims.",
      };
    case "awaiting_next_pull":
      return {
        statusLabel: "Building history",
        detail:
          "Archie needs another verified county observation before changes can be compared.",
        nextStep: "Run another full county refresh so successive pulls can emit diffs.",
      };
    case "quiet":
      return {
        statusLabel: "No change observed",
        detail:
          "No qualifying changes were observed between the available county snapshots.",
        nextStep: null,
      };
    case "active":
      return {
        statusLabel: "Observation active",
        detail: `${extras.eventCount.toLocaleString("en-US")} Archie-observed change event${extras.eventCount === 1 ? "" : "s"} on file for this county.`,
        nextStep: null,
      };
    default:
      return {
        statusLabel: extras.countyName ?? "County",
        detail: "Observation status unknown.",
        nextStep: null,
      };
  }
}

function emptyReadiness(
  source: string,
  status: ObservationReadinessStatus,
  health: CountyObservationHealth,
): ObservationReadiness {
  const copy = copyForStatus(status, {
    eventCount: 0,
    lastError: null,
    countyName: null,
  });
  return {
    source,
    status,
    statusLabel: copy.statusLabel,
    detail: copy.detail,
    health,
    eventsTableAvailable: false,
    absentColumnAvailable: false,
    trackingStarted: false,
    eventCount: 0,
    lastEventAt: null,
    countyName: null,
    lastPullAt: null,
    lastAttemptAt: null,
    lastError: null,
    ingestCapped: false,
    parcelCount: null,
    pullStale: null,
    nextStep: copy.nextStep,
  };
}

/**
 * Probe county observation plumbing (lightweight counts / column checks).
 */
export async function getObservationReadiness(
  supabase: SupabaseClient,
  source: string,
): Promise<ObservationReadiness> {
  const src = source.trim();
  if (!src) {
    return emptyReadiness("", "pick_county", "unknown");
  }

  let eventsTableAvailable = true;
  let eventCount = 0;
  let lastEventAt: string | null = null;

  {
    const { count, error } = await supabase
      .from("county_parcel_change_events")
      .select("id", { count: "exact", head: true })
      .eq("source", src);
    if (error) {
      if (/does not exist|county_parcel_change_events/i.test(error.message)) {
        eventsTableAvailable = false;
      } else {
        throw new Error(error.message);
      }
    } else {
      eventCount = count ?? 0;
    }
  }

  if (eventsTableAvailable && eventCount > 0) {
    const { data } = await supabase
      .from("county_parcel_change_events")
      .select("observed_at")
      .eq("source", src)
      .order("observed_at", { ascending: false })
      .limit(1);
    lastEventAt = (data?.[0]?.observed_at as string | undefined) ?? null;
  }

  let absentColumnAvailable = true;
  {
    const { error } = await supabase
      .from("county_parcels")
      .select("absent_at")
      .eq("source", src)
      .limit(1);
    if (error) {
      if (/absent_at|does not exist|column/i.test(error.message)) {
        absentColumnAvailable = false;
      }
    }
  }

  let trackingStarted = false;
  {
    const { count, error } = await supabase
      .from("county_parcels")
      .select("id", { count: "exact", head: true })
      .eq("source", src)
      .not("first_seen_at", "is", null);
    if (error) {
      if (/first_seen_at|does not exist|column/i.test(error.message)) {
        trackingStarted = false;
      }
    } else {
      trackingStarted = (count ?? 0) > 0;
    }
  }

  /** Evidence Archie compared a later pull (last_seen meaningfully after first_seen). */
  let successivePullSeen = false;
  if (trackingStarted) {
    const { data, error } = await supabase
      .from("county_parcels")
      .select("first_seen_at, last_seen_at")
      .eq("source", src)
      .not("first_seen_at", "is", null)
      .not("last_seen_at", "is", null)
      .limit(40);
    if (!error && data?.length) {
      successivePullSeen = data.some((row) => {
        const a = new Date(String(row.first_seen_at)).getTime();
        const b = new Date(String(row.last_seen_at)).getTime();
        return Number.isFinite(a) && Number.isFinite(b) && b - a >= 12 * 3600 * 1000;
      });
    }
  }

  let countyName: string | null = null;
  let lastPullAt: string | null = null;
  let lastAttemptAt: string | null = null;
  let lastError: string | null = null;
  let ingestCapped = false;
  let parcelCount: number | null = null;
  let pullStale: boolean | null = null;
  let health: CountyObservationHealth = "unknown";

  {
    let { data, error } = await supabase
      .from("cad_county_status")
      .select(
        "county_name, last_success_at, last_attempt_at, last_error, parcel_count, db_parcel_count, refresh_interval_hours, ingest_capped",
      )
      .eq("source", src)
      .maybeSingle();
    if (error && /db_parcel_count|ingest_capped|last_error/i.test(error.message || "")) {
      ({ data, error } = await supabase
        .from("cad_county_status")
        .select(
          "county_name, last_success_at, last_attempt_at, last_error, parcel_count, refresh_interval_hours",
        )
        .eq("source", src)
        .maybeSingle());
    }
    if (data) {
      countyName = (data.county_name as string | null) ?? null;
      lastPullAt = (data.last_success_at as string | null) ?? null;
      lastAttemptAt = (data.last_attempt_at as string | null) ?? null;
      lastError = (data.last_error as string | null) ?? null;
      const row = data as {
        parcel_count?: number | null;
        db_parcel_count?: number | null;
        refresh_interval_hours?: number | null;
        ingest_capped?: boolean | null;
      };
      ingestCapped = Boolean(row.ingest_capped);
      const dbN =
        row.db_parcel_count == null ? null : Number(row.db_parcel_count);
      parcelCount =
        dbN != null
          ? dbN
          : row.parcel_count == null
            ? null
            : Number(row.parcel_count);
      const windowH = refreshWindowHours(row.refresh_interval_hours);
      pullStale = freshnessStale(lastPullAt, windowH);
      health = countyHealthFromStatus({
        last_error: lastError,
        last_success_at: lastPullAt,
        last_attempt_at: lastAttemptAt,
        ingest_capped: ingestCapped,
        refresh_interval_hours: windowH,
      });
    }
  }

  const status = classifyObservationStatus({
    eventsTableAvailable,
    trackingStarted,
    eventCount,
    successivePullSeen,
    health: eventsTableAvailable ? health : "unknown",
  });
  const copy = copyForStatus(status, { eventCount, lastError, countyName });

  return {
    source: src,
    status,
    statusLabel: copy.statusLabel,
    detail: copy.detail,
    health,
    eventsTableAvailable,
    absentColumnAvailable,
    trackingStarted,
    eventCount,
    lastEventAt,
    countyName,
    lastPullAt,
    lastAttemptAt,
    lastError,
    ingestCapped,
    parcelCount,
    pullStale,
    nextStep:
      status === "active" || status === "quiet"
        ? absentColumnAvailable
          ? copy.nextStep
          : "Optional: apply migration 0028 (absent_at) so full pulls can mark presence."
        : copy.nextStep,
  };
}

/** Pure helper for armor tests / UI copy mapping. */
export function readinessEmptyCopy(r: ObservationReadiness): string {
  switch (r.status) {
    case "pick_county":
      return "Select a county to load observation events.";
    case "migrations_needed":
      return r.detail;
    case "source_failed":
      return "Archie could not verify a new county observation. Last verified data remains in place.";
    case "refresh_delayed":
      return "County data has not refreshed on its expected schedule. Last verified observation remains in use.";
    case "partial_pull":
      return "The last county pull was incomplete. Missing parcels were not treated as disappeared.";
    case "awaiting_next_pull":
      return "Archie needs another verified county observation before changes can be compared.";
    case "quiet":
      return "No qualifying changes were observed between the available county snapshots.";
    case "active":
      return "Observation events on file.";
    default:
      return r.detail;
  }
}
