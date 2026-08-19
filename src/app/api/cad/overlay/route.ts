import { NextResponse } from "next/server";
import {
  CAD_OVERLAYS,
  getBisServer,
  type CadOverlayId,
} from "@/lib/cad-layers";
import {
  CAD_OVERLAY_MAX_BBOX_DEG,
  CAD_OVERLAY_MAX_FEATURES,
  parseOverlayBbox,
  takeOverlayRateToken,
} from "@/lib/cad-overlay-abuse";
import { requireStoryPro } from "@/lib/shi/require-pro";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Viewport GeoJSON for a BIS CAD overlay layer.
 * Story Pro only. Zoomed-in bbox. Per-user rate cap.
 * GET /api/cad/overlay?source=polk_cad&layer=abstracts&west=&south=&east=&north=
 */
export async function GET(req: Request) {
  const gate = await requireStoryPro();
  if (!gate.ok) {
    return NextResponse.json(
      { error: gate.error, type: "FeatureCollection", features: [] },
      { status: gate.status },
    );
  }

  if (!takeOverlayRateToken(gate.user.id)) {
    return NextResponse.json(
      {
        error: "Too many overlay requests. Pan less often or wait a minute.",
        type: "FeatureCollection",
        features: [],
      },
      { status: 429 },
    );
  }

  const url = new URL(req.url);
  const source = url.searchParams.get("source") || "";
  const layer = (url.searchParams.get("layer") || "") as CadOverlayId;
  const bbox = parseOverlayBbox(url.searchParams);

  const server = getBisServer(source);
  if (!server) {
    return NextResponse.json(
      { error: `Unknown or non-BIS CAD source: ${source}` },
      { status: 400 },
    );
  }
  if (!CAD_OVERLAYS.some((o) => o.id === layer)) {
    return NextResponse.json({ error: `Unknown layer: ${layer}` }, { status: 400 });
  }
  if (!bbox) {
    return NextResponse.json(
      {
        error: `Valid west,south,east,north bbox required (max ~${CAD_OVERLAY_MAX_BBOX_DEG}°)`,
      },
      { status: 400 },
    );
  }

  const layerId = server.layers[layer];
  const geometry = `${bbox.west},${bbox.south},${bbox.east},${bbox.north}`;
  const qs = new URLSearchParams({
    where: "1=1",
    geometry,
    geometryType: "esriGeometryEnvelope",
    inSR: "4326",
    spatialRel: "esriSpatialRelIntersects",
    outFields: "*",
    returnGeometry: "true",
    outSR: "4326",
    f: "geojson",
    resultRecordCount: String(CAD_OVERLAY_MAX_FEATURES),
  });

  const arcUrl = `${server.rootUrl}/${layerId}/query?${qs.toString()}`;
  try {
    const res = await fetch(arcUrl, {
      headers: { "User-Agent": "StoryHome-CAD-Overlay/1.0" },
      next: { revalidate: 0 },
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: `ArcGIS ${res.status}`, type: "FeatureCollection", features: [] },
        { status: 502 },
      );
    }
    const json = await res.json();
    if (json.error) {
      return NextResponse.json(
        { error: json.error, type: "FeatureCollection", features: [] },
        { status: 502 },
      );
    }
    return NextResponse.json(json, {
      headers: {
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch (e) {
    return NextResponse.json(
      {
        error: e instanceof Error ? e.message : "overlay fetch failed",
        type: "FeatureCollection",
        features: [],
      },
      { status: 502 },
    );
  }
}
