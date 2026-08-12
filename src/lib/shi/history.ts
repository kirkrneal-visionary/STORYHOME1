import type { OwnershipChangeEvent } from "@/lib/shi/ownership-churn";
import type { ShiHistoryEvent, ShiPropertyDetail } from "@/lib/shi/types";

/**
 * Observed CAD history — tax-year values, last ingest, owner-field changes.
 * Never claims deed / sale dates.
 */
export function buildObservedHistory(
  property: Pick<
    ShiPropertyDetail,
    "values" | "ingestedAt" | "freshness" | "marketValue" | "taxYear"
  >,
  ownerEvents: OwnershipChangeEvent[] = [],
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

  for (const e of ownerEvents) {
    if (e.field === "presence") {
      events.push({
        kind: "owner_observed_change",
        at: e.observedAt,
        title:
          e.newValue === "absent"
            ? "Missing from a full-county CAD pull"
            : "Seen again in a CAD pull",
        detail:
          e.newValue === "absent"
            ? "Archie marked this parcel absent — not a deed sale."
            : "Cleared absence after Archie saw it again.",
      });
      continue;
    }
    const fieldLabel =
      e.field === "cad_owner_id"
        ? "Owner id"
        : e.field === "owner_name"
          ? "Owner name"
          : e.field === "situs_address"
            ? "Site address"
            : e.field === "market_value"
              ? "Market value"
              : e.field === "legal_acreage"
                ? "Acreage"
                : e.field;
    events.push({
      kind: "owner_observed_change",
      at: e.observedAt,
      title: `${fieldLabel} changed between CAD pulls`,
      detail: [
        e.oldValue ? `Was ${e.oldValue}` : "Was empty",
        e.newValue ? `Now ${e.newValue}` : "Now empty",
      ].join(" · "),
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

  // Newest observation first.
  events.sort((a, b) => b.at.localeCompare(a.at));

  return events;
}
