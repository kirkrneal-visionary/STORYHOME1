import { NextResponse } from "next/server";
import { countyStoryAdminClient } from "@/lib/county-stories/admin";
import {
  readOwnedCountyStoryCaptionCues,
  saveCountyStoryCaptions,
} from "@/lib/county-stories/captions-service";
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
  const cues = await readOwnedCountyStoryCaptionCues({
    admin,
    ownerId: auth.user.id,
    mediaId: id,
  });
  if (!cues) {
    return NextResponse.json({ ok: false, error: "Not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true, mediaId: id, format: "webvtt_cues", cues });
}

export async function PUT(request: Request, ctx: Ctx) {
  const auth = await requireCountyStoryPublisher();
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }
  const admin = countyStoryAdminClient();
  if (!admin) {
    return NextResponse.json({ ok: false, error: "Unable to save." }, { status: 503 });
  }
  const { id } = await ctx.params;
  let body: {
    cues?: unknown;
    expectedRevision?: number;
    source?: string;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }
  const source = body.source === "edited" ? "edited" : "manual";
  const { result, status } = await saveCountyStoryCaptions({
    admin,
    ownerId: auth.user.id,
    mediaId: id,
    cues: Array.isArray(body.cues) ? (body.cues as never) : [],
    expectedRevision: Number(body.expectedRevision ?? -1),
    source,
  });
  return NextResponse.json(result, { status });
}
