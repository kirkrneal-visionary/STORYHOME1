import type { CadSearchField } from "@/lib/cad-layers";
import type { DrawnBoundary } from "@/lib/geo";
import type {
  ShiAreaAnalysis,
  ShiCountyFreshness,
  ShiOwnerMatch,
  ShiPropertyDetail,
  ShiPropertySummary,
  ShiSavedFrame,
  ShiStudyFolder,
} from "@/lib/shi/types";

async function shiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: "same-origin", ...init });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      typeof body?.error === "string"
        ? body.error
        : `Request failed (${res.status})`,
    );
  }
  return body as T;
}

export async function shiSearch(opts: {
  q: string;
  source?: string;
  field?: CadSearchField;
  limit?: number;
}): Promise<{ results: ShiPropertySummary[]; indexNote: string | null }> {
  const params = new URLSearchParams();
  params.set("q", opts.q);
  if (opts.source) params.set("source", opts.source);
  if (opts.field) params.set("field", opts.field);
  if (opts.limit) params.set("limit", String(opts.limit));
  return shiFetch(`/api/shi/search?${params.toString()}`);
}

export async function shiGetProperty(opts: {
  propId: string;
  source?: string;
  countyFips?: string;
  preferredSource?: string;
  nearLat?: number;
  nearLng?: number;
}): Promise<ShiPropertyDetail | null> {
  const params = new URLSearchParams();
  params.set("propId", opts.propId);
  if (opts.source) params.set("source", opts.source);
  if (opts.countyFips) params.set("countyFips", opts.countyFips);
  if (opts.preferredSource) params.set("preferredSource", opts.preferredSource);
  if (opts.nearLat != null) params.set("nearLat", String(opts.nearLat));
  if (opts.nearLng != null) params.set("nearLng", String(opts.nearLng));
  const body = await shiFetch<{ property: ShiPropertyDetail | null }>(
    `/api/shi/property?${params.toString()}`,
  );
  return body.property;
}

export async function shiFreshness(): Promise<ShiCountyFreshness[]> {
  const body = await shiFetch<{ counties: ShiCountyFreshness[] }>(
    "/api/shi/freshness",
  );
  return body.counties ?? [];
}

export async function shiOwnerMatches(opts: {
  source: string;
  propId: string;
  cadOwnerId?: string | null;
  ownerName?: string | null;
}): Promise<{
  matches: ShiOwnerMatch[];
  exactCount: number;
  possibleCount: number;
  note: string;
}> {
  const params = new URLSearchParams();
  params.set("source", opts.source);
  params.set("propId", opts.propId);
  if (opts.cadOwnerId) params.set("cadOwnerId", opts.cadOwnerId);
  if (opts.ownerName) params.set("ownerName", opts.ownerName);
  return shiFetch(`/api/shi/owner-matches?${params.toString()}`);
}

export async function shiAnalyzeArea(opts: {
  boundary: DrawnBoundary;
  source: string;
}): Promise<ShiAreaAnalysis> {
  const body = await shiFetch<{ analysis: ShiAreaAnalysis }>("/api/shi/area", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      boundary: opts.boundary,
      source: opts.source,
    }),
  });
  return body.analysis;
}

export async function shiListFolders(countySource?: string) {
  const params = new URLSearchParams();
  if (countySource) params.set("countySource", countySource);
  const q = params.toString();
  const body = await shiFetch<{ folders: ShiStudyFolder[] }>(
    `/api/shi/studies/folders${q ? `?${q}` : ""}`,
  );
  return body.folders ?? [];
}

export async function shiCreateFolder(opts: {
  name: string;
  countySource: string;
}) {
  const body = await shiFetch<{ folder: ShiStudyFolder }>(
    "/api/shi/studies/folders",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(opts),
    },
  );
  return body.folder;
}

export async function shiListFrames(folderId: string) {
  const body = await shiFetch<{ frames: ShiSavedFrame[] }>(
    `/api/shi/studies/frames?folderId=${encodeURIComponent(folderId)}`,
  );
  return body.frames ?? [];
}

export async function shiSaveFrame(opts: {
  folderId: string;
  name: string;
  color: string;
  boundary: DrawnBoundary;
  analysis: ShiAreaAnalysis;
  mapCenterLat?: number;
  mapCenterLng?: number;
  mapZoom?: number;
  thumbnailDataUrl?: string | null;
  frameId?: string;
}) {
  const body = await shiFetch<{ frame: ShiSavedFrame }>(
    "/api/shi/studies/frames",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(opts),
    },
  );
  return body.frame;
}
