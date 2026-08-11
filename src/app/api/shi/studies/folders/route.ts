import { NextResponse } from "next/server";
import { requireStoryPro } from "@/lib/shi/require-pro";
import {
  createStudyFolder,
  deleteStudyFolder,
  listStudyFolders,
  renameStudyFolder,
} from "@/lib/shi/studies";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const gate = await requireStoryPro();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }
  const countySource =
    new URL(request.url).searchParams.get("countySource")?.trim() || undefined;
  try {
    const folders = await listStudyFolders(
      gate.supabase,
      gate.user.id,
      countySource,
    );
    return NextResponse.json({ folders });
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof Error
            ? e.message
            : "Could not load study folders (apply migration 0023?)",
        folders: [],
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
  let body: { name?: string; countySource?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  try {
    const folder = await createStudyFolder(gate.supabase, gate.user.id, {
      name: body.name ?? "",
      countySource: body.countySource ?? "",
    });
    return NextResponse.json({ folder });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Could not create folder" },
      { status: 400 },
    );
  }
}

export async function PATCH(request: Request) {
  const gate = await requireStoryPro();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }
  let body: { folderId?: string; name?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.folderId) {
    return NextResponse.json({ error: "folderId is required" }, { status: 400 });
  }
  try {
    const folder = await renameStudyFolder(
      gate.supabase,
      gate.user.id,
      body.folderId,
      body.name ?? "",
    );
    return NextResponse.json({ folder });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Could not rename folder" },
      { status: 400 },
    );
  }
}

export async function DELETE(request: Request) {
  const gate = await requireStoryPro();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }
  const folderId =
    new URL(request.url).searchParams.get("folderId")?.trim() || "";
  if (!folderId) {
    return NextResponse.json({ error: "folderId is required" }, { status: 400 });
  }
  try {
    await deleteStudyFolder(gate.supabase, gate.user.id, folderId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Could not delete folder" },
      { status: 400 },
    );
  }
}
