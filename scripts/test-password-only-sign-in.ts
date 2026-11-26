/**
 * Sign-in is email + password only. No account is asked to set up or enter a
 * 2FA code, and sensitive account changes re-check the password instead.
 * Run: node --import ./scripts/story-ts-alias.mjs --experimental-strip-types scripts/test-password-only-sign-in.ts
 */
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import {
  STORY_PRO_SETTINGS_BLOCKED,
  canAccessPrivateApp,
  canEditStoryProSettings,
  decideReadiness,
} from "../src/lib/account/assurance.ts";
import {
  parseSettingsSearch,
  resolveSettingsLocation,
} from "../src/lib/account/settings-nav.ts";
import { settingsCapabilities } from "../src/lib/account/settings-capabilities.ts";

const root = process.cwd();
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return /\.(ts|tsx)$/.test(name) ? [full] : [];
  });
}

const twoFactor =
  /auth\.mfa\b|AuthenticatorAssurance|\baal[12]?\b|needs_mfa|setup=mfa|pending=mfa|MfaChallenge|requireStepUpIfEnrolled|readSessionAssurance|mfaRequired|authenticator/i;
for (const file of sourceFiles(join(root, "src"))) {
  const rel = relative(root, file);
  assert.doesNotMatch(read(rel), twoFactor, `${rel} still mentions 2FA`);
}

for (const gone of [
  "src/components/auth/MfaChallengeForm.tsx",
  "src/app/api/account/mfa/unenroll/route.ts",
]) {
  assert.equal(existsSync(join(root, gone)), false, `${gone} should be removed`);
}

for (const purpose of ["individual_pro", "managing_broker", "consumer"] as const) {
  const ready = decideReadiness({ signedIn: true, emailConfirmed: true, nextPath: "/portal" });
  assert.equal(ready.ok, true, `${purpose} with a confirmed email is ready without a code`);
  assert.equal(ready.redirectTo, null);
  assert.equal(
    canEditStoryProSettings({ emailConfirmed: true, purpose }),
    purpose !== "consumer",
  );
}
assert.equal(canAccessPrivateApp({ emailConfirmed: false }), false, "email confirmation still gates");
assert.equal(
  canEditStoryProSettings({ emailConfirmed: false, purpose: "individual_pro" }),
  false,
);
assert.equal(STORY_PRO_SETTINGS_BLOCKED, "Confirm your email before Story Pro settings.");

const caps = settingsCapabilities({ purpose: "individual_pro", kind: "agent" });
const oldSetupLink = resolveSettingsLocation(
  parseSettingsSearch(new URLSearchParams("setup=mfa")),
  caps,
);
assert.equal(oldSetupLink.screen, "root", "old authenticator setup links land on Settings");
const oldControlLink = resolveSettingsLocation(
  parseSettingsSearch(new URLSearchParams("category=security&control=authenticator")),
  caps,
);
assert.equal(oldControlLink.control, null);

for (const [route, action] of [
  ["src/app/api/account/change-email/route.ts", "auth.supabase.auth.updateUser({ email })"],
  ["src/app/api/account/change-password/route.ts", "auth.supabase.auth.updateUser({ password: newPassword })"],
  ["src/app/api/account/delete-account/route.ts", "admin.auth.admin.deleteUser(auth.user.id)"],
] as const) {
  const src = read(route);
  const check = src.indexOf("checkCurrentPassword(auth.user.email, currentPassword)");
  const write = src.indexOf(action);
  assert.ok(check > 0, `${route} re-checks the current password`);
  assert.ok(write > check, `${route} checks the password before it changes anything`);
  assert.match(src, /if \(password === "wrong"\)|password === "wrong"/);
}

const signedIn = read("src/lib/account/require-signed-in.ts");
assert.match(signedIn, /createClient\(url, anon, \{ auth: \{ persistSession: false \} \}\)/);
assert.match(signedIn, /signInWithPassword\(\{ email, password \}\)/);

const security = read("src/components/settings/SecuritySection.tsx");
assert.match(security, /JSON\.stringify\(\{ email: newEmail, currentPassword: emailPassword \}\)/);
assert.match(security, /id="sec-email-password"/);
assert.match(security, /id="sec-delete-password"/);

const office = read("src/app/api/account/open-office/route.ts");
assert.match(office, /isEmailConfirmed\(auth\.user\.email_confirmed_at\)/);

for (const layout of ["src/app/portal/layout.tsx", "src/app/office/layout.tsx"]) {
  assert.match(read(layout), /getAccountReadiness\(\{ nextPath: "\/(portal|office)" \}\)/);
}

const mig = read("supabase/migrations/0088_password_only_sign_in.sql");
const fn = mig.slice(
  mig.indexOf("create or replace function public.profiles_lock_privilege_columns()"),
  mig.indexOf("$$;") + 3,
);
assert.doesNotMatch(fn, /aal/i, "the profile lock no longer reads the session level");
assert.match(fn, /email_confirmed_at is not null/);
assert.match(fn, /Confirm your email before Story Pro settings\./);
assert.match(fn, /account_purpose cannot be changed by the client/);
assert.match(fn, /username cannot be changed by the client/);
assert.match(mig, /delete from auth\.mfa_factors/);
assert.doesNotMatch(mig, /delete from public\./i);
assert.doesNotMatch(mig, /delete from auth\.(users|sessions|identities)/i);
assert.doesNotMatch(mig, /ksvllgzsnzyahqsjuove/);

console.log("password-only-sign-in: ok");
