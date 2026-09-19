import { NextResponse } from "next/server";
import { requireSignedIn } from "@/lib/account/require-signed-in";
import {
  firstRpcRow,
  usernameHeaders,
  type UsernameOwnMutationState,
  type UsernameOwnResponse,
} from "@/lib/account/username-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireSignedIn();
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.error },
      { status: auth.status, headers: usernameHeaders() },
    );
  }

  const { data, error } = await auth.supabase.rpc("username_own_mutation_state");
  if (error) {
    return NextResponse.json(
      { username: null } satisfies UsernameOwnResponse,
      { status: 200, headers: usernameHeaders() },
    );
  }
  const row = firstRpcRow(
    data as UsernameOwnMutationState | UsernameOwnMutationState[],
  );
  return NextResponse.json(
    {
      username: row?.active_normalized ?? null,
    } satisfies UsernameOwnResponse,
    { headers: usernameHeaders() },
  );
}
