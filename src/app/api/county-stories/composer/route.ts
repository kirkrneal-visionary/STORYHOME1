import { NextResponse } from "next/server";
import { countyStoryAdminClient } from "@/lib/county-stories/admin";
import { readCountyStoryComposerStatus } from "@/lib/county-stories/composer-status";
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
  const status = await readCountyStoryComposerStatus({
    admin,
    ownerId: auth.user.id,
  });
  if (!status.ok) {
    return NextResponse.json({ ok: false, error: "Unable to load." }, { status: 503 });
  }
  return NextResponse.json({
    ok: true,
    storyDay: status.storyDay,
    suspended: status.suspended,
    eligibleAt: status.eligibleAt,
    slot: status.slot,
  });
}
