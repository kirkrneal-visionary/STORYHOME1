/**
 * Deploys the County Story composition Worker from this folder.
 * CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID come from the environment.
 * This file does not contain either value.
 */
import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const token = process.env.CLOUDFLARE_API_TOKEN?.trim() ?? "";
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim() ?? "";
if (!token || !accountId) {
  process.stderr.write("CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID must be set outside the repository.\n");
  process.exit(1);
}

const env = {
  ...process.env,
  CLOUDFLARE_API_TOKEN: token,
  CLOUDFLARE_ACCOUNT_ID: accountId,
};

function run(args, input) {
  const result = spawnSync("npx", ["--yes", "wrangler@4.145.0", ...args], {
    cwd: root,
    env,
    input,
    encoding: "utf8",
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.status !== 0) process.exit(result.status ?? 1);
}

run(["deploy"]);

const provided = process.env.COUNTY_STORY_COMPOSE_WORKER_SECRET?.trim() ?? "";
const secret = provided || randomBytes(32).toString("hex");
run(["secret", "put", "COUNTY_STORY_COMPOSE_WORKER_SECRET"], secret);
writeFileSync(join(root, ".worker-secret"), secret, { mode: 0o600 });
process.stdout.write("Composition worker secret is stored on Cloudflare. It was not printed.\n");
