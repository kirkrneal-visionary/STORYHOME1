import { NextResponse } from "next/server";
import { countyStoryAdminClient } from "@/lib/county-stories/admin";
import { readCountyStoryPlayback } from "@/lib/county-stories/viewer-feed";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HEADERS = {
  "Cache-Control": "no-store",
  "X-Robots-Tag": "noindex",
};

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  const admin = countyStoryAdminClient();
  if (!admin) {
    return NextResponse.json(
      { ok: false, error: "Unable to play." },
      { status: 503, headers: HEADERS },
    );
  }
  const { id } = await ctx.params;
  const result = await readCountyStoryPlayback({ admin, storyId: id });
  if (!result.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: result.status === 404 ? "Not available." : "Unable to play.",
      },
      { status: result.status, headers: HEADERS },
    );
  }
  return NextResponse.json(result, { headers: HEADERS });
}
