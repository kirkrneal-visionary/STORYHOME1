/**
 * P1A-3 Settings username experience.
 * Run: node --experimental-strip-types scripts/test-p1a3-username-settings.ts
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  shapeUsernameInput,
  usernameSyntax,
  usernameSyntaxCopy,
} from "../src/lib/account/username.ts";
import {
  USERNAME_DEBOUNCE_MS,
  canSaveUsername,
  ownCooldownCopy,
  phaseAfterAvailability,
  phaseAfterClaim,
  shouldCheckAvailability,
  usernameStatusCopy,
} from "../src/lib/account/username-settings.ts";
import {
  demoUsernameClient,
  resetDemoUsernames,
} from "../src/lib/account/username-client.ts";

const root = process.cwd();
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

assert.equal(USERNAME_DEBOUNCE_MS, 350);
assert.equal(shapeUsernameInput("@KirkNeal"), "kirkneal");
assert.equal(shapeUsernameInput("KirkNeal"), "kirkneal");
assert.equal(shapeUsernameInput(" kirk_neal"), "kirk_neal");
assert.equal(usernameSyntax(""), null);
assert.equal(usernameSyntax("kir"), "too_short");
assert.equal(usernameSyntax("abcdefghijabcdefghija"), "too_long");
assert.equal(usernameSyntax("kirk-neal"), "bad_chars");
assert.equal(usernameSyntax("kirkéneal"), "bad_chars");
assert.equal(usernameSyntax("_neal"), "leading_underscore");
assert.equal(usernameSyntax("neal_"), "trailing_underscore");
assert.equal(usernameSyntax("kirk__neal"), "double_underscore");
assert.equal(usernameSyntax("kirk_neal"), null);
assert.match(usernameSyntaxCopy("too_short"), /4 characters/);
assert.match(usernameSyntaxCopy("too_long"), /20/);

assert.equal(
  shouldCheckAvailability({ shaped: "kir", syntax: "too_short", current: null }),
  false,
);
assert.equal(
  shouldCheckAvailability({ shaped: "kirk", syntax: null, current: null }),
  true,
);
assert.equal(
  shouldCheckAvailability({ shaped: "kirkneal", syntax: null, current: "kirkneal" }),
  false,
);

assert.equal(
  canSaveUsername({ shaped: "kirk", syntax: null, phase: "available", saving: false }),
  true,
);
assert.equal(
  canSaveUsername({ shaped: "kirk", syntax: null, phase: "unavailable", saving: false }),
  false,
);
assert.equal(
  canSaveUsername({ shaped: "kirk", syntax: null, phase: "checking", saving: false }),
  false,
);
assert.equal(
  canSaveUsername({ shaped: "kirkneal", syntax: null, phase: "current", saving: false }),
  true,
);
assert.equal(
  canSaveUsername({ shaped: "kirk", syntax: null, phase: "available", saving: true }),
  false,
);

assert.equal(
  phaseAfterAvailability({
    shaped: "admin",
    current: null,
    syntax: null,
    result: { status: "unavailable", normalized: "admin" },
  }),
  "unavailable",
);
assert.equal(
  phaseAfterClaim({ ok: false, error: "Username unavailable.", code: "unavailable" }),
  "unavailable",
);
assert.equal(
  usernameStatusCopy({
    phase: "unavailable",
    syntax: null,
    shaped: "admin",
  }).text,
  "Username unavailable",
);
assert.match(ownCooldownCopy("2026-10-18T00:00:00Z"), /Oct 18|2026-10-18/);
assert.match(
  usernameStatusCopy({
    phase: "change_limit",
    syntax: null,
    shaped: "limitout",
    claim: { ok: false, error: "You have reached the username-change limit.", code: "change_limit" },
  }).text,
  /username-change limit/,
);
assert.equal(usernameSyntax("кирк"), "bad_chars");
assert.equal(usernameSyntax("kirk neal"), "bad_chars");
assert.equal(shapeUsernameInput("кирк"), "кирк");
assert.equal(
  canSaveUsername({ shaped: "kirk", syntax: null, phase: "idle", saving: false }),
  false,
);
assert.equal(
  canSaveUsername({ shaped: "kirk", syntax: null, phase: "error", saving: false }),
  true,
);
assert.equal(
  phaseAfterClaim({ ok: false, error: "You can change your username again on Oct 18.", code: "cooldown" }),
  "cooldown",
);
assert.equal(
  phaseAfterClaim({ ok: false, error: "You have reached the username-change limit.", code: "change_limit" }),
  "change_limit",
);

resetDemoUsernames();
const demo = demoUsernameClient("user-buyer");
assert.equal(await demo.loadCurrent(), null);
assert.equal((await demo.checkAvailability("admin")).status, "unavailable");
assert.equal((await demo.checkAvailability("kirkneal")).status, "available");
assert.equal((await demo.claim("kirkneal")).ok, true);
assert.equal(await demo.loadCurrent(), "kirkneal");
assert.equal((await demo.claim("kirkneal")).ok, true);
assert.equal((await demo.claim("takenow")).ok, false);
assert.equal((await demo.claim("takenow")).code, "unavailable");
assert.equal((await demo.claim("coolwait")).code, "cooldown");
assert.equal((await demo.claim("limitout")).code, "change_limit");
try {
  await demo.claim("netfail");
  assert.fail("expected network failure");
} catch (err) {
  assert.match(String(err), /network/);
}
const changed = await demo.claim("kirk_two");
assert.equal(changed.ok, true);
assert.equal((await demo.checkAvailability("kirkneal")).status, "unavailable");
assert.equal((await demo.checkAvailability("settings")).status, "unavailable");
assert.doesNotMatch(JSON.stringify(await demo.checkAvailability("admin")), /reserved|tombstone|active/);

const field = read("src/components/settings/UsernameField.tsx");
assert.match(field, /USERNAME_DEBOUNCE_MS/);
assert.match(field, /\/api\/account\/username\/availability|checkAvailability/);
assert.match(field, /claim\(/);
assert.doesNotMatch(field, /username_registry/);
assert.doesNotMatch(field, /username_normalized/);
assert.doesNotMatch(field, /service_role/);
assert.doesNotMatch(field, /from\("username_registry"\)/);
assert.match(field, /autoCorrect="off"/);
assert.match(field, /autoCapitalize="none"/);
assert.match(field, /spellCheck=\{false\}/);
assert.match(field, /aria-live="polite"/);
assert.match(field, /htmlFor=\{inputId\}/);
assert.match(field, /aria-hidden="true"/);
assert.match(field, /remain unavailable/);
assert.match(field, /min-h-10/);
assert.match(field, /min-w-0 flex-1/);
assert.match(field, /aria-invalid/);
assert.match(field, /aria-hidden="true"/);
assert.doesNotMatch(field, /createBrowserClient|createClient|service_role/);
assert.doesNotMatch(field, /tombstoned|reserved_kind|prior_holder/);
assert.doesNotMatch(field, /href=.*\/u\//);

const settings = read("src/components/settings/SettingsView.tsx");
assert.match(settings, /control=username/);
assert.match(settings, /UsernameField/);
assert.match(settings, /UsernameSummary/);
assert.match(settings, /← Back/);
assert.match(settings, />\s*Done\s*</);
assert.match(settings, /return "Homeowner"|Buyer \/ Consumer/);
assert.doesNotMatch(settings, /View as Consumer/);
assert.doesNotMatch(settings, /href=.*\/u\//);
assert.doesNotMatch(settings, /Account\n.*Story Home Preferences|Search & Property/);
assert.match(read("src/components/GlobalNav.tsx"), /View as buyer/);
assert.match(read("src/lib/account/purpose.ts"), /return "Homeowner"/);

const own = read("src/app/api/account/username/route.ts");
assert.match(own, /username_own_mutation_state/);
assert.match(own, /username: row\?\.active_normalized/);
assert.doesNotMatch(own, /admin_moderate_username/);

assert.ok(existsSync(join(root, "src/app/u/[username]/page.tsx")));
assert.equal(existsSync(join(root, "src/app/[username]")), false);
const accountApi = readdirSync(join(root, "src/app/api/account"));
assert.ok(accountApi.includes("username"));

console.log("p1a3-username-settings: ok");
