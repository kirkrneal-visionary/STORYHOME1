/**
 * First-party product analytics track().
 * Sinks: noop | console | remote (POST /api/analytics).
 * Never throws into UX.
 */

import {
  type AnalyticsEventName,
  type AnalyticsPropsMap,
} from "@/lib/analytics/events";
import { scrubAnalyticsProps } from "@/lib/analytics/scrub";

export type AnalyticsSink = "noop" | "console" | "remote";

function resolveSink(): AnalyticsSink {
  if (typeof process === "undefined") return "noop";
  const raw = (process.env.NEXT_PUBLIC_ANALYTICS_SINK || "remote")
    .trim()
    .toLowerCase();
  if (raw === "noop") return "noop";
  if (raw === "console") return "console";
  if (raw === "remote") return "remote";
  // Unknown values fail closed.
  return "noop";
}

function postRemote(payload: {
  event: string;
  props: Record<string, unknown>;
  at: string;
}): void {
  if (typeof fetch === "undefined") return;
  const body = JSON.stringify(payload);
  try {
    void fetch("/api/analytics", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
      keepalive: true,
      credentials: "same-origin",
    }).catch(() => {
      /* ignore */
    });
  } catch {
    /* ignore */
  }
}

export function track<E extends AnalyticsEventName>(
  event: E,
  props: AnalyticsPropsMap[E],
): void {
  try {
    const payload = {
      event,
      props: scrubAnalyticsProps(props as Record<string, unknown>),
      at: new Date().toISOString(),
    };
    const sink = resolveSink();
    if (sink === "noop") return;
    if (sink === "console" && typeof console !== "undefined") {
      console.info("[story-analytics]", payload.event, payload.props);
      return;
    }
    if (sink === "remote") {
      postRemote(payload);
    }
  } catch {
    /* never break product UX */
  }
}
