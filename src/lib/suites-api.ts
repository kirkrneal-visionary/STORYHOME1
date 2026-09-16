import type { StorySuite } from "@/lib/suites";

async function suitesFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: "same-origin", ...init });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(
      typeof body?.error === "string" ? body.error : `Request failed (${res.status})`,
    ) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  return body as T;
}

export async function apiListSuites(): Promise<StorySuite[]> {
  const body = await suitesFetch<{ suites: StorySuite[] }>("/api/suites");
  return body.suites ?? [];
}

export async function apiCreateSuite(input: {
  name: string;
  description?: string;
  coverTone?: string;
  listingIds?: string[];
}): Promise<{ suite: StorySuite; suites: StorySuite[] }> {
  return suitesFetch("/api/suites", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

export async function apiRenameSuite(id: string, name: string): Promise<StorySuite> {
  const body = await suitesFetch<{ suite: StorySuite }>(`/api/suites/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  return body.suite;
}

export async function apiDeleteSuite(id: string): Promise<void> {
  await suitesFetch(`/api/suites/${id}`, { method: "DELETE" });
}

export async function apiAddListing(suiteId: string, listingId: string): Promise<StorySuite> {
  const body = await suitesFetch<{ suite: StorySuite }>(
    `/api/suites/${suiteId}/items`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listingId }),
    },
  );
  return body.suite;
}

export async function apiRemoveListing(
  suiteId: string,
  listingId: string,
): Promise<StorySuite> {
  const body = await suitesFetch<{ suite: StorySuite }>(
    `/api/suites/${suiteId}/items?listingId=${encodeURIComponent(listingId)}`,
    { method: "DELETE" },
  );
  return body.suite;
}

export async function apiShareSuite(id: string): Promise<StorySuite> {
  const body = await suitesFetch<{ suite: StorySuite }>(`/api/suites/share/${id}`);
  return body.suite;
}
