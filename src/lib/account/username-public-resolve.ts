/**
 * Server resolver for /u/[username].
 * Calls resolve_username (active only), then an allowlisted profiles select.
 * Service-role is used only to execute the RPC when anon cannot.
 * Profile rows are never fetched with service-role.
 */

import { createClient } from "@supabase/supabase-js";
import { getServerSupabase } from "@/lib/supabase/server";
import { normalizeSupabaseUrl } from "@/lib/supabase/url";
import { firstRpcRow } from "@/lib/account/username-api";
import {
  USERNAME_PUBLIC_PROFILE_SELECT,
  canonicalUsernameParam,
  demoResolvePublicUsername,
  stubFromPublicRow,
  type UsernamePublicProfileRow,
  type UsernamePublicStub,
} from "@/lib/account/username-public";

type ResolveRow = {
  normalized?: string | null;
  account_id?: string | null;
};

function serviceResolver() {
  const url = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

async function resolveActiveAccount(
  normalized: string,
): Promise<{ username: string; accountId: string } | null> {
  const anon = await getServerSupabase();
  if (anon) {
    const { data, error } = await anon.rpc("resolve_username", {
      p_raw: normalized,
    });
    if (!error) {
      const row = firstRpcRow(data as ResolveRow | ResolveRow[]);
      if (!row?.normalized || !row.account_id) return null;
      return { username: row.normalized, accountId: row.account_id };
    }
  }

  const admin = serviceResolver();
  if (!admin) return null;
  const { data, error } = await admin.rpc("resolve_username", {
    p_raw: normalized,
  });
  if (error) return null;
  const row = firstRpcRow(data as ResolveRow | ResolveRow[]);
  if (!row?.normalized || !row.account_id) return null;
  return { username: row.normalized, accountId: row.account_id };
}

export async function resolvePublicUsername(
  raw: string,
): Promise<UsernamePublicStub | null> {
  const normalized = canonicalUsernameParam(raw);
  if (!normalized) return null;

  const supabase = await getServerSupabase();
  if (!supabase) {
    return demoResolvePublicUsername(normalized);
  }

  const active = await resolveActiveAccount(normalized);
  if (!active) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select(USERNAME_PUBLIC_PROFILE_SELECT)
    .eq("id", active.accountId)
    .maybeSingle();
  if (error || !data) return null;

  return stubFromPublicRow(
    active.username,
    data as UsernamePublicProfileRow,
  );
}
