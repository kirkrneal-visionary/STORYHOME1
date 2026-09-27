import { NextResponse } from "next/server";
import { countyStoryAdminClient } from "@/lib/county-stories/admin";
import { loadOwnedCountyStoryMedia } from "@/lib/county-stories/media-service";
import { requireCountyStoryPublisher } from "@/lib/county-stories/require-publisher";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  const auth = await requireCountyStoryPublisher();
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }
  const admin = countyStoryAdminClient();
  if (!admin) {
    return NextResponse.json({ ok: false, error: "Unable to load." }, { status: 503 });
  }
  const { id } = await ctx.params;
  const media = await loadOwnedCountyStoryMedia(admin, auth.user.id, id);
  if (!media) {
    return NextResponse.json({ ok: false, error: "Not found." }, { status: 404 });
  }
  const { data: cues } = await admin
    .from("county_story_caption_cues")
    .select("cue_index, start_ms, end_ms, text")
    .eq("media_id", id)
    .order("cue_index", { ascending: true });
  const captionCues = (cues ?? []).map((cue) => ({
    index: cue.cue_index,
    startMs: cue.start_ms,
    endMs: cue.end_ms,
    text: cue.text,
  }));
  const failed = media.state === "invalid" || media.provider_status === "errored";
  const playbackReady = Boolean(media.playback_ready_at);
  const ready = playbackReady && captionCues.length > 0 && !failed;
  const phase = failed ? "failed" : ready ? "ready" : "preparing";
  return NextResponse.json({
    ok: true,
    phase,
    playbackReady,
    captionRevision: media.caption_revision ?? 0,
    durationMs: media.duration_ms ?? null,
    cues: captionCues,
  });
}
