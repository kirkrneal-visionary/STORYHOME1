/**
 * Wave 2 email confirm, MFA, recovery, and session gates.
 * Run: node --experimental-strip-types scripts/test-accounts-wave-2.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  GENERIC_AUTH_SENT,
  GENERIC_SIGN_IN_ERROR,
  canAccessPrivateApp,
  decideReadiness,
  mfaRequired,
  needsMfaChallenge,
  needsMfaEnrollment,
  shouldStayOnLogin,
  signInPublicMessage,
} from "../src/lib/account/assurance.ts";
import { destForUser } from "../src/lib/account/purpose.ts";
import { classifyApiPath } from "../src/lib/security/rate-limit.ts";

const root = process.cwd();
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

assert.equal(mfaRequired("individual_pro", "agent"), true);
assert.equal(mfaRequired("managing_broker", "broker"), true);
assert.equal(mfaRequired("consumer", "consumer"), false);
assert.equal(mfaRequired("other_professional", "pro"), false);
assert.equal(mfaRequired(null, "agent"), true);
assert.equal(mfaRequired(null, "consumer"), false);

assert.equal(
  needsMfaEnrollment({
    purpose: "individual_pro",
    kind: "agent",
    enrolled: false,
  }),
  true,
);
assert.equal(
  needsMfaEnrollment({
    purpose: "consumer",
    kind: "consumer",
    enrolled: false,
  }),
  false,
);
assert.equal(
  needsMfaChallenge({
    purpose: "individual_pro",
    kind: "agent",
    enrolled: true,
    currentAal: "aal1",
  }),
  true,
);
assert.equal(
  needsMfaChallenge({
    purpose: "individual_pro",
    kind: "agent",
    enrolled: true,
    currentAal: "aal2",
  }),
  false,
);
assert.equal(
  needsMfaChallenge({
    purpose: "individual_pro",
    kind: "agent",
    enrolled: false,
    currentAal: "aal1",
  }),
  false,
);

assert.equal(
  canAccessPrivateApp({
    emailConfirmed: false,
    purpose: "consumer",
    kind: "consumer",
    enrolled: false,
    currentAal: "aal1",
  }),
  false,
);
assert.equal(
  canAccessPrivateApp({
    emailConfirmed: true,
    purpose: "consumer",
    kind: "consumer",
    enrolled: false,
    currentAal: "aal1",
  }),
  true,
);
assert.equal(
  canAccessPrivateApp({
    emailConfirmed: true,
    purpose: "individual_pro",
    kind: "agent",
    enrolled: true,
    currentAal: "aal1",
  }),
  false,
);
assert.equal(
  canAccessPrivateApp({
    emailConfirmed: true,
    purpose: "individual_pro",
    kind: "agent",
    enrolled: true,
    currentAal: "aal2",
  }),
  true,
);

assert.equal(
  shouldStayOnLogin({
    recoveryMode: true,
    pendingEmail: false,
    pendingMfa: false,
  }),
  true,
);
assert.equal(
  shouldStayOnLogin({
    recoveryMode: false,
    pendingEmail: true,
    pendingMfa: false,
  }),
  true,
);
assert.equal(
  shouldStayOnLogin({
    recoveryMode: false,
    pendingEmail: false,
    pendingMfa: true,
  }),
  true,
);
assert.equal(
  shouldStayOnLogin({
    recoveryMode: false,
    pendingEmail: false,
    pendingMfa: false,
  }),
  false,
);

assert.equal(signInPublicMessage("Invalid login credentials"), GENERIC_SIGN_IN_ERROR);
assert.match(signInPublicMessage("Email not confirmed"), /Confirm your email/);
assert.match(GENERIC_AUTH_SENT, /If that account exists/);

assert.equal(destForUser({ kind: "pro", purpose: "individual_pro" }), "/portal");
assert.equal(destForUser({ kind: "broker", purpose: "managing_broker" }), "/settings");
assert.equal(destForUser({ kind: "consumer" }), "/home");

assert.equal(
  decideReadiness({
    signedIn: true,
    emailConfirmed: false,
    purpose: "individual_pro",
    kind: "agent",
    enrolled: true,
    currentAal: "aal2",
    nextPath: "/portal",
  }).reason,
  "email",
);
assert.equal(
  decideReadiness({
    signedIn: true,
    emailConfirmed: true,
    purpose: "individual_pro",
    kind: "agent",
    enrolled: false,
    currentAal: "aal1",
    nextPath: "/portal",
  }).redirectTo,
  "/settings?setup=mfa",
);
assert.match(
  decideReadiness({
    signedIn: true,
    emailConfirmed: true,
    purpose: "individual_pro",
    kind: "agent",
    enrolled: true,
    currentAal: "aal1",
    nextPath: "/portal",
  }).redirectTo ?? "",
  /pending=mfa/,
);
assert.equal(
  decideReadiness({
    signedIn: true,
    emailConfirmed: true,
    purpose: "individual_pro",
    kind: "agent",
    enrolled: true,
    currentAal: "aal2",
    nextPath: "/portal",
  }).ok,
  true,
);

assert.equal(classifyApiPath("/api/account/change-password"), "medium");
assert.equal(classifyApiPath("/api/account/change-email"), "medium");
assert.equal(classifyApiPath("/api/account/resend-confirmation"), "medium");
assert.equal(classifyApiPath("/api/account/mfa/unenroll"), "medium");
assert.equal(classifyApiPath("/api/account/sign-out-all"), "medium");

const login = read("src/components/LoginClient.tsx");
assert.match(login, /shouldStayOnLogin/);
assert.match(login, /get\("mode"\) === "recovery"/);
assert.match(login, /Forgot password/);
assert.match(login, /GENERIC_AUTH_SENT/);
assert.match(login, /MfaChallengeForm/);
assert.doesNotMatch(login, /backup code/i);

const auth = read("src/components/AuthContext.tsx");
assert.match(auth, /resetPasswordForEmail/);
assert.match(auth, /signInPublicMessage/);
assert.match(auth, /email_confirmed_at/);
assert.match(auth, /getAuthenticatorAssuranceLevel/);
assert.match(auth, /emailConfirmed && !promoted/);
assert.doesNotMatch(auth, /founder@/i);
assert.doesNotMatch(auth, /backupCodes/);

const mw = read("src/middleware.ts");
assert.match(mw, /email_confirmed_at/);
assert.match(mw, /pending.*email/);

const layout = read("src/app/portal/layout.tsx");
assert.match(layout, /getAccountReadiness/);
assert.match(layout, /redirectTo/);

const requirePro = read("src/lib/shi/require-pro.ts");
assert.match(requirePro, /decideReadiness/);
assert.match(requirePro, /Finish account security first/);

const settings = read("src/components/settings/SettingsView.tsx");
assert.match(settings, /SecuritySection/);
assert.match(settings, /Confirm your email and authenticator before office tools/);

const security = read("src/components/settings/SecuritySection.tsx");
assert.match(security, /Sign out everywhere/);
assert.match(security, /Sign out this device/);
assert.match(security, /We do not store backup codes/);
assert.match(security, /Other sessions are not listed/);
assert.doesNotMatch(security, /listSessions/);
assert.doesNotMatch(security, /backupCodes/);

const home = read("src/app/home/page.tsx");
assert.match(home, /canAccessPrivateApp/);
assert.match(home, /Finish signing in/);

const changePassword = read("src/app/api/account/change-password/route.ts");
assert.match(changePassword, /persistSession: false/);
assert.match(changePassword, /scope: "others"/);
assert.match(changePassword, /requireStepUpIfEnrolled/);

const unenroll = read("src/app/api/account/mfa/unenroll/route.ts");
assert.match(unenroll, /needs an authenticator/);
assert.match(unenroll, /requireStepUpIfEnrolled/);

assert.match(read("src/app/api/account/resend-confirmation/route.ts"), /GENERIC_AUTH_SENT/);
assert.match(read("src/lib/account/notify-security.ts"), /userId \? userId.slice\(0, 8\)/);
assert.doesNotMatch(read("src/lib/account/notify-security.ts"), /Authorization/);

console.log("accounts-wave-2: ok");
