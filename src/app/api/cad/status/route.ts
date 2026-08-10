import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Public CAD refresh status for the launch counties (Wave L4).
 * Backs the listing-form status panel and ops dashboards.
 */
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return NextResponse.json(
      { error: "Supabase is not configured", counties: [] },
      { status: 200 },
    );
  }

  const sb = createClient(url, key, { auth: { persistSession: false } });
  const { data, error } = await sb
    .from("cad_county_status")
    .select(
      "source, county_fips, county_name, ingest_mode, last_success_at, last_attempt_at, last_error, parcel_count, real_count, personal_count, mh_serial_count, refresh_interval_hours, source_url, notes",
    )
    .order("county_name");

  if (error) {
    return NextResponse.json({ error: error.message, counties: [] }, { status: 500 });
  }

  const now = Date.now();
  const counties = (data ?? []).map((r) => {
    const windowH = r.refresh_interval_hours ?? 72;
    const last = r.last_success_at
      ? new Date(r.last_success_at).getTime()
      : null;
    const ageHours = last == null ? null : (now - last) / 3600000;
    return {
      ...r,
      stale: ageHours == null || ageHours >= windowH,
      ageHours,
    };
  });

  return NextResponse.json({
    refreshIntervalHours: 72,
    counties,
  });
}
