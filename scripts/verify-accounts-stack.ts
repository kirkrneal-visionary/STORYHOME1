/**
 * Run the full accounts stack proof. Does not go live.
 */
import { spawnSync } from "node:child_process";

const scripts = [
  "scripts/test-accounts-wave-1.ts",
  "scripts/test-accounts-wave-2.ts",
  "scripts/test-accounts-wave-3.ts",
  "scripts/test-accounts-wave-4.ts",
  "scripts/test-accounts-delete-hide-email.ts",
  "scripts/test-password-strength.ts",
  "scripts/test-office-keep-story-pro.ts",
  "scripts/test-login-signup-separate.ts",
  "scripts/test-sign-out-everywhere-detect.ts",
  "scripts/test-forced-logout-server.ts",
  "scripts/test-settings-pro-auth.ts",
  "scripts/test-settings-buyer-preview.ts",
  "scripts/test-settings-db-locks.ts",
  "scripts/test-p1a1-username-registry.ts",
  "scripts/test-p1a2-username-api.ts",
  "scripts/test-p1a3-username-settings.ts",
  "scripts/test-p1a4-username-routing.ts",
  "scripts/test-p1b1-settings-shell.ts",
  "scripts/test-p1b2a-account-profile.ts",
  "scripts/test-p1b2b1-account-security.ts",
  "scripts/test-p1b2b2-session-delete.ts",
];

for (const file of scripts) {
  const run = spawnSync(
    process.execPath,
    ["--import", "./scripts/story-ts-alias.mjs", "--experimental-strip-types", file],
    { stdio: "inherit" },
  );
  if (run.status !== 0) {
    process.exit(run.status ?? 1);
  }
}

console.log("accounts-stack: ok");
