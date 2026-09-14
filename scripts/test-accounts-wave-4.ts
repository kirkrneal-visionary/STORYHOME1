/**
 * Wave 4: prove the account stack. Does not go live.
 * Run: node --experimental-strip-types scripts/test-accounts-wave-4.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  canAccessPrivateApp,
  decideReadiness,
  GENERIC_AUTH_SENT,
  mfaRequired,
  shouldStayOnLogin,
} from "../src/lib/account/assurance.ts";
import {
  ACCOUNT_STACK_MIGRATIONS,
  ACCOUNT_STACK_PROOF,
  GO_LIVE_BLOCKED,
  mayAutoGoLive,
} from "../src/lib/account/go-live-ready.ts";
import {
  listSecurityNotices,
  noticeLabel,
  notifySecurityChange,
  recordSecurityNotice,
  resetSecurityInboxForTests,
} from "../src/lib/account/notify-security.ts";
import {
  canOpenOfficeAccount,
  destForUser,
  mayManageBrokerage,
  mayUseStoryPro,
  purposeAfterTrecPromote,
} from "../src/lib/account/purpose.ts";
import { officePageAccess } from "../src/lib/account/office-gate.ts";
import { classifyApiPath } from "../src/lib/security/rate-limit.ts";

const root = process.cwd();
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

assert.equal(mayAutoGoLive(), false);
assert.equal(ACCOUNT_STACK_PROOF.autoGoLive, false);
assert.match(GO_LIVE_BLOCKED, /separate human step/);
assert.deepEqual(ACCOUNT_STACK_MIGRATIONS, [
  "0048_account_purpose_wave1.sql",
  "0049_open_office_account.sql",
]);

assert.equal(purposeAfterTrecPromote("managing_broker"), null);
assert.equal(mayUseStoryPro("managing_broker", "broker"), false);
assert.equal(mayManageBrokerage("managing_broker"), true);
assert.equal(canOpenOfficeAccount("individual_pro", "broker"), true);
assert.equal(destForUser({ kind: "broker", purpose: "managing_broker" }), "/office");
assert.equal(destForUser({ kind: "pro", purpose: "individual_pro" }), "/portal");
assert.equal(officePageAccess({ signedIn: true, purpose: "individual_pro" }), "refuse");

assert.equal(mfaRequired("individual_pro", "agent"), true);
assert.equal(mfaRequired("consumer", "consumer"), false);
assert.equal(
  canAccessPrivateApp({
    emailConfirmed: false,
    purpose: "individual_pro",
    kind: "agent",
    enrolled: true,
    currentAal: "aal2",
  }),
  false,
);
assert.equal(
  decideReadiness({
    signedIn: true,
    emailConfirmed: true,
    purpose: "individual_pro",
    kind: "agent",
    enrolled: true,
    currentAal: "aal1",
    nextPath: "/portal",
  }).reason,
  "mfa_challenge",
);
assert.equal(
  shouldStayOnLogin({
    recoveryMode: true,
    pendingEmail: false,
    pendingMfa: false,
  }),
  true,
);
assert.match(GENERIC_AUTH_SENT, /If that account exists/);

resetSecurityInboxForTests();
notifySecurityChange("password_changed", "abcdefgh-1111");
notifySecurityChange("office_opened", "abcdefgh-1111");
notifySecurityChange("mfa_enrolled", "zzzzzzzz-9999");
const mine = listSecurityNotices("abcdefgh-1111");
assert.equal(mine.length, 2);
assert.equal(mine[0].kind, "office_opened");
assert.equal(noticeLabel("office_opened"), "This login became the office account");
assert.equal(listSecurityNotices("zzzzzzzz-9999").length, 1);
recordSecurityNotice("confirmation_resent", "abcdefgh-1111");
assert.equal(listSecurityNotices("abcdefgh-1111").length, 3);

assert.equal(classifyApiPath("/api/account/security-notices"), "medium");
assert.equal(classifyApiPath("/api/account/open-office"), "medium");
assert.equal(classifyApiPath("/api/account/change-password"), "medium");

for (const file of ACCOUNT_STACK_MIGRATIONS) {
  const sql = read(`supabase/migrations/${file}`);
  assert.doesNotMatch(sql, /delete from public\.(profiles|listings|county_parcels)/i);
  assert.doesNotMatch(sql, /CLIENTSAGENTS/i);
}

const proof = read("audit/ACCOUNTS-WAVE-4-PROOF.md");
assert.match(proof, /not live/i);
assert.match(proof, /Go-live is not automatic|does not ship itself/);
assert.match(proof, /test:accounts/);
assert.doesNotMatch(proof, /ksvllgzsnzyahqsjuove/);
assert.doesNotMatch(proof, /eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9/);

const inboxUi = read("src/components/settings/SecuritySection.tsx");
assert.match(inboxUi, /Live email is not sent from here/);
assert.match(inboxUi, /security-notices/);

const notify = read("src/lib/account/notify-security.ts");
assert.match(notify, /recordSecurityNotice/);
assert.match(notify, /userId \? userId.slice\(0, 8\)/);

const goLive = read("src/lib/account/go-live-ready.ts");
assert.match(goLive, /return false/);
assert.doesNotMatch(goLive, /vercel deploy|production reset/i);

console.log("accounts-wave-4: ok");
