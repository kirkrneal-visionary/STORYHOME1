/**
 * Wave 1 account purpose, binding, and lock evidence.
 * Run: node --experimental-strip-types scripts/test-accounts-wave-1.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  approvalBindingHolds,
  mayManageBrokerage,
  mayUseStoryPro,
  purposeAfterSignup,
  purposeAfterTrecPromote,
} from "../src/lib/account/purpose.ts";

const root = process.cwd();
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

assert.equal(purposeAfterSignup("inspector"), "other_professional");
assert.equal(purposeAfterSignup("appraiser"), "other_professional");
assert.equal(purposeAfterSignup("lender"), "other_professional");
assert.equal(purposeAfterSignup("realtor_broker"), "consumer");
assert.equal(purposeAfterSignup(null), "consumer");

assert.equal(purposeAfterTrecPromote("consumer"), "individual_pro");
assert.equal(purposeAfterTrecPromote("individual_pro"), "individual_pro");
assert.equal(purposeAfterTrecPromote("other_professional"), null);
assert.equal(purposeAfterTrecPromote("managing_broker"), null);

assert.equal(mayUseStoryPro("individual_pro", "agent"), true);
assert.equal(mayUseStoryPro("individual_pro", "broker"), true);
assert.equal(mayUseStoryPro("managing_broker", "broker"), true);
assert.equal(mayUseStoryPro("other_professional", "pro"), false);
assert.equal(mayUseStoryPro("consumer", "consumer"), false);
assert.equal(mayManageBrokerage("managing_broker"), true);
assert.equal(mayManageBrokerage("individual_pro"), false);

assert.equal(
  approvalBindingHolds(
    { legalName: "Jane Q Public", license: "123-SA", purpose: "individual_pro" },
    { legalName: "Jane Q Public", license: "123-SA", purpose: "individual_pro" },
  ),
  true,
);
assert.equal(
  approvalBindingHolds(
    { legalName: "Jane Other", license: "123-SA", purpose: "individual_pro" },
    { legalName: "Jane Q Public", license: "123-SA", purpose: "individual_pro" },
  ),
  false,
);
assert.equal(
  approvalBindingHolds(
    { legalName: "Jane Q Public", license: "999-SA", purpose: "individual_pro" },
    { legalName: "Jane Q Public", license: "123-SA", purpose: "individual_pro" },
  ),
  false,
);
assert.equal(
  approvalBindingHolds(
    { legalName: "Jane Q Public", license: "123-SA", purpose: "managing_broker" },
    { legalName: "Jane Q Public", license: "123-SA", purpose: "individual_pro" },
  ),
  false,
);
assert.equal(
  approvalBindingHolds(
    { legalName: "Display Only", license: "123-SA", purpose: "individual_pro" },
    null,
  ),
  true,
);

const mig = read("supabase/migrations/0048_account_purpose_wave1.sql");
assert.match(mig, /account_purpose/);
assert.match(mig, /legal_full_name/);
assert.match(mig, /verified_license/);
assert.match(mig, /is_individual_pro/);
assert.match(mig, /is_managing_broker/);
assert.match(mig, /Ignores account_kind, account_purpose/);
assert.match(mig, /revoke select on table public.profiles/);
assert.match(mig, /grant select \(/);
assert.doesNotMatch(mig, /grant select \([\s\S]*\bemail\b/i);
assert.match(mig, /and public.is_individual_pro\(auth.uid\(\)\)/);
assert.match(mig, /brokerage_id cannot be changed by the client/);
assert.match(mig, /create_managed_brokerage/);
assert.doesNotMatch(mig, /delete from public\.(profiles|listings|county_parcels)/i);
assert.doesNotMatch(mig, /set account_purpose = 'managing_broker'/);

const handle = mig.slice(mig.indexOf("create or replace function public.handle_new_user"));
assert.doesNotMatch(handle, /raw_user_meta_data->>'account_kind'/);
assert.doesNotMatch(handle, /raw_user_meta_data->>'account_purpose'/);
assert.doesNotMatch(handle, /raw_user_meta_data->>'trec_status'/);

const promote = read("src/lib/account/promote-pro.ts");
assert.match(promote, /approvalBindingHolds/);
assert.match(promote, /purposeAfterTrecPromote/);
assert.match(promote, /managing_broker/);
assert.match(promote, /demoted/);
assert.doesNotMatch(promote, /account_purpose: \"managing_broker\"/);

const requirePro = read("src/lib/shi/require-pro.ts");
assert.match(requirePro, /mayUseStoryPro/);
assert.match(requirePro, /account_purpose/);

const profile = read("src/lib/supabase/profile.ts");
assert.doesNotMatch(profile, /SELECT =\s*"id, email/);
assert.match(profile, /legal_full_name/);
assert.match(profile, /account_purpose/);

const auth = read("src/components/AuthContext.tsx");
assert.match(auth, /account_kind: "consumer"/);
assert.match(auth, /account_purpose/);

const settings = read("src/components/settings/SettingsView.tsx");
assert.match(settings, /mayManageBrokerage/);
assert.match(settings, /Display name/);
assert.match(settings, /Legal name on file/);

console.log("accounts-wave-1: ok");
