import { NextResponse } from "next/server";
import { countyStoryAdminClient } from "@/lib/county-stories/admin";
import { isCountyStoryType } from "@/lib/county-stories/publish";
import {
  countyStoriesPublishEnabled,
  publishCountyStory,
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
    return NextResponse.json({ ok: false, error: "Unable to publish." }, { status: 503 });
  }
  if (!(await countyStoriesPublishEnabled(admin))) {
    return NextResponse.json(
      { ok: false, code: "FEATURE_DISABLED", error: "Not available." },
      { status: 403 },
    );
  }
  let body: {
    mediaId?: string;
    countyFips?: string;
    storyType?: string;
    listingId?: string | null;
    idempotencyKey?: string;
    rulesAcknowledged?: boolean;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }
  if (!isCountyStoryType(body.storyType ?? "")) {
    return NextResponse.json(
      { ok: false, code: "NOT_ELIGIBLE", error: "Story type is not valid." },
      { status: 400 },
    );
  }
  const { result, status } = await publishCountyStory({
    admin,
    ownerId: auth.user.id,
    mediaId: body.mediaId ?? "",
    countyFips: body.countyFips ?? "",
    storyType: body.storyType ?? "",
    listingId: body.listingId ?? null,
    idempotencyKey: body.idempotencyKey ?? "",
    rulesAcknowledged: body.rulesAcknowledged === true,
  });
  return NextResponse.json(result, { status });
}
