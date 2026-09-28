import { NextResponse } from "next/server";
import { countyStoryAdminClient } from "@/lib/county-stories/admin";
import { applyCompositionCallback, commitValidatedComposition } from "@/lib/county-stories/composition-service";
import { supabaseCountyStoryStorage } from "@/lib/county-stories/media-service";
import { maybeStartCountyStoryProviderProcessing } from "@/lib/county-stories/provider-processing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: Request, ctx: Ctx) {
  const admin = countyStoryAdminClient();
  if (!admin) return NextResponse.json({ ok: false }, { status: 503 });
  const { id } = await ctx.params;
  let body: { mediaId?: string; manifestHash?: string; ok?: boolean };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  if (body.mediaId !== id || typeof body.manifestHash !== "string") {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const applied = await applyCompositionCallback({
    admin,
    mediaId: id,
    manifestHash: body.manifestHash,
    ok: body.ok !== false,
    signature: request.headers.get("x-story-compose-signature") ?? "",
  });
  if (!applied.ok) return NextResponse.json({ ok: false }, { status: applied.status });
  if (applied.awaitValidation && applied.outputPath) {
    const storage = supabaseCountyStoryStorage(admin);
    const committed = await commitValidatedComposition({
      admin,
      storage,
      mediaId: id,
      manifestHash: body.manifestHash,
      outputPath: applied.outputPath,
    });
    if (!committed.ok) return NextResponse.json({ ok: false }, { status: committed.status });
    const { data } = await admin.from("county_story_media").select("professional_owner_id").eq("id", id).maybeSingle();
    const ownerId = typeof data?.professional_owner_id === "string" ? data.professional_owner_id : "";
    if (ownerId) {
      await maybeStartCountyStoryProviderProcessing({
        admin,
        storage,
        ownerId,
        mediaId: id,
      });
    }
  }
  return NextResponse.json({ ok: true, applied: applied.applied });
}
