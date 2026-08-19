import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cadCoverageHonesty } from "@/lib/shi/county-ops-scale";

const SELECT_FULL =
  "source, county_fips, county_name, ingest_mode, last_success_at, last_attempt_at, last_error, parcel_count, db_parcel_count, source_unique_prop_ids, source_feature_count, last_audit_at, absence_cap_hit, ingest_capped, real_count, personal_count, mh_serial_count, refresh_interval_hours, source_url, notes";

const SELECT_LEGACY =
  "source, county_fips, county_name, ingest_mode, last_success_at, last_attempt_at, last_error, parcel_count, real_count, personal_count, mh_serial_count, refresh_interval_hours, source_url, notes";

/**
 * Public CAD refresh status for the launch counties (Wave L4 + ops scale).
 * Backs the listing-form status panel. Coverage honesty — not a dashboard product.
 */
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return NextResponse.json(
      { error: "Supabase is not configured", counties: [] },
      { status: 200 },
    );
  }

  const sb = createClient(url, key, { auth: { persistSession: false } });
  let rows: Record<string, unknown>[] | null = null;
  {
    const full = await sb
      .from("cad_county_status")
      .select(SELECT_FULL)
      .order("county_name");
    if (
      full.error &&
      /db_parcel_count|source_unique_prop_ids|absence_cap_hit|ingest_capped|last_audit_at/i.test(
        full.error.message || "",
      )
    ) {
      const legacy = await sb
        .from("cad_county_status")
        .select(SELECT_LEGACY)
        .order("county_name");
      if (legacy.error) {
        return NextResponse.json(
          { error: legacy.error.message, counties: [] },
          { status: 500 },
        );
      }
      rows = (legacy.data ?? []) as Record<string, unknown>[];
    } else if (full.error) {
      return NextResponse.json(
        { error: full.error.message, counties: [] },
        { status: 500 },
      );
    } else {
      rows = (full.data ?? []) as Record<string, unknown>[];
    }
  }

  const now = Date.now();
  const counties = (rows ?? []).map((r) => {
    const windowH = Number(r.refresh_interval_hours ?? 72);
    const last = r.last_success_at
      ? new Date(String(r.last_success_at)).getTime()
      : null;
    const ageHours = last == null ? null : (now - last) / 3600000;
    const coverage = cadCoverageHonesty({
      parcelCount: Number(r.parcel_count ?? 0),
      dbParcelCount:
        r.db_parcel_count == null ? null : Number(r.db_parcel_count),
      sourceUniquePropIds:
        r.source_unique_prop_ids == null
          ? null
          : Number(r.source_unique_prop_ids),
      sourceFeatureCount:
        r.source_feature_count == null
          ? null
          : Number(r.source_feature_count),
      absenceCapHit: Boolean(r.absence_cap_hit),
      ingestCapped: Boolean(r.ingest_capped),
    });
    return {
      ...r,
      stale: ageHours == null || ageHours >= windowH,
      ageHours,
      coverage: coverage.coverage,
      coverageLine: coverage.line,
      displayParcelCount: coverage.displayCount,
    };
  });

  return NextResponse.json({
    refreshIntervalHours: 72,
    counties,
  });
}
