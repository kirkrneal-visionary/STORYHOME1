/**
 * First-party product analytics track().
 * Default sink: noop. Set NEXT_PUBLIC_ANALYTICS_SINK=console in dev.
 * Never throws into UX. No third-party network calls in this foundation.
 */

import {
  ANALYTICS_FORBIDDEN_PROP_KEYS,
  type AnalyticsEventName,
  type AnalyticsPropsMap,
} from "@/lib/analytics/events";

export type AnalyticsSink = "noop" | "console";

function resolveSink(): AnalyticsSink {
  if (typeof process === "undefined") return "noop";
  const raw = (process.env.NEXT_PUBLIC_ANALYTICS_SINK || "noop")
    .trim()
    .toLowerCase();
  return raw === "console" ? "console" : "noop";
}

function scrubProps(
  props: Record<string, unknown> | undefined,
): Record<string, unknown> {
  if (!props) return {};
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(props)) {
    if (
      (ANALYTICS_FORBIDDEN_PROP_KEYS as readonly string[]).includes(key)
    ) {
      continue;
    }
    if (value == null) continue;
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      out[key] = value;
    }
  }
  return out;
}

export function track<E extends AnalyticsEventName>(
  event: E,
  props: AnalyticsPropsMap[E],
): void {
  try {
    const payload = {
      event,
      props: scrubProps(props as Record<string, unknown>),
      at: new Date().toISOString(),
    };
    const sink = resolveSink();
    if (sink === "console" && typeof console !== "undefined") {
      console.info("[story-analytics]", payload.event, payload.props);
    }
  } catch {
    /* never break product UX */
  }
}
