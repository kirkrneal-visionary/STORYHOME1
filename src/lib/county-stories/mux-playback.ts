/**
 * Future server-issued signed Mux playback tokens.
 * Wave 7 will use this. Wave 5 only stores the contract and secrets shape.
 * Never mints a token for a public playback id.
 */
import { createSign } from "node:crypto";
import {
  readCountyStoryMuxEnv,
  type CountyStoryMuxEnv,
} from "@/lib/county-stories/mux-env";

function b64url(buf: Buffer | string): string {
  const raw = typeof buf === "string" ? Buffer.from(buf) : buf;
  return raw
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

export function signMuxPlaybackToken(opts: {
  playbackId: string;
  ttlSec?: number;
  env?: CountyStoryMuxEnv | null;
  nowMs?: number;
}): string | null {
  const env = opts.env ?? readCountyStoryMuxEnv();
  if (!env?.signingKeyId || !env.signingKeyPrivate) return null;
  if (!opts.playbackId.trim()) return null;
  const now = Math.floor((opts.nowMs ?? Date.now()) / 1000);
  const exp = now + Math.max(30, opts.ttlSec ?? 120);
  const header = b64url(
    JSON.stringify({ alg: "RS256", typ: "JWT", kid: env.signingKeyId }),
  );
  const payload = b64url(
    JSON.stringify({
      sub: opts.playbackId,
      aud: "v",
      exp,
      kid: env.signingKeyId,
    }),
  );
  const data = `${header}.${payload}`;
  try {
    const signer = createSign("RSA-SHA256");
    signer.update(data);
    signer.end();
    const sig = signer.sign(env.signingKeyPrivate);
    return `${data}.${b64url(sig)}`;
  } catch {
    return null;
  }
}
