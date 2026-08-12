/** Compare CAD owner fields between successive pulls (ingest-side). */

function norm(v) {
  if (v == null) return null;
  const t = String(v).trim();
  return t ? t : null;
}

export function ownerFieldsChanged(prev, next) {
  const out = [];
  const prevId = norm(prev?.cad_owner_id);
  const nextId = norm(next?.cad_owner_id);
  const prevName = norm(prev?.owner_name);
  const nextName = norm(next?.owner_name);
  if (prevId !== nextId && (prevId || nextId)) {
    out.push({
      field: "cad_owner_id",
      old_value: prevId,
      new_value: nextId,
    });
  }
  if (prevName !== nextName && (prevName || nextName)) {
    out.push({
      field: "owner_name",
      old_value: prevName,
      new_value: nextName,
    });
  }
  return out;
}
