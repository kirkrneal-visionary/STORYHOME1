/**
 * Account emails: branded Supabase templates, token-hash links, /auth/confirm,
 * and the "check your email" step. Isolated. No production credentials.
 * Run: node --experimental-strip-types scripts/test-account-emails.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  EMAIL_RESEND_WAIT_MS,
  emailLinkFailure,
  readEmailLink,
} from "../src/lib/account/email-link.ts";

const root = process.cwd();
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

const hash = "a1".repeat(28);

assert.deepEqual(readEmailLink({ token_hash: hash, type: "recovery" }), {
  tokenHash: hash,
  type: "recovery",
});
assert.deepEqual(readEmailLink({ token_hash: hash, type: "email" }), {
  tokenHash: hash,
  type: "email",
});
assert.deepEqual(readEmailLink({ token_hash: [`pkce_${hash}`], type: ["signup"] }), {
  tokenHash: `pkce_${hash}`,
  type: "email",
});
assert.equal(readEmailLink({}), null);
assert.equal(readEmailLink({ token_hash: hash }), null);
assert.equal(readEmailLink({ token_hash: hash, type: "magiclink" }), null);
assert.equal(readEmailLink({ token_hash: hash, type: "email_change" }), null);
assert.equal(readEmailLink({ token_hash: "short", type: "email" }), null);
assert.equal(readEmailLink({ token_hash: `${hash}"><script>`, type: "email" }), null);

assert.equal(emailLinkFailure({ status: 403 }), "expired");
assert.equal(emailLinkFailure({ status: 400 }), "expired");
assert.equal(emailLinkFailure({ status: 500 }), "network");
assert.equal(emailLinkFailure({}), "network");
assert.equal(emailLinkFailure(null), "network");
assert.equal(EMAIL_RESEND_WAIT_MS, 60_000);

const templates = [
  {
    file: "supabase/templates/reset-password.html",
    type: "recovery",
    title: "Reset your Story Home password",
    button: "Choose a new password",
  },
  {
    file: "supabase/templates/confirm-signup.html",
    type: "email",
    title: "Confirm your email for Story Home",
    button: "Confirm email",
  },
];

for (const t of templates) {
  const html = read(t.file);
  const href = `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&amp;type=${t.type}`;
  assert.equal(html.split(`href="${href}"`).length - 1, 2, `${t.file}: button + fallback link`);
  assert.ok(html.includes(`>${href}</a>`), `${t.file}: link shown as text`);
  assert.ok(html.includes(`<title>${t.title}</title>`), `${t.file}: title`);
  assert.ok(html.includes(`>${t.button}</a>`), `${t.file}: button label`);
  assert.doesNotMatch(html, /ConfirmationURL|RedirectTo/, `${t.file}: no Supabase verify links`);
  assert.doesNotMatch(html, /supabase/i, `${t.file}: no Supabase branding`);
  assert.doesNotMatch(html, /<img|<script|<!--/i, `${t.file}: no images, scripts, or comments`);
  assert.match(html, /#f5b71e/i, `${t.file}: gold`);
  assert.match(html, /background-color:#0b0d11/, `${t.file}: dark page`);
  assert.match(html, /<span style="color:#f7f4ec;">STORY<\/span><span style="color:#f5b71e;">HOME<\/span>/);
  assert.match(html, /name="color-scheme" content="light dark"/);
  const actions = [...html.matchAll(/\{\{(.*?)\}\}/g)].map((m) => m[1].trim());
  assert.ok(actions.length > 0);
  for (const action of actions) {
    assert.ok([".SiteURL", ".TokenHash"].includes(action), `${t.file}: unexpected {{ ${action} }}`);
  }
  assert.equal(html.split("{{").length, html.split("}}").length, `${t.file}: balanced template tags`);
  assert.ok(Buffer.byteLength(html, "utf8") < 20_000, `${t.file}: small enough to paste and to avoid clipping`);
}

const page = read("src/app/auth/confirm/page.tsx");
assert.match(page, /readEmailLink\(await searchParams\)/);
assert.match(page, /robots: \{ index: false, follow: false \}/);

const confirm = read("src/components/auth/EmailLinkConfirm.tsx");
assert.equal(confirm.split("verifyOtp(").length - 1, 1, "one verify call");
const handlerStart = confirm.indexOf("async function confirmLink()");
const handlerEnd = confirm.indexOf("\n  }\n", handlerStart);
assert.ok(handlerStart > 0 && handlerEnd > handlerStart);
assert.ok(
  confirm.slice(handlerStart, handlerEnd).includes("verifyOtp("),
  "the link is verified only from the tap handler, never on page load",
);
assert.match(confirm, /onClick=\{confirmLink\}/);
assert.doesNotMatch(confirm, /useEffect/);
assert.match(confirm, /RecoveryPasswordForm/);
assert.match(confirm, /\/login\?mode=reset/);

const mw = read("src/middleware.ts");
assert.doesNotMatch(mw, /startsWith\("\/auth/, "email links are not behind the session gate");

const login = read("src/components/LoginClient.tsx");
assert.match(login, /<CheckEmailPanel/);
assert.match(login, /reason: "signup"/);
assert.match(login, /reason: "unconfirmed"/);
assert.match(login, /get\("mode"\) === "reset"/);
assert.match(login, /resendConfirmation=\{resendConfirmation\}/);

const panel = read("src/components/auth/CheckEmailPanel.tsx");
assert.match(panel, /Check your email/);
assert.match(panel, /EMAIL_RESEND_WAIT_MS/);
assert.match(panel, /Resend email/);

const auth = read("src/components/AuthContext.tsx");
assert.match(auth, /emailUnconfirmed: !data\.session/);

console.log("account-emails: ok");
