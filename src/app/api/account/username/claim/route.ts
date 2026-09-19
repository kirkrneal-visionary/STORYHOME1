import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import {
  requireSignedIn,
  requireStepUpIfEnrolled,
} from "@/lib/account/require-signed-in";
import {
  firstRpcRow,
  mapClaimRow,
  readClaimUsername,
  usernameHeaders,
  type UsernameOwnMutationState,
  type UsernameRpcRow,
} from "@/lib/account/username-api";
import { normalizeSupabaseUrl } from "@/lib/supabase/url";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function serviceRoleClient() {
  const url = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function POST(request: Request) {
  const auth = await requireSignedIn();
  if (!auth.ok) {
    return NextResponse.json(
      { ok: false, error: auth.error, code: "sign_in_required" },
      { status: auth.status, headers: usernameHeaders() },
    );
  }

  const step = await requireStepUpIfEnrolled(auth.supabase);
  if (!step.ok) {
    return NextResponse.json(
      { ok: false, error: step.error, code: step.code },
      { status: step.status, headers: usernameHeaders() },
    );
  }

  let body: unknown = null;
  try {
    body = await request.json();
  } catch {
    body = null;
  }
  const username = readClaimUsername(body);

  const admin = serviceRoleClient();
  if (!admin) {
    return NextResponse.json(
      { ok: false, error: "Unable to update username." },
      { status: 503, headers: usernameHeaders() },
    );
  }

  const { data, error } = await admin.rpc("claim_username", {
    p_uid: auth.user.id,
    p_raw: username,
  });
  if (error) {
    return NextResponse.json(
      { ok: false, error: "Unable to update username." },
      { status: 400, headers: usernameHeaders() },
    );
  }

  const row = firstRpcRow(data as UsernameRpcRow | UsernameRpcRow[]);
  let own: UsernameOwnMutationState | null = null;
  if (row?.error_code === "cooldown") {
    const state = await auth.supabase.rpc("username_own_mutation_state");
    own = firstRpcRow(
      state.data as UsernameOwnMutationState | UsernameOwnMutationState[],
    );
  }
  const mapped = mapClaimRow(row, own);
  return NextResponse.json(mapped.body, {
    status: mapped.status,
    headers: usernameHeaders(),
  });
}
