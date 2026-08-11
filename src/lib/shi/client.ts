import type { CadSearchField } from "@/lib/cad-layers";
import type { DrawnBoundary } from "@/lib/geo";
import type { ShiProspectStatus } from "@/lib/shi/prospect-statuses";
import type {
  ShiAreaAnalysis,
  ShiCountyFreshness,
  ShiFarm,
  ShiFarmDetail,
  ShiOwnerMatch,
  ShiProspect,
  ShiProspectDetail,
  ShiProspectNote,
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

export async function shiRenameFolder(opts: {
  folderId: string;
  name: string;
}) {
  const body = await shiFetch<{ folder: ShiStudyFolder }>(
    "/api/shi/studies/folders",
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(opts),
    },
  );
  return body.folder;
}

export async function shiDeleteFolder(folderId: string) {
  await shiFetch<{ ok: boolean }>(
    `/api/shi/studies/folders?folderId=${encodeURIComponent(folderId)}`,
    { method: "DELETE" },
  );
}

export async function shiListFrames(folderId: string) {
  const body = await shiFetch<{ frames: ShiSavedFrame[] }>(
    `/api/shi/studies/frames?folderId=${encodeURIComponent(folderId)}`,
  );
  return body.frames ?? [];
}

/** Load one saved frame (durable Vault → Research reopen). */
export async function shiGetFrame(frameId: string) {
  const body = await shiFetch<{ frame: ShiSavedFrame }>(
    `/api/shi/studies/frames?frameId=${encodeURIComponent(frameId)}`,
  );
  return body.frame;
}

export async function shiSaveFrame(opts: {
  folderId: string;
  name: string;
  color: string;
  boundary: DrawnBoundary;
  /** Optional — server recomputes; kept for backward-compatible clients. */
  analysis?: ShiAreaAnalysis;
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

export async function shiRenameFrame(opts: { frameId: string; name: string }) {
  const body = await shiFetch<{ frame: ShiSavedFrame }>(
    "/api/shi/studies/frames",
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(opts),
    },
  );
  return body.frame;
}

export async function shiDeleteFrame(frameId: string) {
  await shiFetch<{ ok: boolean }>(
    `/api/shi/studies/frames?frameId=${encodeURIComponent(frameId)}`,
    { method: "DELETE" },
  );
}

export async function shiThumbnailUrl(thumbnailPath: string) {
  const body = await shiFetch<{ url: string | null }>(
    `/api/shi/studies/frames?thumbnailPath=${encodeURIComponent(thumbnailPath)}`,
  );
  return body.url;
}

/** Hand-off a saved frame from Study Vault → Research cockpit. */
export const SHI_OPEN_FRAME_KEY = "shi:openSavedFrame";

export function queueOpenSavedFrame(frame: ShiSavedFrame) {
  try {
    sessionStorage.setItem(SHI_OPEN_FRAME_KEY, JSON.stringify(frame));
  } catch {
    /* private mode */
  }
}

export function consumeOpenSavedFrame(): ShiSavedFrame | null {
  try {
    const raw = sessionStorage.getItem(SHI_OPEN_FRAME_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(SHI_OPEN_FRAME_KEY);
    return JSON.parse(raw) as ShiSavedFrame;
  } catch {
    return null;
  }
}

/* ----------------------------- Prospects (SHI-3) ----------------------------- */

export async function shiListProspects(opts?: {
  status?: string;
  q?: string;
}): Promise<{
  prospects: ShiProspect[];
  summary: {
    total: number;
    byStatus: Partial<Record<ShiProspectStatus, number>>;
  };
}> {
  const params = new URLSearchParams();
  if (opts?.status) params.set("status", opts.status);
  if (opts?.q) params.set("q", opts.q);
  const q = params.toString();
  return shiFetch(`/api/shi/prospects${q ? `?${q}` : ""}`);
}

export async function shiAddProspect(input: {
  source: string;
  propId: string;
  countyFips?: string | null;
  countyName: string;
  label?: string | null;
  ownerName?: string | null;
  situsAddress?: string | null;
  situsCity?: string | null;
  legalAcreage?: number | null;
  marketValue?: number | null;
  centroidLat?: number | null;
  centroidLng?: number | null;
  status?: ShiProspectStatus;
}): Promise<{ prospect: ShiProspect; created: boolean }> {
  return shiFetch("/api/shi/prospects", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

export async function shiGetProspect(
  id: string,
): Promise<ShiProspectDetail | null> {
  const body = await shiFetch<{ prospect: ShiProspectDetail }>(
    `/api/shi/prospects/${encodeURIComponent(id)}`,
  );
  return body.prospect ?? null;
}

export async function shiUpdateProspectStatus(
  id: string,
  status: ShiProspectStatus,
): Promise<ShiProspect> {
  const body = await shiFetch<{ prospect: ShiProspect }>(
    `/api/shi/prospects/${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    },
  );
  return body.prospect;
}

export async function shiAddProspectNote(
  id: string,
  noteBody: string,
): Promise<ShiProspectNote> {
  const body = await shiFetch<{ note: ShiProspectNote }>(
    `/api/shi/prospects/${encodeURIComponent(id)}/notes`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: noteBody }),
    },
  );
  return body.note;
}

export async function shiConvertProspectToSellerLead(id: string): Promise<{
  prospect: ShiProspect;
  sellerClientId: string;
}> {
  return shiFetch(`/api/shi/prospects/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ convertToSellerLead: true }),
  });
}

/* ------------------------------- Farms (SHI-4) ------------------------------- */

export async function shiListFarms(): Promise<ShiFarm[]> {
  const body = await shiFetch<{ farms: ShiFarm[] }>("/api/shi/farms");
  return body.farms ?? [];
}

export async function shiCreateFarm(input: {
  name: string;
  countySource: string;
  countyName?: string;
  boundary: DrawnBoundary;
  mapCenterLat?: number | null;
  mapCenterLng?: number | null;
  mapZoom?: number | null;
}): Promise<ShiFarmDetail> {
  const body = await shiFetch<{ farm: ShiFarmDetail }>("/api/shi/farms", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return body.farm;
}

export async function shiGetFarm(id: string): Promise<ShiFarmDetail> {
  const body = await shiFetch<{ farm: ShiFarmDetail }>(
    `/api/shi/farms/${encodeURIComponent(id)}`,
  );
  return body.farm;
}

export async function shiMarkFarmReviewed(id: string): Promise<ShiFarmDetail> {
  const body = await shiFetch<{ farm: ShiFarmDetail }>(
    `/api/shi/farms/${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markReviewed: true }),
    },
  );
  return body.farm;
}

export async function shiDeleteFarm(id: string): Promise<void> {
  await shiFetch<{ ok: boolean }>(
    `/api/shi/farms/${encodeURIComponent(id)}`,
    { method: "DELETE" },
  );
}
