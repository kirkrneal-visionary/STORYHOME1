import { NextResponse } from "next/server";
import { countyStoryAdminClient } from "@/lib/county-stories/admin";
import { supabaseCountyStoryStorage } from "@/lib/county-stories/media-service";
import { startCountyStoryProviderProcessing } from "@/lib/county-stories/provider-processing";
import { requireCountyStoryPublisher } from "@/lib/county-stories/require-publisher";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_request: Request, ctx: Ctx) {
  const auth = await requireCountyStoryPublisher();
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }
  const admin = countyStoryAdminClient();
  if (!admin) {
    return NextResponse.json({ ok: false, error: "Unable to process." }, { status: 503 });
  }
  const { id } = await ctx.params;
  const { result, status } = await startCountyStoryProviderProcessing({
    admin,
    storage: supabaseCountyStoryStorage(admin),
    ownerId: auth.user.id,
    mediaId: id,
  });
  return NextResponse.json(result, { status });
}
