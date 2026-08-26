import { NextResponse, type NextRequest } from "next/server";
import { verifyTrecLicense } from "@/lib/trec";

/**
 * Public verification endpoint for the pro-onboarding gate. Given a TREC license
 * number (and optional last name), returns whether it resolves to an ACTIVE
 * Texas license, its type (broker vs sales agent), and the sponsoring broker.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const license = searchParams.get("license")?.trim() ?? "";
  const lastName = searchParams.get("lastName")?.trim() || undefined;
  if (!license) {
    return NextResponse.json({ error: "license is required" }, { status: 400 });
  }
  try {
    const result = await verifyTrecLicense(license, lastName);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: "License check failed. Try again." },
      { status: 502 },
    );
  }
}
