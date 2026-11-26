import { NextResponse } from "next/server";
import {
  STORY_PRO_SETTINGS_BLOCKED,
  STORY_PRO_SETTINGS_NOT_THIS_ACCOUNT,
  canEditStoryProSettings,
  holdsRealtorSettingsPurpose,
  isEmailConfirmed,
} from "@/lib/account/assurance";
import { requireSignedIn } from "@/lib/account/require-signed-in";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const auth = await requireSignedIn();
  if (!auth.ok) {
    return NextResponse.json(
      { ok: false, error: auth.error },
      { status: auth.status },
    );
  }

  const { data: profile } = await auth.supabase
    .from("profiles")
    .select("account_purpose")
    .eq("id", auth.user.id)
    .maybeSingle();

  const purpose = profile?.account_purpose ?? null;
  if (!holdsRealtorSettingsPurpose(purpose)) {
    return NextResponse.json(
      { ok: false, error: STORY_PRO_SETTINGS_NOT_THIS_ACCOUNT },
      { status: 403 },
    );
  }
  if (
    !canEditStoryProSettings({
      emailConfirmed: isEmailConfirmed(auth.user.email_confirmed_at),
      purpose,
    })
  ) {
    return NextResponse.json(
      { ok: false, error: STORY_PRO_SETTINGS_BLOCKED },
      { status: 403 },
    );
  }

  let body: {
    primaryMarketCity?: string;
    specialties?: string[];
    serviceAreas?: string[];
    languages?: string[];
    designations?: string[];
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid request." },
      { status: 400 },
    );
  }

  const row: Record<string, unknown> = {};
  if (typeof body.primaryMarketCity === "string") {
    row.primary_market_city = body.primaryMarketCity;
  }
  if (Array.isArray(body.specialties)) row.specialties = body.specialties;
  if (Array.isArray(body.serviceAreas)) row.service_areas = body.serviceAreas;
  if (Array.isArray(body.languages)) row.languages = body.languages;
  if (Array.isArray(body.designations)) row.designations = body.designations;
  if (Object.keys(row).length === 0) {
    return NextResponse.json(
      { ok: false, error: "Nothing to save." },
      { status: 400 },
    );
  }

  const { error } = await auth.supabase
    .from("profiles")
    .update(row)
    .eq("id", auth.user.id);
  if (error) {
    return NextResponse.json(
      { ok: false, error: "Unable to save." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
