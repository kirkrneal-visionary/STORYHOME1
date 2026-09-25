import { requireSignedIn } from "@/lib/account/require-signed-in";
import { countyStoryPublisherEligible } from "@/lib/county-stories/eligibility";

export async function requireCountyStoryPublisher() {
  const auth = await requireSignedIn();
  if (!auth.ok) return auth;
  const { data: profile } = await auth.supabase
    .from("profiles")
    .select("account_purpose, brokerage_id")
    .eq("id", auth.user.id)
    .maybeSingle();
  if (
    !countyStoryPublisherEligible({
      purpose: profile?.account_purpose,
      brokerageId: profile?.brokerage_id,
    })
  ) {
    return { ok: false as const, status: 403, error: "Not available." };
  }
  return {
    ok: true as const,
    supabase: auth.supabase,
    user: auth.user,
    accountPurpose: profile?.account_purpose ?? null,
  };
}
