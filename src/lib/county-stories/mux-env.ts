/**
 * Server-only Mux credentials for County Stories media infrastructure.
 * Never NEXT_PUBLIC_*. Missing values fail safely.
 *
 * Mux supplies the signing private key as Base64-encoded PEM. A deployment
 * may also supply PEM text. Malformed key material is rejected.
 */
import { createPrivateKey } from "node:crypto";

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

function isPemPrivateKey(value: string): boolean {
  return (
    value.includes("-----BEGIN") &&
    value.includes("PRIVATE KEY-----") &&
    value.includes("-----END")
  );
}

function normalizePemText(value: string): string {
  const trimmed = value.trim();
  if (trimmed.includes("\\n") && !trimmed.includes("\n")) {
    return trimmed.replace(/\\n/g, "\n").trim();
  }
  return trimmed;
}

function decodeStandardBase64(value: string): string | null {
  const compact = value.replace(/\s+/g, "");
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(compact) || compact.length % 4 === 1) {
    return null;
  }
  const buf = Buffer.from(compact, "base64");
  if (buf.length === 0) return null;
  const roundTrip = buf.toString("base64").replace(/=+$/g, "");
  if (roundTrip !== compact.replace(/=+$/g, "")) return null;
  return buf.toString("utf8");
}

/**
 * Resolve a Mux signing private key to PEM.
 * PEM text is used as-is. Any other value is decoded once from Base64.
 * Returns null when the material is missing or not a usable RSA PEM key.
 */
export function loadMuxSigningPrivateKey(raw: string | null | undefined): string | null {
  const trimmed = raw?.trim() ?? "";
  if (!trimmed) return null;
  const asPem = normalizePemText(trimmed);
  let pem: string | null = null;
  if (isPemPrivateKey(asPem)) {
    pem = asPem;
  } else {
    const decoded = decodeStandardBase64(trimmed);
    if (!decoded) return null;
    const decodedPem = normalizePemText(decoded);
    if (!isPemPrivateKey(decodedPem)) return null;
    pem = decodedPem;
  }
  try {
    const key = createPrivateKey(pem);
    if (key.asymmetricKeyType !== "rsa") return null;
    return pem;
  } catch {
    return null;
  }
}

export function readCountyStoryMuxEnv(
  env: NodeJS.ProcessEnv = process.env,
): CountyStoryMuxEnv | null {
  const tokenId = trim(env.MUX_TOKEN_ID);
  const tokenSecret = trim(env.MUX_TOKEN_SECRET);
  const webhookSecret = trim(env.MUX_WEBHOOK_SECRET);
  if (!tokenId || !tokenSecret || !webhookSecret) return null;
  const signingKeyId = trim(env.MUX_SIGNING_KEY_ID) || null;
  const signingKeyPrivate = loadMuxSigningPrivateKey(env.MUX_SIGNING_KEY_PRIVATE_KEY);
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
