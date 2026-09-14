/**
 * Password strength meter and signup error copy.
 * Run: node --experimental-strip-types scripts/test-password-strength.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  scorePassword,
  signUpPublicMessage,
  WEAK_PASSWORD_COPY,
} from "../src/lib/account/password-strength.ts";

const read = (rel: string) => readFileSync(join(process.cwd(), rel), "utf8");

assert.equal(scorePassword("").level, "empty");
assert.equal(scorePassword("1234567").level, "weak");
assert.equal(scorePassword("password").level, "weak");
assert.equal(scorePassword("Apple@1234").level, "weak");
assert.equal(scorePassword("Apple@1234", { name: "Amy Crow" }).level, "weak");
assert.equal(scorePassword("amyhouse99", { name: "Amy Crow" }).level, "weak");
assert.equal(scorePassword("BlueLakeTrail!").level, "good");
assert.equal(scorePassword("Blue lake Trail stones 19!").level, "strong");

assert.equal(
  signUpPublicMessage({
    code: "weak_password",
    message: "Password is known to be weak and easy to guess",
  }),
  WEAK_PASSWORD_COPY,
);
assert.match(
  signUpPublicMessage({ code: "user_already_exists", message: "User already registered" }),
  /already has an account/,
);
assert.match(
  signUpPublicMessage({ message: "Database error saving new user" }),
  /Unable to create/,
);

const login = read("src/components/LoginClient.tsx");
assert.match(login, /PasswordStrengthMeter/);
assert.match(read("src/components/AuthContext.tsx"), /signUpPublicMessage/);
assert.match(read("src/components/settings/SecuritySection.tsx"), /PasswordStrengthMeter/);
assert.match(read("src/components/auth/RecoveryPasswordForm.tsx"), /PasswordStrengthMeter/);

console.log("password-strength: ok");
