import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { canAccessPrivateApp } from "@/lib/account/assurance";
import {
  isProfessionalLaunchCountyFips,
  mayHoldRealtorGeography,
} from "@/lib/account/professional-geography";
import { readSessionAssurance } from "@/lib/account/require-account-ready";
import { requireSignedIn } from "@/lib/account/require-signed-in";
import { normalizeSupabaseUrl } from "@/lib/supabase/url";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function adminClient() {
  const url = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  return url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;
}

function row<T>(data: T | T[] | null): T | null {
  return !data ? null : Array.isArray(data) ? (data[0] ?? null) : data;
}

function parseFips(body: unknown): string[] | null {
  if (!body || typeof body !== "object") return null;
  const raw = (body as { serviceCountyFips?: unknown }).serviceCountyFips;
  if (!Array.isArray(raw)) return null;
  const out: string[] = [];
  for (const item of raw) {
    if (typeof item !== "string") return null;
    const fips = item.trim();
    if (!isProfessionalLaunchCountyFips(fips)) return null;
    if (!out.includes(fips)) out.push(fips);
  }
  return out;
}

async function readOwn(uid: string) {
  const admin = adminClient();
  if (!admin) return NextResponse.json({ ok: false, error: "Unable to load." }, { status: 503 });
  const { data, error } = await admin.rpc("service_counties_own_state", { p_uid: uid });
  const state = row(data as { county_fips: string[] } | { county_fips: string[] }[]);
  if (error) return NextResponse.json({ ok: false, error: "Unable to load." }, { status: 400 });
  return NextResponse.json({ ok: true, serviceCountyFips: state?.county_fips ?? [] });
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
  const session = await readSessionAssurance(auth.supabase);
  const { data: profile } = await auth.supabase
    .from("profiles")
    .select("account_kind, account_purpose")
    .eq("id", auth.user.id)
    .maybeSingle();
  if (!mayHoldRealtorGeography(profile?.account_purpose)) {
    return NextResponse.json({ ok: false, error: "Not available." }, { status: 403 });
  }
  if (
    !canAccessPrivateApp({
      emailConfirmed: session.emailConfirmed,
      purpose: profile?.account_purpose,
      kind: profile?.account_kind,
      enrolled: session.enrolled,
      currentAal: session.currentAal,
    })
  ) {
    return NextResponse.json(
      { ok: false, error: "Confirm your email and authenticator first.", code: "needs_mfa" },
      { status: 403 },
    );
  }
  let fips: string[] | null = null;
  try {
    fips = parseFips(await request.json());
  } catch {
    fips = null;
  }
  if (!fips) return NextResponse.json({ ok: false, error: "County is not available." }, { status: 400 });
  const admin = adminClient();
  if (!admin) return NextResponse.json({ ok: false, error: "Unable to save." }, { status: 503 });
  const { data, error } = await admin.rpc("set_service_counties", {
    p_uid: auth.user.id,
    p_fips: fips,
  });
  const result = row(data as { ok: boolean; error_code: string | null; county_fips: string[] }[]);
  if (error || !result?.ok) {
    return NextResponse.json(
      { ok: false, error: "Unable to save.", code: result?.error_code ?? "denied" },
      { status: 400 },
    );
  }
  return NextResponse.json({ ok: true, serviceCountyFips: result.county_fips ?? [] });
}
