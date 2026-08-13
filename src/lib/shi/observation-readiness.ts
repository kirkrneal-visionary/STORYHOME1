/**
 * Observation readiness — why County observation feed / Stability may be empty.
 *
 * Distinguishes: migrations missing · awaiting next CAD pull · quiet · active.
 * Never invents change events.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export type ObservationReadinessStatus =
  | "migrations_needed"
  | "awaiting_next_pull"
  | "quiet"
  | "active"
  | "pick_county";

export type ObservationReadiness = {
  source: string;
  status: ObservationReadinessStatus;
  statusLabel: string;
  detail: string;
  eventsTableAvailable: boolean;
  absentColumnAvailable: boolean;
  trackingStarted: boolean;
  eventCount: number;
  lastEventAt: string | null;
  countyName: string | null;
  lastPullAt: string | null;
  parcelCount: number | null;
  pullStale: boolean | null;
  /** Short agent-facing next step when not active/quiet. */
  nextStep: string | null;
};

function freshnessStale(
  lastSuccessAt: string | null,
  refreshIntervalHours: number,
): boolean {
  if (!lastSuccessAt) return true;
  const ageMs = Date.now() - new Date(lastSuccessAt).getTime();
  if (!Number.isFinite(ageMs)) return true;
  return ageMs > refreshIntervalHours * 3600 * 1000;
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
    return {
      source: "",
      status: "pick_county",
      statusLabel: "Pick a county",
      detail: "Select a county to check observation readiness.",
      eventsTableAvailable: false,
      absentColumnAvailable: false,
      trackingStarted: false,
      eventCount: 0,
      lastEventAt: null,
      countyName: null,
      lastPullAt: null,
      parcelCount: null,
      pullStale: null,
      nextStep: null,
    };
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
      // Other errors: don't fail readiness entirely.
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
  let parcelCount: number | null = null;
  let pullStale: boolean | null = null;
  {
    let { data, error } = await supabase
      .from("cad_county_status")
      .select(
        "county_name, last_success_at, parcel_count, db_parcel_count, refresh_interval_hours",
      )
      .eq("source", src)
      .maybeSingle();
    if (error && /db_parcel_count/i.test(error.message || "")) {
      ({ data, error } = await supabase
        .from("cad_county_status")
        .select(
          "county_name, last_success_at, parcel_count, refresh_interval_hours",
        )
        .eq("source", src)
        .maybeSingle());
    }
    if (data) {
      countyName = (data.county_name as string | null) ?? null;
      lastPullAt = (data.last_success_at as string | null) ?? null;
      // Prefer live DB unique count when ops-scale columns exist.
      const row = data as {
        parcel_count?: number | null;
        db_parcel_count?: number | null;
        refresh_interval_hours?: number | null;
      };
      const dbN =
        row.db_parcel_count == null ? null : Number(row.db_parcel_count);
      parcelCount =
        dbN != null
          ? dbN
          : row.parcel_count == null
            ? null
            : Number(row.parcel_count);
      const windowH = Number(row.refresh_interval_hours ?? 168) || 168;
      pullStale = freshnessStale(lastPullAt, windowH);
    }
  }

  if (!eventsTableAvailable) {
    return {
      source: src,
      status: "migrations_needed",
      statusLabel: "Observation setup needed",
      detail:
        "Change-events table is missing. Apply migration 0027 so Archie can record pull-to-pull diffs.",
      eventsTableAvailable,
      absentColumnAvailable,
      trackingStarted,
      eventCount,
      lastEventAt,
      countyName,
      lastPullAt,
      parcelCount,
      pullStale,
      nextStep:
        "Run supabase/migrations/0027_cad_observation_events.sql in the SQL editor, then refresh the county CAD.",
    };
  }

  if (!absentColumnAvailable) {
    // Feed can still work for field diffs; presence needs 0028.
    // Only elevate to migrations_needed when we also have zero events AND no tracking —
    // otherwise treat as partial setup with a next step.
  }

  if (eventCount > 0) {
    return {
      source: src,
      status: "active",
      statusLabel: "Observation active",
      detail: `${eventCount.toLocaleString("en-US")} Archie-observed change event${eventCount === 1 ? "" : "s"} on file for this county.`,
      eventsTableAvailable,
      absentColumnAvailable,
      trackingStarted,
      eventCount,
      lastEventAt,
      countyName,
      lastPullAt,
      parcelCount,
      pullStale,
      nextStep: absentColumnAvailable
        ? null
        : "Optional: apply migration 0028 (absent_at) so full pulls can mark presence.",
    };
  }

  if (!trackingStarted) {
    return {
      source: src,
      status: "migrations_needed",
      statusLabel: "Tracking not started",
      detail:
        "Parcels do not have first_seen_at yet. Apply migration 0027 (or re-run its backfill) and refresh CAD.",
      eventsTableAvailable,
      absentColumnAvailable,
      trackingStarted,
      eventCount,
      lastEventAt,
      countyName,
      lastPullAt,
      parcelCount,
      pullStale,
      nextStep:
        "Apply 0027, then run a county CAD refresh so Archie starts observation timestamps.",
    };
  }

  // Tracking on, no events — distinguish “never compared a later pull” vs “compared and quiet.”
  if (!successivePullSeen) {
    return {
      source: src,
      status: "awaiting_next_pull",
      statusLabel: "Awaiting next CAD pull",
      detail:
        "Observation tracking is on, but Archie has not compared a later county pull yet. Empty feed does not mean “nothing changed in the world.”",
      eventsTableAvailable,
      absentColumnAvailable,
      trackingStarted,
      eventCount,
      lastEventAt,
      countyName,
      lastPullAt,
      parcelCount,
      pullStale,
      nextStep: absentColumnAvailable
        ? "Run another full county refresh (`ingest-cad --all`) so successive pulls can emit diffs."
        : "Apply migration 0028 (absent_at), then run a full county refresh.",
    };
  }

  return {
    source: src,
    status: "quiet",
    statusLabel: "Quiet · no field changes on file",
    detail:
      "Archie has compared successive CAD pulls for this county and has no pull-to-pull field changes on file. That is observation quiet — not a market forecast.",
    eventsTableAvailable,
    absentColumnAvailable,
    trackingStarted,
    eventCount,
    lastEventAt,
    countyName,
    lastPullAt,
    parcelCount,
    pullStale,
    nextStep: absentColumnAvailable
      ? null
      : "Optional: apply migration 0028 (absent_at) so full pulls can mark presence.",
  };
}

/** Pure helper for armor tests / UI copy mapping. */
export function readinessEmptyCopy(r: ObservationReadiness): string {
  switch (r.status) {
    case "pick_county":
      return "Select a county to load observation events.";
    case "migrations_needed":
      return r.detail;
    case "awaiting_next_pull":
      return "No observation events yet — Archie is waiting to compare another CAD pull (or fields have been quiet).";
    case "quiet":
      return "Tracking is on and the county looks quiet — no pull-to-pull field changes on file.";
    case "active":
      return "Observation events on file.";
    default:
      return r.detail;
  }
}
