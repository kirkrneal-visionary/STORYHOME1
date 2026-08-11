import { NextResponse } from "next/server";
import {
  CAD_OVERLAYS,
  getBisServer,
  type CadOverlayId,
} from "@/lib/cad-layers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type BBox = { west: number; south: number; east: number; north: number };

function parseBbox(sp: URLSearchParams): BBox | null {
  const west = Number(sp.get("west"));
  const south = Number(sp.get("south"));
  const east = Number(sp.get("east"));
  const north = Number(sp.get("north"));
  if (![west, south, east, north].every(Number.isFinite)) return null;
  if (east <= west || north <= south) return null;
  // Clamp runaway viewports
  if (east - west > 1.5 || north - south > 1.5) return null;
  return { west, south, east, north };
}

/**
 * Viewport GeoJSON for a BIS CAD overlay layer.
 * GET /api/cad/overlay?source=polk_cad&layer=abstracts&west=&south=&east=&north=
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const source = url.searchParams.get("source") || "";
  const layer = (url.searchParams.get("layer") || "") as CadOverlayId;
  const bbox = parseBbox(url.searchParams);

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
      { error: "Valid west,south,east,north bbox required (max ~1.5°)" },
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
    resultRecordCount: "1500",
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
        "Cache-Control": "public, s-maxage=120, stale-while-revalidate=600",
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
