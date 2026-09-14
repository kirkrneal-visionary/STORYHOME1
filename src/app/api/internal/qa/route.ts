import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { canApproveRelease, canUseFounderQa, resolveLabsRole } from "@/lib/labs/authz";
import {
  isolationFailures,
  isStoryLabs,
  resolveStoryHomeEnv,
  supabaseHostFromUrl,
} from "@/lib/labs/env";
import { BACKGROUND_JOBS } from "@/lib/labs/jobs";
import {
  LABS_SIM_COOKIE,
  parseLabsSimulationCookie,
} from "@/lib/labs/simulation";
import { logSecurityEvent } from "@/lib/security/log-event";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
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
      path: "/api/internal/qa",
      status: 403,
    });
    return NextResponse.json({ error: "Not authorized for Story Labs." }, { status: 403 });
  }

  const sim = parseLabsSimulationCookie(
    request.headers.get("cookie")?.match(new RegExp(`${LABS_SIM_COOKIE}=([^;]+)`))?.[1],
  );

  return NextResponse.json({
    env: resolveStoryHomeEnv(),
    isolated: isolationFailures().length === 0,
    isolation: isolationFailures(),
    supabaseHost: supabaseHostFromUrl(process.env.NEXT_PUBLIC_SUPABASE_URL),
    role,
    canApprove: canApproveRelease(role),
    commit: process.env.VERCEL_GIT_COMMIT_SHA || process.env.GITHUB_SHA || null,
    branch: process.env.VERCEL_GIT_COMMIT_REF || null,
    vercelEnv: process.env.VERCEL_ENV || null,
    simulation: sim,
    jobs: BACKGROUND_JOBS,
    stripeMode: "test_required",
    paymentConnected: false,
  });
}
