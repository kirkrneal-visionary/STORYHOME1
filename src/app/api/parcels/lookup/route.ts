import { NextResponse } from "next/server";
import {
  boundedCadAddressMatch,
  boundedCadLookup,
  boundedCadValues,
  CAD_LOOKUP_MAX,
} from "@/lib/cad/bounded-search";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Bounded public parcel lookup by CAD id(s). Caps prevent table enumeration.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const propIds = Array.isArray((body as { propIds?: unknown }).propIds)
    ? ((body as { propIds: unknown[] }).propIds)
        .filter((id): id is string => typeof id === "string")
        .slice(0, CAD_LOOKUP_MAX)
    : [];
  const propId =
    typeof (body as { propId?: unknown }).propId === "string"
      ? (body as { propId: string }).propId
      : "";
  const source =
    typeof (body as { source?: unknown }).source === "string"
      ? (body as { source: string }).source
      : "";
  const countyFips =
    typeof (body as { countyFips?: unknown }).countyFips === "string"
      ? (body as { countyFips: string }).countyFips
      : "";
  const includeValues = Boolean((body as { values?: unknown }).values);
  const addressLine =
    typeof (body as { addressLine?: unknown }).addressLine === "string"
      ? (body as { addressLine: string }).addressLine
      : "";
  const zip =
    typeof (body as { zip?: unknown }).zip === "string"
      ? (body as { zip: string }).zip
      : "";

  try {
    const parcels = addressLine
      ? await boundedCadAddressMatch({ addressLine, zip })
      : await boundedCadLookup({
          propIds,
          propId,
          source: source || undefined,
          countyFips: countyFips || undefined,
        });
    const values =
      includeValues && (propId || parcels[0]?.propId)
        ? await boundedCadValues({
            propId: propId || parcels[0]!.propId,
            source: source || parcels[0]?.source,
          })
        : [];
    return NextResponse.json(
      { parcels, values },
      { headers: { "Cache-Control": "public, max-age=60" } },
    );
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Parcel lookup failed" },
      { status: 503 },
    );
  }
}
