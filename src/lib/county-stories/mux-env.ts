/**
 * Server-only Mux credentials for County Stories media infrastructure.
 * Never NEXT_PUBLIC_*. Missing values fail safely.
 */

export type CountyStoryMuxEnv = {
  tokenId: string;
  tokenSecret: string;
  webhookSecret: string;
  signingKeyId: string | null;
  signingKeyPrivate: string | null;
};

function trim(value: string | undefined): string {
  return value?.trim() ?? "";
}

export function readCountyStoryMuxEnv(
  env: NodeJS.ProcessEnv = process.env,
): CountyStoryMuxEnv | null {
  const tokenId = trim(env.MUX_TOKEN_ID);
  const tokenSecret = trim(env.MUX_TOKEN_SECRET);
  const webhookSecret = trim(env.MUX_WEBHOOK_SECRET);
  if (!tokenId || !tokenSecret || !webhookSecret) return null;
  const signingKeyId = trim(env.MUX_SIGNING_KEY_ID) || null;
  const signingKeyPrivate = trim(env.MUX_SIGNING_KEY_PRIVATE_KEY) || null;
  return {
    tokenId,
    tokenSecret,
    webhookSecret,
    signingKeyId,
    signingKeyPrivate,
  };
}

export function countyStoryMuxConfigured(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return readCountyStoryMuxEnv(env) != null;
}

export function countyStoryMuxSigningConfigured(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  const cfg = readCountyStoryMuxEnv(env);
  return !!(cfg?.signingKeyId && cfg.signingKeyPrivate);
}
