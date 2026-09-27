import { NextResponse } from "next/server";
import { countyStoryAdminClient } from "@/lib/county-stories/admin";
import { isCountyStoryCountyActive } from "@/lib/county-stories/activation";
import { listAttachableCountyStoryListings } from "@/lib/county-stories/composer-status";
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
  const url = new URL(request.url);
  const countyFips = url.searchParams.get("county") ?? "";
  if (!isCountyStoryCountyActive(countyFips)) {
    return NextResponse.json({ ok: false, error: "That County is not open for Stories." }, { status: 400 });
  }
  const listings = await listAttachableCountyStoryListings({
    admin,
    ownerId: auth.user.id,
    brokerageId: auth.brokerageId,
    accountPurpose: auth.accountPurpose,
    countyFips,
    slotId: url.searchParams.get("slot"),
  });
  return NextResponse.json({ ok: true, listings });
}
