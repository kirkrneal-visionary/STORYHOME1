/**
 * Account self-delete + hide profile email.
 * Run: node --experimental-strip-types scripts/test-accounts-delete-hide-email.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  confirmMatches,
  DELETE_CONFIRM_WORD,
  deleteWarning,
} from "../src/lib/account/delete-account.ts";
import { noticeLabel } from "../src/lib/account/notify-security.ts";
import { classifyApiPath } from "../src/lib/security/rate-limit.ts";

const root = process.cwd();
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

assert.equal(DELETE_CONFIRM_WORD, "DELETE");
assert.equal(confirmMatches("DELETE"), true);
assert.equal(confirmMatches(" delete "), true);
assert.equal(confirmMatches("delete"), true);
assert.equal(confirmMatches("DEL"), false);
assert.equal(confirmMatches(""), false);
assert.match(deleteWarning("consumer"), /County records stay/);
assert.doesNotMatch(deleteWarning("consumer"), /office login/);
assert.match(deleteWarning("managing_broker"), /office login/);
assert.equal(noticeLabel("account_deleted"), "Account deleted");

assert.equal(classifyApiPath("/api/account/delete-account"), "medium");

const api = read("src/app/api/account/delete-account/route.ts");
assert.match(api, /admin\.deleteUser/);
assert.match(api, /tombstone_account_usernames/);
assert.match(api, /requireStepUpIfEnrolled/);
assert.match(api, /confirmMatches/);
assert.match(api, /signInWithPassword/);
assert.doesNotMatch(api, /county_parcels/);
assert.doesNotMatch(api, /CLIENTSAGENTS/i);

const ui = read("src/components/settings/SecuritySection.tsx");
assert.match(ui, /Delete account/);
assert.match(ui, /Delete this account/);
assert.match(ui, /delete-account/);
assert.match(ui, /deleteWarning/);
assert.match(ui, /Living email is not sent from here|Live email is not sent from here/);

const sql = read("supabase/migrations/0050_hide_profile_email.sql");
assert.match(sql, /add column if not exists living_mark_video_url/);
assert.match(sql, /revoke select on table public.profiles/);
assert.match(sql, /grant select \(/);
assert.doesNotMatch(sql, /grant select \([\s\S]*\bemail\b/i);
assert.doesNotMatch(sql, /delete from public\.(profiles|listings|county_parcels)/i);
assert.doesNotMatch(sql, /CLIENTSAGENTS/i);
assert.match(sql, /legal_full_name/);
assert.match(sql, /account_purpose/);

const profile = read("src/lib/supabase/profile.ts");
assert.doesNotMatch(profile, /SELECT =\s*"id, email/);

console.log("accounts-delete-hide-email: ok");
