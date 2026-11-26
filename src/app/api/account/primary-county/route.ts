import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { canAccessPrivateApp, isEmailConfirmed } from "@/lib/account/assurance";
import {
  isProfessionalLaunchCountyFips,
  mayHoldRealtorGeography,
} from "@/lib/account/professional-geography";
import { requireSignedIn } from "@/lib/account/require-signed-in";
import { normalizeSupabaseUrl } from "@/lib/supabase/url";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type OwnState = {
  effective_county_fips: string | null;
  pending_county_fips: string | null;
  request_status: string;
  requested_at: string | null;
  decided_at: string | null;
};

function adminClient() {
  const url = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  return url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;
}

function row<T>(data: T | T[] | null): T | null {
  return !data ? null : Array.isArray(data) ? (data[0] ?? null) : data;
}

function shape(state: OwnState | null) {
  return {
    ok: true as const,
    effectiveCountyFips: state?.effective_county_fips ?? null,
    pendingCountyFips: state?.pending_county_fips ?? null,
    requestStatus: state?.request_status ?? "not_set",
    requestedAt: state?.requested_at ?? null,
    decidedAt: state?.decided_at ?? null,
  };
}

async function readOwn(uid: string) {
  const admin = adminClient();
  if (!admin) return NextResponse.json({ ok: false, error: "Unable to load." }, { status: 503 });
  const { data, error } = await admin.rpc("primary_county_own_state", { p_uid: uid });
  if (error) return NextResponse.json({ ok: false, error: "Unable to load." }, { status: 400 });
  return NextResponse.json(shape(row(data as OwnState | OwnState[])));
}

export async function GET() {
  const auth = await requireSignedIn();
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  const { data: profile } = await auth.supabase
    .from("profiles")
    .select("account_purpose")
    .eq("id", auth.user.id)
    .maybeSingle();
  if (!mayHoldRealtorGeography(profile?.account_purpose)) {
    return NextResponse.json({ ok: false, error: "Not available." }, { status: 403 });
  }
  return readOwn(auth.user.id);
}

export async function POST(request: Request) {
  const auth = await requireSignedIn();
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  const { data: profile } = await auth.supabase
    .from("profiles")
    .select("account_purpose")
    .eq("id", auth.user.id)
    .maybeSingle();
  if (!mayHoldRealtorGeography(profile?.account_purpose)) {
    return NextResponse.json({ ok: false, error: "Not available." }, { status: 403 });
  }
  if (!canAccessPrivateApp({ emailConfirmed: isEmailConfirmed(auth.user.email_confirmed_at) })) {
    return NextResponse.json(
      { ok: false, error: "Confirm your email first.", code: "needs_email" },
      { status: 403 },
    );
  }
  let fips = "";
  try {
    const body = (await request.json()) as { countyFips?: unknown };
    fips = typeof body.countyFips === "string" ? body.countyFips.trim() : "";
  } catch {
    fips = "";
  }
  if (!isProfessionalLaunchCountyFips(fips)) {
    return NextResponse.json({ ok: false, error: "County is not available." }, { status: 400 });
  }
  const admin = adminClient();
  if (!admin) return NextResponse.json({ ok: false, error: "Unable to request." }, { status: 503 });
  const { data, error } = await admin.rpc("request_primary_county", {
    p_uid: auth.user.id,
    p_fips: fips,
  });
  const result = row(data as { ok: boolean; error_code: string | null }[]);
  if (error || !result?.ok) {
    return NextResponse.json(
      { ok: false, error: "Unable to request.", code: result?.error_code ?? "denied" },
      { status: 400 },
    );
  }
  return readOwn(auth.user.id);
}
