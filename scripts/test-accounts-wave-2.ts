/**
 * Wave 2 email confirm, recovery, and session gates. Sign-in is email + password only.
 * Run: node --experimental-strip-types scripts/test-accounts-wave-2.ts
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  GENERIC_AUTH_SENT,
  GENERIC_SIGN_IN_ERROR,
  canAccessPrivateApp,
  decideReadiness,
  shouldStayOnLogin,
  signInPublicMessage,
} from "../src/lib/account/assurance.ts";
import { destForUser } from "../src/lib/account/purpose.ts";
import { classifyApiPath } from "../src/lib/security/rate-limit.ts";

const root = process.cwd();
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

assert.equal(canAccessPrivateApp({ emailConfirmed: false }), false);
assert.equal(canAccessPrivateApp({ emailConfirmed: true }), true);

assert.equal(
  shouldStayOnLogin({
    recoveryMode: true,
    pendingEmail: false,
  }),
  true,
);
assert.equal(
  shouldStayOnLogin({
    recoveryMode: false,
    pendingEmail: true,
  }),
  true,
);
assert.equal(
  shouldStayOnLogin({
    recoveryMode: false,
    pendingEmail: false,
  }),
  false,
);

assert.equal(signInPublicMessage("Invalid login credentials"), GENERIC_SIGN_IN_ERROR);
assert.match(signInPublicMessage("Email not confirmed"), /Confirm your email/);
assert.match(GENERIC_AUTH_SENT, /If that account exists/);

assert.equal(destForUser({ kind: "pro", purpose: "individual_pro" }), "/portal");
assert.equal(destForUser({ kind: "broker", purpose: "managing_broker" }), "/office");
assert.equal(destForUser({ kind: "consumer" }), "/home");

assert.equal(
  decideReadiness({ signedIn: false, emailConfirmed: false, nextPath: "/portal" })
    .redirectTo,
  "/login?next=%2Fportal",
);
assert.equal(
  decideReadiness({
    signedIn: true,
    emailConfirmed: false,
    nextPath: "/portal",
  }).reason,
  "email",
);
assert.match(
  decideReadiness({
    signedIn: true,
    emailConfirmed: false,
    nextPath: "/portal",
  }).redirectTo ?? "",
  /pending=email/,
);
const proReady = decideReadiness({
  signedIn: true,
  emailConfirmed: true,
  nextPath: "/portal",
});
assert.equal(proReady.ok, true);
assert.equal(proReady.redirectTo, null);

assert.equal(classifyApiPath("/api/account/change-password"), "medium");
assert.equal(classifyApiPath("/api/account/change-email"), "medium");
assert.equal(classifyApiPath("/api/account/resend-confirmation"), "medium");
assert.equal(classifyApiPath("/api/account/sign-out-all"), "medium");

const login = read("src/components/LoginClient.tsx");
assert.match(login, /shouldStayOnLogin/);
assert.match(login, /get\("mode"\) === "recovery"/);
assert.match(login, /Forgot password/);
assert.match(login, /GENERIC_AUTH_SENT/);
assert.match(login, /PasswordRule/);
assert.doesNotMatch(login, /MfaChallengeForm|setup=mfa|authenticator/i);
assert.doesNotMatch(login, /backup code/i);

const auth = read("src/components/AuthContext.tsx");
assert.match(auth, /resetPasswordForEmail/);
assert.match(auth, /signInPublicMessage/);
assert.match(auth, /email_confirmed_at/);
assert.match(auth, /emailConfirmed && !promoted/);
assert.doesNotMatch(auth, /auth\.mfa|needsMfa|getAuthenticatorAssuranceLevel/);
assert.doesNotMatch(auth, /founder@/i);
assert.doesNotMatch(auth, /backupCodes/);

const mw = read("src/middleware.ts");
assert.match(mw, /email_confirmed_at/);
assert.match(mw, /pending.*email/);
assert.doesNotMatch(mw, /aal|mfa/i);

const layout = read("src/app/portal/layout.tsx");
assert.match(layout, /getAccountReadiness/);
assert.match(layout, /redirectTo/);

const requirePro = read("src/lib/shi/require-pro.ts");
assert.match(requirePro, /decideReadiness/);
assert.match(requirePro, /Finish account security first/);
assert.doesNotMatch(requirePro, /aal|mfa|enrolled/i);

const settings = read("src/components/settings/SettingsView.tsx");
assert.match(settings, /SecuritySection/);
assert.match(settings, /Confirm your email before office tools/);
assert.doesNotMatch(settings, /authenticator/i);

const security = read("src/components/settings/SecuritySection.tsx");
assert.match(security, /Sign out everywhere/);
assert.match(security, /Sign out this device/);
assert.match(security, /Other sessions are not listed/);
assert.doesNotMatch(security, /auth\.mfa|authenticator/i);
assert.doesNotMatch(security, /listSessions/);
assert.doesNotMatch(security, /backupCodes/);

const home = read("src/app/home/page.tsx");
assert.match(home, /canAccessPrivateApp/);
assert.match(home, /Finish signing in/);
assert.doesNotMatch(home, /authenticator|setup=mfa/i);

const signedIn = read("src/lib/account/require-signed-in.ts");
assert.match(signedIn, /export async function checkCurrentPassword/);
assert.match(signedIn, /persistSession: false/);
assert.doesNotMatch(signedIn, /requireStepUpIfEnrolled|aal/);

const changePassword = read("src/app/api/account/change-password/route.ts");
assert.match(changePassword, /checkCurrentPassword/);
assert.match(changePassword, /scope: "others"/);
assert.doesNotMatch(changePassword, /requireStepUpIfEnrolled/);

assert.equal(existsSync(join(root, "src/app/api/account/mfa/unenroll/route.ts")), false);

assert.match(read("src/app/api/account/resend-confirmation/route.ts"), /GENERIC_AUTH_SENT/);
assert.match(read("src/lib/account/notify-security.ts"), /userId \? userId.slice\(0, 8\)/);
assert.doesNotMatch(read("src/lib/account/notify-security.ts"), /Authorization/);

console.log("accounts-wave-2: ok");
