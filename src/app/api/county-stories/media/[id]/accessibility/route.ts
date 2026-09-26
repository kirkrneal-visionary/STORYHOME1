import { NextResponse } from "next/server";
import { countyStoryAdminClient } from "@/lib/county-stories/admin";
import {
  readCountyStoryAccessibilityStatus,
  saveCountyStoryVisualAccess,
} from "@/lib/county-stories/accessibility-service";
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
  const { result, status } = await readCountyStoryAccessibilityStatus({
    admin,
    ownerId: auth.user.id,
    mediaId: id,
  });
  return NextResponse.json(result, { status });
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
    basis?: string;
    description?: string | null;
    storyType?: string | null;
    countyFips?: string | null;
    listingId?: string | null;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }
  if (body.basis !== "spoken_audio" && body.basis !== "supplied_description") {
    return NextResponse.json(
      { ok: false, code: "NOT_ELIGIBLE", error: "Visual-information basis is not valid." },
      { status: 400 },
    );
  }
  const { result, status } = await saveCountyStoryVisualAccess({
    admin,
    ownerId: auth.user.id,
    mediaId: id,
    basis: body.basis,
    description: body.description ?? null,
    storyType: body.storyType ?? null,
    countyFips: body.countyFips ?? null,
    listingId: body.listingId ?? null,
  });
  return NextResponse.json(result, { status });
}
