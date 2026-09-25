import { NextResponse } from "next/server";
import { countyStoryAdminClient } from "@/lib/county-stories/admin";
import { readCountyStoryCapacity } from "@/lib/county-stories/publish-service";
import { requireCountyStoryPublisher } from "@/lib/county-stories/require-publisher";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireCountyStoryPublisher();
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }
  const admin = countyStoryAdminClient();
  if (!admin) {
    return NextResponse.json({ ok: false, error: "Unable to load." }, { status: 503 });
  }
  const countyFips = new URL(request.url).searchParams.get("county") ?? "";
  const result = await readCountyStoryCapacity({ admin, countyFips });
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
