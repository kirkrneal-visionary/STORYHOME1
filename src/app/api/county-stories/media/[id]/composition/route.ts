import { NextResponse } from "next/server";
import { countyStoryAdminClient } from "@/lib/county-stories/admin";
import { beginCountyStoryComposition } from "@/lib/county-stories/composition-service";
import { COUNTY_STORY_DEFAULT_BACKGROUND } from "@/lib/county-stories/composition-policy";
import { supabaseCountyStoryStorage } from "@/lib/county-stories/media-service";
import { requireCountyStoryPublisher } from "@/lib/county-stories/require-publisher";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: Request, ctx: Ctx) {
  const auth = await requireCountyStoryPublisher();
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  const admin = countyStoryAdminClient();
  if (!admin) return NextResponse.json({ ok: false, error: "Story preparation is not available yet." }, { status: 503 });
  const { id } = await ctx.params;
  try {
    await request.json();
  } catch {
    /* A professional cannot choose the unused-space treatment. */
  }
  const result = await beginCountyStoryComposition({
    admin,
    storage: supabaseCountyStoryStorage(admin),
    ownerId: auth.user.id,
    mediaId: id,
    background: COUNTY_STORY_DEFAULT_BACKGROUND,
  });
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error, code: result.code }, { status: result.status });
  }
  return NextResponse.json({ ok: true, state: result.state, queued: result.queued });
}
