import type { SupabaseClient } from "@supabase/supabase-js";

export type CountyChangeEvent = {
  id: number;
  source: string;
  propId: string;
  field: string;
  oldValue: string | null;
  newValue: string | null;
  observedAt: string;
  fieldLabel: string;
  summary: string;
};

const FIELD_LABEL: Record<string, string> = {
  cad_owner_id: "Owner id",
  owner_name: "Owner name",
  situs_address: "Site address",
  market_value: "Market value",
  legal_acreage: "Acreage",
  presence: "Presence in CAD pull",
};

function fieldLabel(field: string) {
  return FIELD_LABEL[field] ?? field;
}

function summarize(ev: {
  field: string;
  old_value: string | null;
  new_value: string | null;
}): string {
  if (ev.field === "presence") {
    if (ev.new_value === "absent") {
      return "Missing from latest full-county CAD pull (Archie marked absent)";
    }
    if (ev.new_value === "present") {
      return "Seen again in a CAD pull after being marked absent";
    }
  }
  const from = ev.old_value || "empty";
  const to = ev.new_value || "empty";
  return `${fieldLabel(ev.field)}: ${from} → ${to}`;
}

/**
 * County observation change feed — Archie-detected CAD field diffs.
 * Never claims deed / sale dates.
 */
export async function listCountyChanges(
  supabase: SupabaseClient,
  opts: {
    source: string;
    limit?: number;
    since?: string | null;
    field?: string | null;
  },
): Promise<CountyChangeEvent[]> {
  const source = opts.source.trim();
  if (!source) throw new Error("County source is required");
  const limit = Math.min(Math.max(opts.limit ?? 40, 1), 100);

  let q = supabase
    .from("county_parcel_change_events")
    .select("id, source, prop_id, field, old_value, new_value, observed_at")
    .eq("source", source)
    .order("observed_at", { ascending: false })
    .limit(limit);

  if (opts.since) q = q.gte("observed_at", opts.since);
  if (opts.field) q = q.eq("field", opts.field);

  const { data, error } = await q;
  if (error) {
    if (/does not exist|county_parcel_change_events/i.test(error.message)) {
      return [];
    }
    throw new Error(error.message);
  }

  return (data ?? []).map((r: Record<string, unknown>) => {
    const field = String(r.field);
    const oldValue = (r.old_value as string | null) ?? null;
    const newValue = (r.new_value as string | null) ?? null;
    return {
      id: Number(r.id),
      source: String(r.source),
      propId: String(r.prop_id),
      field,
      oldValue,
      newValue,
      observedAt: String(r.observed_at),
      fieldLabel: fieldLabel(field),
      summary: summarize({
        field,
        old_value: oldValue,
        new_value: newValue,
      }),
    };
  });
}
