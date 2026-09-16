/**
 * Wave 2 never writes the live Story Home database.
 * Isolated. No network.
 */

export const LIVE_SUPABASE_PROJECT = "ksvllgzsnzyahqsjuove";

export type StagingEnv =
  | {
      ok: true;
      url: string;
      anonKey: string;
      serviceRole: string;
    }
  | {
      ok: false;
      reason: string;
    };

export function isLiveSupabaseUrl(url: string | null | undefined): boolean {
  return (url ?? "").toLowerCase().includes(LIVE_SUPABASE_PROJECT);
}

export function assertNotLiveProject(url: string, label = "url"): void {
  if (isLiveSupabaseUrl(url)) {
    throw new Error(
      `Wave 2 refuses the live Story Home database (${label}). Use a spare project.`,
    );
  }
}

export function readStagingEnv(
  env: NodeJS.ProcessEnv = process.env,
): StagingEnv {
  const url = (env.STAGING_SUPABASE_URL ?? "").trim();
  const anonKey = (env.STAGING_SUPABASE_ANON_KEY ?? "").trim();
  const serviceRole = (env.STAGING_SUPABASE_SERVICE_ROLE ?? "").trim();

  if (!url) {
    return { ok: false, reason: "STAGING_SUPABASE_URL is not set" };
  }
  assertNotLiveProject(url, "STAGING_SUPABASE_URL");
  const liveUrl = (env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
  if (liveUrl && url === liveUrl) {
    throw new Error("Wave 2 refuses to reuse the live Supabase URL as staging.");
  }
  if (!anonKey) {
    return { ok: false, reason: "STAGING_SUPABASE_ANON_KEY is not set" };
  }
  if (!serviceRole) {
    return { ok: false, reason: "STAGING_SUPABASE_SERVICE_ROLE is not set" };
  }
  if (serviceRole === (env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim()) {
    throw new Error("Wave 2 refuses to reuse the live service-role key.");
  }
  return { ok: true, url, anonKey, serviceRole };
}
