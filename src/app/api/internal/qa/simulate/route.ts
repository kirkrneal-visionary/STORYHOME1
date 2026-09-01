import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { canUseFounderQa, resolveLabsRole } from "@/lib/labs/authz";
import { isStoryLabs } from "@/lib/labs/env";
import {
  LABS_SIM_COOKIE,
  parseLabsSimulation,
  serializeLabsSimulation,
} from "@/lib/labs/simulation";
import { logSecurityEvent } from "@/lib/security/log-event";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isStoryLabs()) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
  const role = resolveLabsRole(user?.email ?? null);
  if (!canUseFounderQa(role)) {
    logSecurityEvent({
      kind: "labs_denied",
      path: "/api/internal/qa/simulate",
      status: 403,
    });
    return NextResponse.json({ error: "Not authorized for Story Labs." }, { status: 403 });
  }

  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const sim = parseLabsSimulation(body);
  const response = NextResponse.json({ ok: true, simulation: sim });
  response.cookies.set(LABS_SIM_COOKIE, serializeLabsSimulation(sim), {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: 60 * 60 * 8,
  });
  return response;
}
