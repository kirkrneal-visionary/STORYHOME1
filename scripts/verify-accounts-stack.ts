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
  "scripts/test-sign-out-everywhere-detect.ts",
];

for (const file of scripts) {
  const run = spawnSync(
    process.execPath,
    ["--experimental-strip-types", file],
    { stdio: "inherit" },
  );
  if (run.status !== 0) {
    process.exit(run.status ?? 1);
  }
}

console.log("accounts-stack: ok");
