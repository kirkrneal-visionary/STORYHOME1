/** Compare CAD parcel fields between successive pulls (ingest-side). */

function normStr(v) {
  if (v == null) return null;
  const t = String(v).trim();
  return t ? t : null;
}

function normNum(v) {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? String(n) : null;
}

const WATCHED = [
  { field: "cad_owner_id", read: (r) => normStr(r?.cad_owner_id) },
  { field: "owner_name", read: (r) => normStr(r?.owner_name) },
  { field: "situs_address", read: (r) => normStr(r?.situs_address) },
  { field: "market_value", read: (r) => normNum(r?.market_value) },
  { field: "legal_acreage", read: (r) => normNum(r?.legal_acreage) },
];

/** @deprecated use parcelFieldsChanged — kept for older imports */
export function ownerFieldsChanged(prev, next) {
  return parcelFieldsChanged(prev, next).filter(
    (d) => d.field === "cad_owner_id" || d.field === "owner_name",
  );
}

export function parcelFieldsChanged(prev, next) {
  const out = [];
  for (const w of WATCHED) {
    const oldValue = w.read(prev);
    const newValue = w.read(next);
    if (oldValue !== newValue && (oldValue || newValue)) {
      out.push({
        field: w.field,
        old_value: oldValue,
        new_value: newValue,
      });
    }
  }
  return out;
}

export const WATCHED_FIELDS = WATCHED.map((w) => w.field);
