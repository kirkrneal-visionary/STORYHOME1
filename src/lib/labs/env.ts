/**
 * Story Home environment identity.
 * Production stays the vault. Staging is Story Labs. Preview is not Labs
 * until a founder-configured isolated database exists.
 */

export const STORY_HOME_ENVS = [
  "development",
  "preview",
  "staging",
  "production",
] as const;

export type StoryHomeEnv = (typeof STORY_HOME_ENVS)[number];

export type LabsRole = "founder" | "developer" | "qa";

/** Known production Supabase project — never write here from Labs. */
export const PRODUCTION_SUPABASE_HOSTS = [
  "ksvllgzsnzyahqsjuove.supabase.co",
] as const;

export const PRODUCTION_VERCEL_HOSTS = [
  "storyhome-1-eqmg.vercel.app",
] as const;

export type EnvSnapshot = {
  storyHomeEnv?: string | null;
  appEnv?: string | null;
  vercelEnv?: string | null;
  supabaseUrl?: string | null;
  billingSecretKey?: string | null;
  stripeSecret?: string | null;
  serviceRoleKey?: string | null;
  allowProdDb?: string | null;
};

export function parseStoryHomeEnv(raw: string | null | undefined): StoryHomeEnv | null {
  const v = (raw ?? "").trim().toLowerCase();
  if (v === "dev") return "development";
  if (v === "labs" || v === "story-labs") return "staging";
  if ((STORY_HOME_ENVS as readonly string[]).includes(v)) return v as StoryHomeEnv;
  return null;
}

export function resolveStoryHomeEnv(snap: EnvSnapshot = processEnvSnapshot()): StoryHomeEnv {
  const explicit = parseStoryHomeEnv(snap.storyHomeEnv) ?? parseStoryHomeEnv(snap.appEnv);
  if (explicit) return explicit;
  const vercel = (snap.vercelEnv ?? "").trim().toLowerCase();
  if (vercel === "production") return "production";
  if (vercel === "preview") return "preview";
  return "development";
}

export function processEnvSnapshot(): EnvSnapshot {
  return {
    storyHomeEnv: process.env.STORY_HOME_ENV,
    appEnv: process.env.APP_ENV,
    vercelEnv: process.env.VERCEL_ENV,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    billingSecretKey: process.env.BILLING_SECRET_KEY,
    stripeSecret: process.env.STRIPE_SECRET_KEY,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    allowProdDb: process.env.STORY_HOME_ALLOW_PROD_DB,
  };
}

export function supabaseHostFromUrl(url: string | null | undefined): string | null {
  const raw = (url ?? "").trim();
  if (!raw) return null;
  try {
    const u = new URL(raw.includes("://") ? raw : `https://${raw}`);
    return u.hostname.toLowerCase();
  } catch {
    return null;
  }
}

export function isProductionSupabaseHost(host: string | null | undefined): boolean {
  if (!host) return false;
  return (PRODUCTION_SUPABASE_HOSTS as readonly string[]).includes(host);
}

export function looksLikeStripeLiveSecret(value: string | null | undefined): boolean {
  const v = (value ?? "").trim();
  return /^(sk_live_|rk_live_)/.test(v);
}

export type IsolationFailure = {
  code: "staging_uses_production_db" | "dev_uses_production_db" | "staging_uses_stripe_live";
  message: string;
};

/**
 * Fail-closed isolation. Preview (Vercel PR) is not Story Labs — it may still
 * share production credentials until the founder creates an isolated project.
 * Explicit STORY_HOME_ENV=staging MUST NOT share the production database.
 */
export function isolationFailures(snap: EnvSnapshot = processEnvSnapshot()): IsolationFailure[] {
  const env = resolveStoryHomeEnv(snap);
  const host = supabaseHostFromUrl(snap.supabaseUrl);
  const allow = (snap.allowProdDb ?? "").trim() === "1";
  const failures: IsolationFailure[] = [];

  if (env === "staging" && isProductionSupabaseHost(host) && !allow) {
    failures.push({
      code: "staging_uses_production_db",
      message:
        "Story Labs is pointed at the production database. Refusing to start. Set a staging Supabase project.",
    });
  }

  if (env === "development" && isProductionSupabaseHost(host) && snap.allowProdDb !== "1") {
    const hasPrivileged =
      Boolean((snap.serviceRoleKey ?? "").trim()) ||
      looksLikeStripeLiveSecret(snap.stripeSecret) ||
      looksLikeStripeLiveSecret(snap.billingSecretKey);
    if (hasPrivileged) {
      failures.push({
        code: "dev_uses_production_db",
        message:
          "Development has a production database URL plus a privileged secret. Refusing to start.",
      });
    }
  }

  if (
    env === "staging" &&
    (looksLikeStripeLiveSecret(snap.stripeSecret) ||
      looksLikeStripeLiveSecret(snap.billingSecretKey))
  ) {
    failures.push({
      code: "staging_uses_stripe_live",
      message: "Story Labs has a live Stripe secret. Refusing to start. Use test-mode keys only.",
    });
  }

  return failures;
}

export function assertIsolatedEnvironment(snap: EnvSnapshot = processEnvSnapshot()): void {
  const failures = isolationFailures(snap);
  if (failures[0]) {
    throw new Error(`STORY_LABS_ISOLATION: ${failures[0].message}`);
  }
}

export function isStoryLabs(snap: EnvSnapshot = processEnvSnapshot()): boolean {
  return resolveStoryHomeEnv(snap) === "staging" && isolationFailures(snap).length === 0;
}

export function founderQaEnabled(snap: EnvSnapshot = processEnvSnapshot()): boolean {
  return isStoryLabs(snap);
}

export function parseEmailList(raw: string | null | undefined): string[] {
  return (raw ?? "")
    .split(/[,;\s]+/)
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.includes("@"));
}

export function labsRoleForEmail(
  email: string | null | undefined,
  lists: { founder: string[]; developer: string[]; qa: string[] },
): LabsRole | null {
  const e = (email ?? "").trim().toLowerCase();
  if (!e) return null;
  if (lists.founder.includes(e)) return "founder";
  if (lists.developer.includes(e)) return "developer";
  if (lists.qa.includes(e)) return "qa";
  return null;
}
