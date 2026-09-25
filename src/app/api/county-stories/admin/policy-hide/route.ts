import { NextResponse } from "next/server";
import { countyStoryAdminClient } from "@/lib/county-stories/admin";
import {
  hideCountyStoryForPolicy,
  requireCountyStoryServiceRole,
} from "@/lib/county-stories/enforcement-service";
import { isCountyStoryPolicyReason } from "@/lib/county-stories/enforcement";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!requireCountyStoryServiceRole(request)) {
    return NextResponse.json({ ok: false, error: "Not available." }, { status: 403 });
  }
  const admin = countyStoryAdminClient();
  if (!admin) {
    return NextResponse.json({ ok: false, error: "Unable to hide." }, { status: 503 });
  }
  let body: {
    slotId?: string;
    reasonCode?: string;
    reasonDetail?: string | null;
    idempotencyKey?: string;
    actorKind?: string;
    actorId?: string | null;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }
  if (!isCountyStoryPolicyReason(body.reasonCode ?? "")) {
    return NextResponse.json(
      { ok: false, code: "INVALID_REASON", error: "Reason is required." },
      { status: 400 },
    );
  }
  const { result, status } = await hideCountyStoryForPolicy({
    admin,
    slotId: body.slotId ?? "",
    reasonCode: body.reasonCode ?? "",
    reasonDetail: body.reasonDetail ?? null,
    idempotencyKey: body.idempotencyKey ?? "",
    actorKind: body.actorKind === "system" ? "system" : "admin",
    actorId: body.actorId ?? null,
  });
  return NextResponse.json(result, { status });
}
