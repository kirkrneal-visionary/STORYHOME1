/**
 * Parcel Position Intelligence — Phase 7 (surrounding context).
 * Founder Interpreter (build process only) — not a product.
 *
 * CONTEXT = nearby owned evidence. Not this parcel's road position.
 * Not a site grade. Never copy a neighbor's frontage or traffic.
 * Never add two roads' AADT. Unknown stays unknown.
 *
 * Rule version: parcel-position-context-v1
 */

import { roadsLikelyMatch } from "@/lib/shi/parcel-position-engine";
import type { ParcelPositionRecord } from "@/lib/shi/parcel-position";
import type { ParcelCadSnapshot } from "@/lib/shi/parcel-position-profile";
import type { ParcelNeighborsResult } from "@/lib/shi/parcel-neighbors";
import type { TxdotProject } from "@/lib/shi/txdot-projects";

export const PARCEL_POSITION_CONTEXT_VERSION =
  "parcel-position-context-v1" as const;

export const PARCEL_POSITION_CONTEXT_NOTE =
  "Surrounding evidence. Not this property's road position. Not a score.";

export type ParcelContextKind =
  | "traffic_history"
  | "cad_size"
  | "txdot_project"
  | "same_owner_adjoining";

export type ParcelContextItem = {
  kind: ParcelContextKind;
  label: string;
  detail: string;
};

export type ParcelPositionContext = {
  scope: "surrounding";
  contextVersion: typeof PARCEL_POSITION_CONTEXT_VERSION;
  propId: string;
  items: ParcelContextItem[];
  note: typeof PARCEL_POSITION_CONTEXT_NOTE;
};

const MAX_PROJECTS = 2;

function emptyContext(propId: string): ParcelPositionContext {
  return {
    scope: "surrounding",
    contextVersion: PARCEL_POSITION_CONTEXT_VERSION,
    propId,
    items: [],
    note: PARCEL_POSITION_CONTEXT_NOTE,
  };
}

function historyYears(history: Array<{ year?: number | null }>): {
  min: number;
  max: number;
  count: number;
} | null {
  const years = history
    .map((h) => (typeof h.year === "number" && Number.isFinite(h.year) ? h.year : null))
    .filter((y): y is number => y != null);
  if (years.length < 2) return null;
  return {
    min: Math.min(...years),
    max: Math.max(...years),
    count: years.length,
  };
}

function projectMatchesFrontage(
  project: TxdotProject,
  position: ParcelPositionRecord,
): boolean {
  const roads = [position.primary?.road, position.secondary?.road].filter(
    Boolean,
  ) as string[];
  if (!project.highway || roads.length === 0) return false;
  return roads.some((r) => roadsLikelyMatch(project.highway, r));
}

/**
 * Surrounding facts for THIS parcel only.
 * Refuses to attach another property's CAD or neighbor geometry as position.
 */
export function buildParcelPositionContext(opts: {
  propId: string;
  position: ParcelPositionRecord;
  cad: ParcelCadSnapshot;
  projects?: TxdotProject[] | null;
  neighbors?: ParcelNeighborsResult | null;
}): ParcelPositionContext {
  if (opts.position.propId !== opts.propId) {
    return emptyContext(opts.position.propId);
  }

  const items: ParcelContextItem[] = [];
  const road = opts.position.primary?.traffic?.road ?? opts.position.primary?.road;
  const hist = historyYears(opts.position.primary?.traffic?.history ?? []);
  if (road && hist) {
    items.push({
      kind: "traffic_history",
      label: "Published years",
      detail: `${road} has ${hist.count} published counts from ${hist.min}–${hist.max}. Same road only — not added to another road.`,
    });
  }

  if (
    opts.cad.propId === opts.propId &&
    typeof opts.cad.legalAcreage === "number" &&
    Number.isFinite(opts.cad.legalAcreage) &&
    opts.cad.legalAcreage > 0
  ) {
    items.push({
      kind: "cad_size",
      label: "CAD size",
      detail: `CAD lists ${opts.cad.legalAcreage.toLocaleString("en-US", {
        maximumFractionDigits: 1,
      })} acres on this parcel.`,
    });
  }

  const matched = (opts.projects ?? [])
    .filter((p) => projectMatchesFrontage(p, opts.position))
    .slice(0, MAX_PROJECTS);
  for (const p of matched) {
    const hwy = p.highway ?? "a mapped highway";
    const phase = p.phase || p.status;
    items.push({
      kind: "txdot_project",
      label: "Public project",
      detail: `TxDOT lists work on ${hwy}${
        phase ? ` (${phase})` : ""
      }. Public planning record — not a guarantee this site is affected.`,
    });
  }

  const nbr = opts.neighbors;
  if (
    nbr?.available &&
    nbr.subjectPropId === opts.propId &&
    nbr.sameOwnerExactCount > 0
  ) {
    items.push({
      kind: "same_owner_adjoining",
      label: "Same owner nearby",
      detail: `${nbr.sameOwnerExactCount} CAD neighbor${
        nbr.sameOwnerExactCount === 1 ? "" : "s"
      } share this owner id (touches or near). Not a survey. Not assemblage advice.`,
    });
  }

  return {
    scope: "surrounding",
    contextVersion: PARCEL_POSITION_CONTEXT_VERSION,
    propId: opts.propId,
    items,
    note: PARCEL_POSITION_CONTEXT_NOTE,
  };
}

/** Client-side: add neighbor context without refetching the rest. */
export function withNeighborContext(
  context: ParcelPositionContext | null | undefined,
  neighbors: ParcelNeighborsResult | null | undefined,
  propId: string,
): ParcelPositionContext {
  const base = context ?? emptyContext(propId);
  if (base.propId !== propId) return base;
  const items = base.items.filter((i) => i.kind !== "same_owner_adjoining");
  if (
    neighbors?.available &&
    neighbors.subjectPropId === propId &&
    neighbors.sameOwnerExactCount > 0
  ) {
    items.push({
      kind: "same_owner_adjoining",
      label: "Same owner nearby",
      detail: `${neighbors.sameOwnerExactCount} CAD neighbor${
        neighbors.sameOwnerExactCount === 1 ? "" : "s"
      } share this owner id (touches or near). Not a survey. Not assemblage advice.`,
    });
  }
  return { ...base, items };
}
