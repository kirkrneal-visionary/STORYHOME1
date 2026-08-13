import { ANALYTICS_FORBIDDEN_PROP_KEYS } from "@/lib/analytics/events";

/** Drop forbidden / non-primitive keys before any sink or storage. */
export function scrubAnalyticsProps(
  props: Record<string, unknown> | undefined,
): Record<string, unknown> {
  if (!props) return {};
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(props)) {
    if ((ANALYTICS_FORBIDDEN_PROP_KEYS as readonly string[]).includes(key)) {
      continue;
    }
    if (value == null) continue;
    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      out[key] = value;
    }
  }
  return out;
}
