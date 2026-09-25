import { NextResponse } from "next/server";
import { countyStoryAdminClient } from "@/lib/county-stories/admin";
import { readCountyStorySuspension } from "@/lib/county-stories/enforcement-service";
import { requireCountyStoryPublisher } from "@/lib/county-stories/require-publisher";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireCountyStoryPublisher();
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }
  const admin = countyStoryAdminClient();
  if (!admin) {
    return NextResponse.json({ ok: false, error: "Unable to load." }, { status: 503 });
  }
  const result = await readCountyStorySuspension({
    admin,
    ownerId: auth.user.id,
  });
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
