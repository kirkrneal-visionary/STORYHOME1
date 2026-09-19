import { NextResponse } from "next/server";
import { requireSignedIn } from "@/lib/account/require-signed-in";
import {
  firstRpcRow,
  mapAvailabilityRow,
  readUsernameQuery,
  usernameHeaders,
  type UsernameRpcRow,
} from "@/lib/account/username-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireSignedIn();
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.error },
      { status: auth.status, headers: usernameHeaders() },
    );
  }

  const q = readUsernameQuery(new URL(request.url).searchParams.get("q"));
  const { data, error } = await auth.supabase.rpc("username_availability", {
    p_raw: q,
  });
  if (error) {
    return NextResponse.json(
      { status: "unavailable" },
      { status: 503, headers: usernameHeaders() },
    );
  }

  return NextResponse.json(
    mapAvailabilityRow(firstRpcRow(data as UsernameRpcRow | UsernameRpcRow[])),
    { headers: usernameHeaders() },
  );
}
