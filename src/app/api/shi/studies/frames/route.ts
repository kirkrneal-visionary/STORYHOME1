import { NextResponse } from "next/server";
import type { DrawnBoundary } from "@/lib/geo";
import { requireStoryPro } from "@/lib/shi/require-pro";
import {
  deleteMarketFrame,
  getMarketFrame,
  listFolderFrames,
  renameMarketFrame,
  saveMarketFrame,
  signedThumbnailUrl,
} from "@/lib/shi/studies";
import type { ShiAreaAnalysis } from "@/lib/shi/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const gate = await requireStoryPro();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }
  const url = new URL(request.url);
  const folderId = url.searchParams.get("folderId")?.trim() || "";
  const frameId = url.searchParams.get("frameId")?.trim() || "";
  const thumbPath = url.searchParams.get("thumbnailPath")?.trim() || "";

  // Signed thumbnail for Study Vault (owner-only path check inside helper).
  if (thumbPath) {
    try {
      const urlSigned = await signedThumbnailUrl(
        gate.supabase,
        gate.user.id,
        thumbPath,
      );
      return NextResponse.json({ url: urlSigned });
    } catch (e) {
      return NextResponse.json(
        {
          error: e instanceof Error ? e.message : "Could not sign thumbnail",
          url: null,
        },
        { status: 400 },
      );
    }
  }

  // Single-frame reopen (Vault → Research via ?openFrame=).
  if (frameId) {
    try {
      const frame = await getMarketFrame(
        gate.supabase,
        gate.user.id,
        frameId,
      );
      return NextResponse.json({ frame });
    } catch (e) {
      return NextResponse.json(
        {
          error: e instanceof Error ? e.message : "Frame not found",
          frame: null,
        },
        { status: 404 },
      );
    }
  }

  if (!folderId) {
    return NextResponse.json(
      { error: "folderId is required", frames: [] },
      { status: 400 },
    );
  }
  try {
    const frames = await listFolderFrames(
      gate.supabase,
      gate.user.id,
      folderId,
    );
    return NextResponse.json({ frames });
  } catch (e) {
    return NextResponse.json(
      {
        error: e instanceof Error ? e.message : "Could not load frames",
        frames: [],
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const gate = await requireStoryPro();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  let body: {
    folderId?: string;
    name?: string;
    color?: string;
    boundary?: DrawnBoundary;
    analysis?: ShiAreaAnalysis;
    mapCenterLat?: number;
    mapCenterLng?: number;
    mapZoom?: number;
    thumbnailDataUrl?: string | null;
    frameId?: string;
    researchMode?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.folderId || !body.boundary) {
    return NextResponse.json(
      { error: "folderId and boundary are required" },
      { status: 400 },
    );
  }

  try {
    // Server recomputes analysis from CAD for the folder county — client metrics are not trusted.
    const frame = await saveMarketFrame(gate.supabase, gate.user.id, {
      folderId: body.folderId,
      name: body.name ?? "Market frame",
      color: body.color ?? "#17335e",
      boundary: body.boundary,
      analysis: body.analysis,
      mapCenterLat: body.mapCenterLat,
      mapCenterLng: body.mapCenterLng,
      mapZoom: body.mapZoom,
      thumbnailDataUrl: body.thumbnailDataUrl,
      frameId: body.frameId,
      researchMode: body.researchMode,
    });
    return NextResponse.json({ frame });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Could not save frame" },
      { status: 400 },
    );
  }
}

export async function PATCH(request: Request) {
  const gate = await requireStoryPro();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }
  let body: { frameId?: string; name?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.frameId) {
    return NextResponse.json({ error: "frameId is required" }, { status: 400 });
  }
  try {
    const frame = await renameMarketFrame(
      gate.supabase,
      gate.user.id,
      body.frameId,
      body.name ?? "",
    );
    return NextResponse.json({ frame });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Could not rename frame" },
      { status: 400 },
    );
  }
}

export async function DELETE(request: Request) {
  const gate = await requireStoryPro();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }
  const frameId =
    new URL(request.url).searchParams.get("frameId")?.trim() || "";
  if (!frameId) {
    return NextResponse.json({ error: "frameId is required" }, { status: 400 });
  }
  try {
    await deleteMarketFrame(gate.supabase, gate.user.id, frameId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Could not delete frame" },
      { status: 400 },
    );
  }
}
