/**
 * Ownership Stability Index — explainable CAD observation signal.
 *
 * High ≈ quiet / stable observed owner fields across CAD pulls.
 * Low ≈ more observed owner-id / owner-name changes.
 *
 * NOT a credit score. NOT a prediction the owner will sell.
 * NOT deed / sale history — only what Archie saw change between county loads.
 */

export type OwnershipChurnBand = "quiet" | "some_movement" | "active" | "building";

export type OwnershipChangeEvent = {
  field: string;
  oldValue: string | null;
  newValue: string | null;
  observedAt: string;
};

export type OwnershipChurnSignal = {
  /** Familiar 300–850 scale; null while history is still building. */
  index: number | null;
  band: OwnershipChurnBand;
  bandLabel: string;
  ownerChangeCount: number;
  trackingSince: string | null;
  lastOwnerChangeAt: string | null;
  reasons: string[];
  note: string;
};

const NOTE =
  "Ownership Stability Index reflects how often Archie saw CAD owner fields change between county file loads. It is not a credit score, not deed history, and not a prediction the owner will sell.";

export function computeOwnershipChurnSignal(opts: {
  firstSeenAt: string | null;
  lastSeenAt: string | null;
  ownerEvents: OwnershipChangeEvent[];
}): OwnershipChurnSignal {
  const ownerEvents = opts.ownerEvents.filter(
    (e) => e.field === "cad_owner_id" || e.field === "owner_name",
  );
  // Count distinct observation moments (one pull can emit both id + name).
  const moments = new Set(ownerEvents.map((e) => e.observedAt.slice(0, 19)));
  const changeCount = moments.size;
  const lastOwnerChangeAt =
    ownerEvents.length > 0
      ? ownerEvents
          .map((e) => e.observedAt)
          .sort()
          .at(-1) ?? null
      : null;

  if (!opts.firstSeenAt && changeCount === 0) {
    return {
      index: null,
      band: "building",
      bandLabel: "Building history",
      ownerChangeCount: 0,
      trackingSince: null,
      lastOwnerChangeAt: null,
      reasons: [
        "Archie has not started observation tracking for this parcel yet. Apply migration 0027 and refresh CAD.",
      ],
      note: NOTE,
    };
  }

  let index: number;
  let band: OwnershipChurnBand;
  let bandLabel: string;
  const reasons: string[] = [];

  if (changeCount === 0) {
    index = 820;
    band = "quiet";
    bandLabel = "Quiet · stable owner fields";
    reasons.push(
      "No owner-id or owner-name changes observed between CAD pulls since tracking began.",
    );
  } else if (changeCount === 1) {
    index = 680;
    band = "some_movement";
    bandLabel = "Some movement";
    reasons.push("1 observed owner-field change across CAD pulls.");
  } else if (changeCount === 2) {
    index = 560;
    band = "some_movement";
    bandLabel = "Some movement";
    reasons.push("2 observed owner-field changes across CAD pulls.");
  } else {
    index = Math.max(320, 520 - (changeCount - 3) * 40);
    band = "active";
    bandLabel = "Active observed owner changes";
    reasons.push(
      `${changeCount} observed owner-field changes across CAD pulls.`,
    );
  }

  if (opts.firstSeenAt) {
    reasons.push(`Tracking since ${formatDay(opts.firstSeenAt)}.`);
  }
  if (lastOwnerChangeAt) {
    reasons.push(`Last owner-field change observed ${formatDay(lastOwnerChangeAt)}.`);
  }
  reasons.push(
    "Deed sale dates are not in CAD pulls — Archie only compares successive file loads.",
  );

  return {
    index,
    band,
    bandLabel,
    ownerChangeCount: changeCount,
    trackingSince: opts.firstSeenAt,
    lastOwnerChangeAt,
    reasons,
    note: NOTE,
  };
}

function formatDay(iso: string | null | undefined) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

export function ownerFieldsChanged(
  prev: { cad_owner_id?: string | null; owner_name?: string | null },
  next: { cad_owner_id?: string | null; owner_name?: string | null },
): Array<{ field: "cad_owner_id" | "owner_name"; oldValue: string | null; newValue: string | null }> {
  const out: Array<{
    field: "cad_owner_id" | "owner_name";
    oldValue: string | null;
    newValue: string | null;
  }> = [];
  const prevId = norm(prev.cad_owner_id);
  const nextId = norm(next.cad_owner_id);
  const prevName = norm(prev.owner_name);
  const nextName = norm(next.owner_name);
  if (prevId !== nextId && (prevId || nextId)) {
    out.push({
      field: "cad_owner_id",
      oldValue: prevId,
      newValue: nextId,
    });
  }
  if (prevName !== nextName && (prevName || nextName)) {
    out.push({
      field: "owner_name",
      oldValue: prevName,
      newValue: nextName,
    });
  }
  return out;
}

function norm(v: string | null | undefined) {
  if (v == null) return null;
  const t = String(v).trim();
  return t ? t : null;
}
