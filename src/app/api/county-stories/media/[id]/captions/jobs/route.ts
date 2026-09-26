import { NextResponse } from "next/server";
import { countyStoryAdminClient } from "@/lib/county-stories/admin";
import { requestCountyStoryCaptionJob } from "@/lib/county-stories/captions-service";
import { requireCountyStoryPublisher } from "@/lib/county-stories/require-publisher";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: Request, ctx: Ctx) {
  const auth = await requireCountyStoryPublisher();
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }
  const admin = countyStoryAdminClient();
  if (!admin) {
    return NextResponse.json({ ok: false, error: "Unable to start." }, { status: 503 });
  }
  const { id } = await ctx.params;
  let body: { idempotencyKey?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    body = {};
  }
  const { result, status } = await requestCountyStoryCaptionJob({
    admin,
    ownerId: auth.user.id,
    mediaId: id,
    idempotencyKey: body.idempotencyKey ?? "",
  });
  return NextResponse.json(result, { status });
}
