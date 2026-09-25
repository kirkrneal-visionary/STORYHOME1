import { NextResponse } from "next/server";
import { countyStoryAdminClient } from "@/lib/county-stories/admin";
import {
  COUNTY_STORY_MEDIA_MAX_BYTES,
  COUNTY_STORY_MEDIA_UPLOAD_TTL_SEC,
} from "@/lib/county-stories/media";
import {
  stageCountyStoryMedia,
  supabaseCountyStoryStorage,
} from "@/lib/county-stories/media-service";
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
    return NextResponse.json({ ok: false, error: "Unable to stage." }, { status: 503 });
  }
  let body: {
    purpose?: string;
    contentType?: string;
    byteSize?: number;
    uploadKey?: string;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }
  const purpose = body.purpose === "replacement" ? "replacement" : "original";
  const result = await stageCountyStoryMedia({
    admin,
    storage: supabaseCountyStoryStorage(admin),
    ownerId: auth.user.id,
    purpose,
    declaredType: body.contentType ?? "",
    byteSize: Number(body.byteSize ?? 0),
    uploadKey: body.uploadKey ?? null,
  });
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, code: result.code, error: result.error },
      { status: result.status },
    );
  }
  return NextResponse.json({
    ok: true,
    id: result.media.id,
    state: result.media.state,
    uploadUrl: result.uploadUrl,
    token: result.token,
    expiresAt: result.media.expires_at,
    maxBytes: COUNTY_STORY_MEDIA_MAX_BYTES,
    uploadTtlSec: COUNTY_STORY_MEDIA_UPLOAD_TTL_SEC,
  });
}
