/**
 * One password rule that matches Supabase Auth, plus the copy Supabase refusals map to.
 * Run: node --experimental-strip-types scripts/test-password-rule.ts
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  PASSWORD_LEAKED_COPY,
  PASSWORD_MIN_LENGTH,
  PASSWORD_RULE_COPY,
  PASSWORD_UPDATE_GENERIC_COPY,
  SIGNUP_GENERIC_COPY,
  meetsPasswordRule,
  passwordLength,
  passwordRejectedMessage,
  passwordTooShortCopy,
  PASSWORD_STILL_HAS_AUTHENTICATOR_COPY,
  passwordUpdatePublicMessage,
  signUpPublicMessage,
} from "../src/lib/account/password-rule.ts";

const root = process.cwd();
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

// Live Supabase Auth on 2026-11-25: minimum 6, no required character types,
// leaked-password check on. Change this with the Supabase setting, never alone.
assert.equal(PASSWORD_MIN_LENGTH, 6);
assert.equal(PASSWORD_RULE_COPY, "At least 6 characters");

assert.equal(meetsPasswordRule(""), false);
assert.equal(meetsPasswordRule("12345"), false);
assert.equal(meetsPasswordRule("123456"), true);
assert.equal(meetsPasswordRule("abcdef"), true, "no character-type rule");
assert.equal(passwordLength("😀😀😀"), 3, "Supabase counts characters, not UTF-16 units");
assert.equal(meetsPasswordRule("😀😀😀"), false);
assert.equal(meetsPasswordRule("😀😀😀😀😀😀"), true);

const leaked = {
  code: "weak_password",
  message: "Password is known to be weak and easy to guess, please choose a different one.",
  reasons: ["pwned"],
};
assert.equal(passwordRejectedMessage(leaked), PASSWORD_LEAKED_COPY);
assert.equal(signUpPublicMessage(leaked), PASSWORD_LEAKED_COPY);
assert.equal(passwordUpdatePublicMessage(leaked), PASSWORD_LEAKED_COPY);
assert.match(PASSWORD_LEAKED_COPY, /too common|data leak/);
assert.doesNotMatch(PASSWORD_LEAKED_COPY, /strong|weak|score/i);

const short = {
  code: "weak_password",
  message: "Password should be at least 8 characters.",
  reasons: ["length"],
};
assert.equal(passwordRejectedMessage(short), "Use at least 8 characters.");
assert.equal(
  passwordRejectedMessage({ code: "weak_password", message: "", reasons: ["length", "pwned"] }),
  passwordTooShortCopy(),
);
assert.equal(passwordTooShortCopy(), "Use at least 6 characters.");
assert.equal(
  passwordRejectedMessage({
    code: "validation_failed",
    message: "Password cannot be longer than 72 characters",
  }),
  "Use 72 characters or fewer.",
);
assert.match(
  passwordRejectedMessage({ code: "same_password", message: "New password should be different" }) ?? "",
  /different from your current one/,
);

assert.equal(passwordRejectedMessage({ message: "Database error saving new user" }), null);
assert.equal(
  passwordRejectedMessage({
    code: "insufficient_aal",
    message: "AAL2 session is required to update email or password when MFA is enabled.",
  }),
  null,
);
assert.equal(passwordRejectedMessage(null), null);
assert.match(
  signUpPublicMessage({ code: "user_already_exists", message: "User already registered" }),
  /already has an account/,
);
assert.equal(signUpPublicMessage({ message: "Database error saving new user" }), SIGNUP_GENERIC_COPY);
assert.equal(
  passwordUpdatePublicMessage({ message: "Database error" }),
  PASSWORD_UPDATE_GENERIC_COPY,
);
assert.equal(
  passwordUpdatePublicMessage({
    code: "insufficient_aal",
    message: "AAL2 session is required to update email or password when MFA is enabled.",
  }),
  PASSWORD_STILL_HAS_AUTHENTICATOR_COPY,
);
assert.doesNotMatch(
  passwordUpdatePublicMessage({
    code: "insufficient_aal",
    message: "AAL2 session is required to update email or password when MFA is enabled.",
  }),
  /create this account/i,
);

assert.equal(existsSync(join(root, "src/lib/account/password-strength.ts")), false);
assert.equal(existsSync(join(root, "src/components/auth/PasswordStrengthMeter.tsx")), false);

const rule = read("src/components/auth/PasswordRule.tsx");
assert.match(rule, /PASSWORD_RULE_COPY/);
assert.match(rule, /meetsPasswordRule/);
assert.match(rule, /<Check /);
assert.match(rule, /aria-live="polite"/);
assert.match(rule, /role="alert"/);
assert.doesNotMatch(rule, /strong|weak|score|meter/i);

const login = read("src/components/LoginClient.tsx");
assert.match(login, /<PasswordRule\s+id="signup-password-rule"/);
assert.match(login, /aria-describedby=\{mode === "signup" \? "signup-password-rule" : undefined\}/);
assert.match(login, /minLength=\{mode === "signup" \? PASSWORD_MIN_LENGTH : undefined\}/);
assert.match(login, /result\.passwordRejected/);
assert.doesNotMatch(login, /minLength=\{6\}/);

const recovery = read("src/components/auth/RecoveryPasswordForm.tsx");
assert.match(recovery, /<PasswordRule/);
assert.match(recovery, /meetsPasswordRule/);
assert.doesNotMatch(recovery, /signUpPublicMessage/, "reset errors are not sign-up errors");

const security = read("src/components/settings/SecuritySection.tsx");
assert.match(security, /<PasswordRule/);
assert.match(security, /password_rejected/);

const auth = read("src/components/AuthContext.tsx");
assert.match(auth, /signUpPublicMessage/);
assert.match(auth, /passwordUpdatePublicMessage/);
assert.match(auth, /passwordRejected: passwordRejectedMessage\(error\) !== null/);

const changePassword = read("src/app/api/account/change-password/route.ts");
assert.match(changePassword, /meetsPasswordRule\(newPassword\)/);
assert.match(changePassword, /passwordRejectedMessage\(error\)/);
assert.doesNotMatch(changePassword, /newPassword\.length < \d/);

console.log("password-rule: ok");
