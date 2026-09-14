import { createClient } from "@supabase/supabase-js";
import {
  approvalBindingHolds,
  lastWord,
  mayUseStoryPro,
  purposeAfterSignup,
  purposeAfterTrecPromote,
  type AccountPurpose,
} from "@/lib/account/purpose";
import { verifyTrecLicense } from "@/lib/trec";
import { getServerSupabase } from "@/lib/supabase/server";
import { normalizeSupabaseUrl } from "@/lib/supabase/url";

export type PromoteProResult =
  | {
      ok: true;
      accountKind: "consumer" | "agent" | "broker";
      accountPurpose: AccountPurpose;
      promoted: boolean;
      demoted: boolean;
    }
  | { ok: false; status: number; error: string };

function serviceRole() {
  const url = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

type ProfileRow = {
  account_kind: string | null;
  account_purpose: string | null;
  professional_role: string | null;
  full_name: string | null;
  legal_full_name: string | null;
  trec_license: string | null;
  verified_legal_name: string | null;
  verified_license: string | null;
  verified_purpose: string | null;
};

function asPurpose(raw: string | null | undefined, professionalRole: string | null): AccountPurpose {
  if (
    raw === "consumer" ||
    raw === "individual_pro" ||
    raw === "managing_broker" ||
    raw === "other_professional"
  ) {
    return raw;
  }
  return purposeAfterSignup(professionalRole);
}

/**
 * Promote a consumer who holds an active TREC license to individual Pro.
 * Office-admin is never granted here. A broken legal-name/license binding
 * drops Story Pro and re-checks Texas.
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
    .select(
      "account_kind, account_purpose, professional_role, full_name, legal_full_name, trec_license, verified_legal_name, verified_license, verified_purpose",
    )
    .eq("id", user.id)
    .maybeSingle();
  if (error) {
    return { ok: false, status: 500, error: "Unable to verify account." };
  }

  const row = (profile ?? {}) as ProfileRow;
  const purpose = asPurpose(row.account_purpose, row.professional_role);
  const kind = (row.account_kind ?? "consumer") as "consumer" | "agent" | "broker";
  const legalName = (row.legal_full_name ?? row.full_name ?? "").trim();
  const license = (row.trec_license ?? "").trim();

  if (purpose === "managing_broker") {
    return {
      ok: true,
      accountKind: kind === "broker" ? "broker" : "consumer",
      accountPurpose: "managing_broker",
      promoted: false,
      demoted: false,
    };
  }

  if (purpose === "other_professional") {
    return {
      ok: true,
      accountKind: "consumer",
      accountPurpose: "other_professional",
      promoted: false,
      demoted: false,
    };
  }

  const bindingOk = approvalBindingHolds(
    { legalName, license, purpose },
    row.verified_license
      ? {
          legalName: row.verified_legal_name ?? "",
          license: row.verified_license,
          purpose: row.verified_purpose ?? "",
        }
      : null,
  );

  if (mayUseStoryPro(purpose, kind) && bindingOk) {
    return {
      ok: true,
      accountKind: kind === "broker" ? "broker" : "agent",
      accountPurpose: "individual_pro",
      promoted: false,
      demoted: false,
    };
  }

  let demoted = false;
  if (mayUseStoryPro(purpose, kind) && !bindingOk) {
    const { error: demoteError } = await admin
      .from("profiles")
      .update({
        account_kind: "consumer",
        account_purpose: "consumer",
        trec_status: null,
        trec_verified_at: null,
        verified_legal_name: null,
        verified_license: null,
        verified_purpose: null,
        verified_account_kind: null,
      })
      .eq("id", user.id);
    if (demoteError) {
      return { ok: false, status: 500, error: "Unable to verify account." };
    }
    demoted = true;
  }

  if (!license) {
    return {
      ok: true,
      accountKind: "consumer",
      accountPurpose: "consumer",
      promoted: false,
      demoted,
    };
  }

  const nextPurpose = purposeAfterTrecPromote(demoted ? "consumer" : purpose);
  if (!nextPurpose) {
    return {
      ok: true,
      accountKind: "consumer",
      accountPurpose: purpose,
      promoted: false,
      demoted,
    };
  }

  let trec;
  try {
    trec = await verifyTrecLicense(license, lastWord(legalName));
  } catch {
    return { ok: false, status: 502, error: "License check failed. Try again." };
  }

  if (!trec.approved || (trec.accountKind !== "agent" && trec.accountKind !== "broker")) {
    return {
      ok: true,
      accountKind: "consumer",
      accountPurpose: "consumer",
      promoted: false,
      demoted,
    };
  }

  const stampedLicense = trec.licenseNumber ?? license;
  const { error: updateError } = await admin
    .from("profiles")
    .update({
      account_kind: trec.accountKind,
      account_purpose: nextPurpose,
      legal_full_name: legalName || row.full_name,
      trec_license: stampedLicense,
      license_number: stampedLicense,
      trec_status: trec.status,
      trec_verified_at: new Date().toISOString(),
      sponsor_license_number: trec.sponsorLicenseNumber,
      sponsor_name: trec.sponsorName,
      verified_legal_name: legalName || row.full_name,
      verified_license: stampedLicense,
      verified_purpose: nextPurpose,
      verified_account_kind: trec.accountKind,
    })
    .eq("id", user.id);
  if (updateError) {
    return { ok: false, status: 500, error: "Unable to finish realtor access." };
  }

  return {
    ok: true,
    accountKind: trec.accountKind,
    accountPurpose: nextPurpose,
    promoted: true,
    demoted,
  };
}
