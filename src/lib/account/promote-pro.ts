import { createClient } from "@supabase/supabase-js";
import { verifyTrecLicense } from "@/lib/trec";
import { getServerSupabase } from "@/lib/supabase/server";
import { normalizeSupabaseUrl } from "@/lib/supabase/url";

export type PromoteProResult =
  | { ok: true; accountKind: "consumer" | "agent" | "broker"; promoted: boolean }
  | { ok: false; status: number; error: string };

function serviceRole() {
  const url = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

/**
 * If the signed-in user has a claimed TREC license and Texas says it is
 * active, promote consumer → agent/broker. Never trust signup metadata.
 */
export async function promoteSignedInPro(): Promise<PromoteProResult> {
  const supabase = await getServerSupabase();
  if (!supabase) {
    return { ok: false, status: 503, error: "Auth is not configured." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, status: 401, error: "Sign in required." };
  }

  const admin = serviceRole();
  if (!admin) {
    return { ok: false, status: 503, error: "Auth is not configured." };
  }

  const { data: profile, error } = await admin
    .from("profiles")
    .select("account_kind, full_name, trec_license")
    .eq("id", user.id)
    .maybeSingle();
  if (error) {
    return { ok: false, status: 500, error: "Unable to verify account." };
  }

  const current = profile?.account_kind ?? "consumer";
  if (current === "agent" || current === "broker") {
    return { ok: true, accountKind: current, promoted: false };
  }

  const license = (profile?.trec_license ?? "").trim();
  if (!license) {
    return { ok: true, accountKind: "consumer", promoted: false };
  }

  const lastName =
    (profile?.full_name ?? "").trim().split(/\s+/).slice(-1)[0] || undefined;
  let trec;
  try {
    trec = await verifyTrecLicense(license, lastName);
  } catch {
    return { ok: false, status: 502, error: "License check failed. Try again." };
  }

  if (!trec.approved || (trec.accountKind !== "agent" && trec.accountKind !== "broker")) {
    return { ok: true, accountKind: "consumer", promoted: false };
  }

  const { error: updateError } = await admin
    .from("profiles")
    .update({
      account_kind: trec.accountKind,
      trec_license: trec.licenseNumber ?? license,
      license_number: trec.licenseNumber ?? license,
      trec_status: trec.status,
      trec_verified_at: new Date().toISOString(),
      sponsor_license_number: trec.sponsorLicenseNumber,
      sponsor_name: trec.sponsorName,
    })
    .eq("id", user.id);
  if (updateError) {
    return { ok: false, status: 500, error: "Unable to finish realtor access." };
  }

  return { ok: true, accountKind: trec.accountKind, promoted: true };
}
