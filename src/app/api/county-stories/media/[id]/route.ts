import { NextResponse } from "next/server";
import { countyStoryAdminClient } from "@/lib/county-stories/admin";
import {
  deleteCountyStoryMedia,
  loadOwnedCountyStoryMedia,
  signCountyStoryMediaRead,
  supabaseCountyStoryStorage,
} from "@/lib/county-stories/media-service";
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
  const signed = await signCountyStoryMediaRead({
    storage: supabaseCountyStoryStorage(admin),
    ownerId: auth.user.id,
    media,
  });
  if (!signed.ok) {
    return NextResponse.json({ ok: false, error: signed.error }, { status: signed.status });
  }
  return NextResponse.json({
    ok: true,
    id: media.id,
    state: media.state,
    durationMs: media.duration_ms,
    expiresAt: media.expires_at,
    url: signed.url,
  });
}

export async function DELETE(_request: Request, ctx: Ctx) {
  const auth = await requireCountyStoryPublisher();
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }
  const admin = countyStoryAdminClient();
  if (!admin) {
    return NextResponse.json({ ok: false, error: "Unable to delete." }, { status: 503 });
  }
  const { id } = await ctx.params;
  const result = await deleteCountyStoryMedia({
    admin,
    storage: supabaseCountyStoryStorage(admin),
    ownerId: auth.user.id,
    mediaId: id,
  });
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
  }
  return NextResponse.json({ ok: true });
}
