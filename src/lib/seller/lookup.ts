import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  mapSellerPortal,
  TERMINAL_STATUSES,
  type SellerPortal,
} from "@/lib/seller-portal";
import { logSecurityEvent } from "@/lib/security/log-event";
import {
  noteSellerFailure,
  noteSellerSuccess,
  sellerAttemptsOpen,
} from "@/lib/security/seller-attempts";
import { normalizeSellerCode } from "@/lib/security/validate";

export type SellerLookupFail = { ok: false; status: 404 | 429 | 503 };
export type SellerLookupOk = { ok: true; portal: SellerPortal };

function privilegedOrAnonClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!url) return null;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  const key = service || anon;
  if (!key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

/**
 * Resolve a seller portal by access code.
 * Attempt-limited. Generic miss. One code never returns a neighbor listing
 * (RPC matches that code only).
 */
export async function lookupSellerPortal(opts: {
  code: unknown;
  ip: string;
  path?: string;
}): Promise<SellerLookupOk | SellerLookupFail> {
  const code = normalizeSellerCode(opts.code);
  if (!code) {
    return { ok: false, status: 404 };
  }

  if (!sellerAttemptsOpen(opts.ip)) {
    logSecurityEvent({
      kind: "seller_code_throttled",
      ip: opts.ip,
      path: opts.path,
      status: 429,
    });
    return { ok: false, status: 429 };
  }

  const sb = privilegedOrAnonClient();
  if (!sb) {
    return { ok: false, status: 503 };
  }

  const { data, error } = await sb.rpc("seller_portal_by_code", {
    p_code: code,
  });
  if (error || !data) {
    noteSellerFailure(opts.ip);
    logSecurityEvent({
      kind: "seller_code_denied",
      ip: opts.ip,
      path: opts.path,
      status: 404,
    });
    return { ok: false, status: 404 };
  }

  const portal = mapSellerPortal(data);
  if (!portal) {
    noteSellerFailure(opts.ip);
    logSecurityEvent({
      kind: "seller_code_denied",
      ip: opts.ip,
      path: opts.path,
      status: 404,
    });
    return { ok: false, status: 404 };
  }

  if (TERMINAL_STATUSES.has(portal.listing.status)) {
    noteSellerFailure(opts.ip);
    return { ok: false, status: 404 };
  }

  noteSellerSuccess(opts.ip);
  return { ok: true, portal };
}
