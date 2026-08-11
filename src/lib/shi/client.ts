import type { CadSearchField } from "@/lib/cad-layers";
import type {
  ShiCountyFreshness,
  ShiPropertyDetail,
  ShiPropertySummary,
} from "@/lib/shi/types";

async function shiFetch<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: "same-origin" });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      typeof body?.error === "string" ? body.error : `Request failed (${res.status})`,
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
}): Promise<ShiPropertyDetail | null> {
  const params = new URLSearchParams();
  params.set("propId", opts.propId);
  if (opts.source) params.set("source", opts.source);
  if (opts.countyFips) params.set("countyFips", opts.countyFips);
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
