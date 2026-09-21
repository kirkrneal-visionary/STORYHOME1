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
  "scripts/test-p1b4a-professional-identity.ts",
  "scripts/test-p1b4b-professional-profile.ts",
  "scripts/test-p1b4c1-living-mark.ts",
  "scripts/test-p1b4c2-brokerage.ts",
  "scripts/test-p1b5-office-settings.ts",
  "scripts/test-p1b6a-settings-audit.ts",
  "scripts/test-p1b6b-settings-cleanup.ts",
  "scripts/test-p1c1a-geography-foundation.ts",
  "scripts/test-p1c1b-primary-county.ts",
  "scripts/test-p1c2a-service-counties.ts",
  "scripts/test-p1c2b-service-counties-settings.ts",
  "scripts/test-p1c1c-primary-county-settings.ts",
  "scripts/test-p1c3a1-brokerage-history.ts",
  "scripts/test-p1c3a2-brokerage-writes.ts",
  "scripts/test-p1c3b-brokerage-history-read.ts",
  "scripts/test-p1c4a-availability.ts",
  "scripts/test-p1c4b-availability-settings.ts",
  "scripts/test-p1c5a-security-audit.ts",
  "scripts/test-p1c5b-release-candidate.ts",
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
