import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  SELLER_ATTEMPT_LIMIT,
  SELLER_ATTEMPT_WINDOW_MS,
} from "@/lib/security/seller-attempts";

/** Store a hash of the IP — never the raw address. */
export function sellerIpKey(ip: string): string {
  return createHash("sha256").update(`seller-ip|${ip}`).digest("hex");
}

function isMissingRelation(error: { message?: string; code?: string } | null) {
  if (!error) return false;
  const msg = error.message ?? "";
  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    /seller_access_attempts|does not exist|schema cache/i.test(msg)
  );
}

/**
 * Durable lockout (survives a new serverless isolate).
 * `skip` = table not applied yet; caller keeps the in-memory limiter.
 */
export async function durableSellerAttemptsOpen(
  sb: SupabaseClient,
  ip: string,
  now = Date.now(),
): Promise<boolean | "skip"> {
  const { data, error } = await sb
    .from("seller_access_attempts")
    .select("fails, reset_at")
    .eq("ip_key", sellerIpKey(ip))
    .maybeSingle();
  if (error) {
    return isMissingRelation(error) ? "skip" : true;
  }
  if (!data) return true;
  const resetAt = Date.parse(String(data.reset_at));
  if (!Number.isFinite(resetAt) || resetAt <= now) return true;
  return Number(data.fails) < SELLER_ATTEMPT_LIMIT;
}

export async function durableNoteSellerFailure(
  sb: SupabaseClient,
  ip: string,
  now = Date.now(),
): Promise<void> {
  const ipKey = sellerIpKey(ip);
  const { data, error } = await sb
    .from("seller_access_attempts")
    .select("fails, reset_at")
    .eq("ip_key", ipKey)
    .maybeSingle();
  if (error) {
    if (!isMissingRelation(error)) {
      /* keep going — in-memory limiter still applies */
    }
    return;
  }

  const resetAt = data ? Date.parse(String(data.reset_at)) : 0;
  const fresh = !data || !Number.isFinite(resetAt) || resetAt <= now;
  const row = {
    ip_key: ipKey,
    fails: fresh ? 1 : Number(data.fails) + 1,
    reset_at: fresh
      ? new Date(now + SELLER_ATTEMPT_WINDOW_MS).toISOString()
      : data.reset_at,
  };
  await sb.from("seller_access_attempts").upsert(row, { onConflict: "ip_key" });
}

export async function durableNoteSellerSuccess(
  sb: SupabaseClient,
  ip: string,
): Promise<void> {
  const { error } = await sb
    .from("seller_access_attempts")
    .delete()
    .eq("ip_key", sellerIpKey(ip));
  if (error && !isMissingRelation(error)) {
    /* ignore — lockout clear is best-effort */
  }
}
