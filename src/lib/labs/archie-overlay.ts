/**
 * Map a Labs Archie simulation onto existing Phase 2 readiness types.
 * Does not invent new market meanings.
 */

import type {
  CountyObservationHealth,
  ObservationReadiness,
  ObservationReadinessStatus,
} from "@/lib/shi/observation-readiness";
import type { LabsArchieState } from "@/lib/labs/simulation";

const OVERLAY: Record<
  Exclude<LabsArchieState, "normal">,
  { status: ObservationReadinessStatus; health: CountyObservationHealth; detail: string }
> = {
  no_history: {
    status: "awaiting_next_pull",
    health: "unknown",
    detail: "Story Labs: no observation history in this session.",
  },
  refreshing: {
    status: "awaiting_next_pull",
    health: "unknown",
    detail: "Story Labs: county refresh in progress (session only).",
  },
  stale: {
    status: "refresh_delayed",
    health: "refresh_delayed",
    detail: "Story Labs: county last-success is outside the freshness window.",
  },
  source_degraded: {
    status: "refresh_delayed",
    health: "refresh_delayed",
    detail: "Story Labs: source degraded — last-known-good must remain.",
  },
  source_failed: {
    status: "source_failed",
    health: "source_failed",
    detail: "Story Labs: source failed. Do not treat as a quiet market.",
  },
  partial_pull: {
    status: "partial_pull",
    health: "partial_pull",
    detail: "Story Labs: partial pull. Do not promote last_success_at.",
  },
  no_change: {
    status: "quiet",
    health: "current",
    detail: "Story Labs: no change observed on a verified full pull.",
  },
  loading: {
    status: "awaiting_next_pull",
    health: "unknown",
    detail: "Story Labs: request still loading.",
  },
  request_failed: {
    status: "source_failed",
    health: "source_failed",
    detail: "Story Labs: request failed. Separate from an empty county.",
  },
};

export function applyLabsArchieOverlay(
  readiness: ObservationReadiness,
  state: LabsArchieState | null | undefined,
  labsActive: boolean,
): ObservationReadiness {
  if (!labsActive || !state || state === "normal") return readiness;
  const overlay = OVERLAY[state];
  return {
    ...readiness,
    status: overlay.status,
    health: overlay.health,
    detail: overlay.detail,
    statusLabel: readiness.statusLabel,
  };
}
