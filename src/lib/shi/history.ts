import type { ShiHistoryEvent, ShiPropertyDetail } from "@/lib/shi/types";

/**
 * Observed CAD history only — tax-year values + last ingest observation.
 * No ownership/deed timeline (that data does not exist in CAD pulls yet).
 */
export function buildObservedHistory(
  property: Pick<
    ShiPropertyDetail,
    "values" | "ingestedAt" | "freshness" | "marketValue" | "taxYear"
  >,
): ShiHistoryEvent[] {
  const events: ShiHistoryEvent[] = [];

  if (property.ingestedAt) {
    events.push({
      kind: "ingest_observed",
      at: property.ingestedAt,
      title: "Last observed in county CAD pull",
      detail: property.freshness.label,
    });
  }

  for (const v of property.values) {
    events.push({
      kind: "value_year",
      at: `${v.taxYear}-01-01`,
      title: `Observed CAD values · tax year ${v.taxYear}`,
      detail: [
        v.marketValue != null
          ? `Market ${v.marketValue.toLocaleString("en-US", {
              style: "currency",
              currency: "USD",
              maximumFractionDigits: 0,
            })}`
          : null,
        v.landValue != null
          ? `Land ${v.landValue.toLocaleString("en-US", {
              style: "currency",
              currency: "USD",
              maximumFractionDigits: 0,
            })}`
          : null,
        v.improvementValue != null
          ? `Impr ${v.improvementValue.toLocaleString("en-US", {
              style: "currency",
              currency: "USD",
              maximumFractionDigits: 0,
            })}`
          : null,
      ]
        .filter(Boolean)
        .join(" · ") || "Values on file",
    });
  }

  // Newest observation first; value years descending.
  events.sort((a, b) => {
    if (a.kind !== b.kind) {
      return a.kind === "ingest_observed" ? -1 : 1;
    }
    return b.at.localeCompare(a.at);
  });

  return events;
}
