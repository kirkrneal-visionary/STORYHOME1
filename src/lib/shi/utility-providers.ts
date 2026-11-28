/**
 * Property utility provider rows from owned desk facts.
 * Only rows with real evidence — never invent electric/gas/trash.
 * Unknown kinds are omitted — no empty guess rows.
 */

import type { UtilitiesFact } from "@/lib/shi/utilities-ccn";

export type UtilityKind = "electric" | "water" | "sewer" | "gas" | "trash";

export type UtilityProviderRow = {
  kind: UtilityKind;
  label: string;
  provider: string;
  detail: string | null;
  source: string;
};

const KIND_LABEL: Record<UtilityKind, string> = {
  electric: "Electric",
  water: "Water",
  sewer: "Sewer",
  gas: "Gas",
  trash: "Trash",
};

function firstNamed(
  hits: { utility: string | null; dba: string | null; ccnNo: string | null }[],
): { name: string; ccnNo: string | null } | null {
  for (const h of hits) {
    const name = (h.utility || h.dba || "").trim();
    if (name) return { name, ccnNo: h.ccnNo };
  }
  for (const h of hits) {
    if (h.ccnNo) return { name: `CCN ${h.ccnNo}`, ccnNo: h.ccnNo };
  }
  return null;
}

/**
 * Build provider rows from PUCT CCN (water/sewer) when present.
 * Electric / gas / trash stay off until an owned join exists.
 */
export function utilityProviderRows(
  utilities: UtilitiesFact | null | undefined,
): UtilityProviderRow[] {
  if (!utilities?.userReveal) return [];
  const rows: UtilityProviderRow[] = [];
  const water = firstNamed(utilities.water);
  if (water) {
    rows.push({
      kind: "water",
      label: KIND_LABEL.water,
      provider: water.name,
      detail: water.ccnNo ? `PUCT CCN ${water.ccnNo}` : null,
      source: utilities.chip.source,
    });
  }
  const sewer = firstNamed(utilities.sewer);
  if (sewer) {
    rows.push({
      kind: "sewer",
      label: KIND_LABEL.sewer,
      provider: sewer.name,
      detail: sewer.ccnNo ? `PUCT CCN ${sewer.ccnNo}` : null,
      source: utilities.chip.source,
    });
  }
  return rows;
}

export function hasUtilityProviderRows(
  utilities: UtilitiesFact | null | undefined,
): boolean {
  return utilityProviderRows(utilities).length > 0;
}
