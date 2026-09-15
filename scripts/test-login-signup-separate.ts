/**
 * Wave 1: Sign in and Create account must not share a password.
 * Run: node --experimental-strip-types scripts/test-login-signup-separate.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  draftAfterLogout,
  draftAfterModeChange,
  emptyAuthDraft,
  rememberSignInEmail,
} from "../src/lib/account/auth-form-fields.ts";

const root = process.cwd();
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

const typed = {
  email: "amy@example.com",
  password: "BlueLakeTrail!",
  fullName: "Amy Crow",
  license: "66789780",
};

const toSignup = draftAfterModeChange({
  next: "signup",
  leaving: "signin",
  draft: typed,
  signInEmail: "",
});
assert.equal(toSignup.signInEmail, "amy@example.com");
assert.deepEqual(toSignup.draft, emptyAuthDraft());
assert.equal(toSignup.draft.password, "");
assert.equal(toSignup.draft.email, "");

const backToSignin = draftAfterModeChange({
  next: "signin",
  leaving: "signup",
  draft: toSignup.draft,
  signInEmail: toSignup.signInEmail,
});
assert.equal(backToSignin.draft.email, "amy@example.com");
assert.equal(backToSignin.draft.password, "");
assert.equal(backToSignin.draft.fullName, "");
assert.equal(backToSignin.draft.license, "");

const toReset = draftAfterModeChange({
  next: "reset",
  leaving: "signin",
  draft: typed,
  signInEmail: "amy@example.com",
});
assert.equal(toReset.draft.email, "amy@example.com");
assert.equal(toReset.draft.password, "");

const afterLogout = draftAfterLogout("amy@example.com");
assert.equal(afterLogout.email, "amy@example.com");
assert.equal(afterLogout.password, "");
assert.equal(draftAfterLogout("").password, "");

assert.equal(rememberSignInEmail("signin", "  amy@example.com  ", ""), "amy@example.com");
assert.equal(rememberSignInEmail("signup", "other@example.com", "amy@example.com"), "amy@example.com");

const login = read("src/components/LoginClient.tsx");
assert.match(login, /draftAfterModeChange/);
assert.match(login, /readStashedLoginEmail/);
assert.match(login, /switchMode/);
assert.match(login, /new-password/);
assert.match(login, /current-password/);
assert.match(login, /key=\{`\$\{mode\}-password`\}/);
assert.doesNotMatch(login, /onClick=\{\(\) => \{\s*setMode\(m\);/);

const auth = read("src/components/AuthContext.tsx");
assert.match(auth, /stashLoginEmail/);
assert.match(auth, /stashLoginEmail\(user\?\.email\)/);
assert.doesNotMatch(auth, /stashLoginEmail\(user\?\.password/);

const helper = read("src/lib/account/auth-form-fields.ts");
assert.doesNotMatch(helper, /from "@\//);
assert.match(helper, /Never store a password/);

console.log("login-signup-separate: ok");
