import { NextResponse } from "next/server";
import { countyStoryAdminClient } from "@/lib/county-stories/admin";
import {
  countyStoriesPublishEnabled,
  replaceCountyStoryMedia,
} from "@/lib/county-stories/publish-service";
import { requireCountyStoryPublisher } from "@/lib/county-stories/require-publisher";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const auth = await requireCountyStoryPublisher();
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }
  const admin = countyStoryAdminClient();
  if (!admin) {
    return NextResponse.json({ ok: false, error: "Unable to replace." }, { status: 503 });
  }
  if (!(await countyStoriesPublishEnabled(admin))) {
    return NextResponse.json(
      { ok: false, code: "FEATURE_DISABLED", error: "Not available." },
      { status: 403 },
    );
  }
  let body: {
    slotId?: string;
    mediaId?: string;
    idempotencyKey?: string;
    rulesAcknowledged?: boolean;
    listingId?: string | null;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }
  const { result, status } = await replaceCountyStoryMedia({
    admin,
    ownerId: auth.user.id,
    slotId: body.slotId ?? "",
    mediaId: body.mediaId ?? "",
    idempotencyKey: body.idempotencyKey ?? "",
    rulesAcknowledged: body.rulesAcknowledged === true,
    listingId: body.listingId ?? null,
  });
  return NextResponse.json(result, { status });
}
