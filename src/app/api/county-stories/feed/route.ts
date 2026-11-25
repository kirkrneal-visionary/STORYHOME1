import { NextResponse } from "next/server";
import { countyStoryAdminClient } from "@/lib/county-stories/admin";
import { readCountyStoriesFeed } from "@/lib/county-stories/viewer-feed";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HEADERS = {
  "Cache-Control": "no-store",
  "X-Robots-Tag": "noindex",
};

export async function GET() {
  const admin = countyStoryAdminClient();
  if (!admin) {
    return NextResponse.json(
      { ok: false, error: "Unable to load." },
      { status: 503, headers: HEADERS },
    );
  }
  const feed = await readCountyStoriesFeed({ admin });
  if (!feed.ok) {
    return NextResponse.json(
      { ok: false, error: "Unable to load." },
      { status: 503, headers: HEADERS },
    );
  }
  return NextResponse.json(feed, { headers: HEADERS });
}
