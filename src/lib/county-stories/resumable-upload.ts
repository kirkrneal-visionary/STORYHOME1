/** Signed Supabase TUS upload. The browser receives a short-lived token, never the service key. */

export const TUS_CHUNK_BYTES = 6 * 1024 * 1024;
export const TUS_VERSION = "1.0.0";

export function encodeUtf8Base64(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export function tusMetadata(fields: Record<string, string>): string {
  return Object.entries(fields)
    .map(([key, value]) => `${key} ${encodeUtf8Base64(value)}`)
    .join(",");
}

export function tusCreateHeaders(opts: { token: string; byteSize: number; metadata: Record<string, string> }): Record<string, string> {
  return {
    "Tus-Resumable": TUS_VERSION,
    "Upload-Length": String(opts.byteSize),
    "Upload-Metadata": tusMetadata(opts.metadata),
    "x-signature": opts.token,
  };
}

export type TusProgress = { uploaded: number; total: number };

export const UPLOAD_CANNOT_RESUME_NOTICE =
  "This upload cannot resume if it is interrupted. Your clips stay on this phone until it finishes.";
export const UPLOAD_INTERRUPTED_MESSAGE =
  "The upload stopped. Your clips are still on this phone. Try again to continue.";
export const UPLOAD_UNAVAILABLE_MESSAGE =
  "This Story cannot be uploaded right now. Your recording is still on this phone.";

export type TusFailureKind = "interrupted" | "rejected";

/** A full upload is only for a browser that cannot speak TUS. Auth and network failures do not use it. */
export function mayUseFullPut(reason: "browser" | TusFailureKind): boolean {
  return reason === "browser";
}

export function browserCanUseTus(features?: {
  fetch?: unknown;
  blob?: unknown;
  btoa?: unknown;
}): boolean {
  const fetchFn = features ? features.fetch : globalThis.fetch;
  const blob = features ? features.blob : globalThis.Blob;
  const encode = features ? features.btoa : globalThis.btoa;
  return typeof fetchFn === "function" && typeof blob === "function" && typeof encode === "function";
}

/** 401, 403, a bad signature, or a missing endpoint stop the upload. A dropped connection can resume. */
export function classifyTusStatus(status: number): TusFailureKind {
  if (status === 400 || status === 401 || status === 403 || status === 404 || status === 405 || status === 501) {
    return "rejected";
  }
  return "interrupted";
}

const TUS_ATTEMPTS = 3;

async function tusFetch(
  fetchImpl: typeof fetch,
  input: string,
  init: RequestInit,
): Promise<Response | null> {
  try {
    return await fetchImpl(input, init);
  } catch {
    return null;
  }
}

function offsetFrom(headers: Headers, fallback: number, size: number): number {
  const reported = Number(headers.get("Upload-Offset") ?? "");
  if (Number.isFinite(reported) && reported >= 0 && reported <= size) return reported;
  return fallback;
}

/**
 * Uploads one object. A dropped connection continues from the server offset
 * while this page is still open. A closed or suspended browser cannot continue it.
 * A rejected Story Home upload does not switch to a second full upload.
 */
export async function tusUpload(opts: {
  endpoint: string;
  token: string;
  bucket: string;
  objectName: string;
  file: Blob;
  contentType: string;
  onProgress?: (progress: TusProgress) => void;
  fetchImpl?: typeof fetch;
}): Promise<{ ok: true } | { ok: false; status: number; kind: TusFailureKind }> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const created = await tusFetch(fetchImpl, opts.endpoint, {
    method: "POST",
    headers: tusCreateHeaders({
      token: opts.token,
      byteSize: opts.file.size,
      metadata: {
        bucketName: opts.bucket,
        objectName: opts.objectName,
        contentType: opts.contentType,
      },
    }),
  });
  if (!created) return { ok: false, status: 0, kind: "interrupted" };
  if (!created.ok && created.status !== 201) {
    return { ok: false, status: created.status, kind: classifyTusStatus(created.status) };
  }
  const location = created.headers.get("Location");
  if (!location) return { ok: false, status: created.status || 502, kind: "rejected" };
  let offset = 0;
  const head = await tusFetch(fetchImpl, location, {
    method: "HEAD",
    headers: { "Tus-Resumable": TUS_VERSION, "x-signature": opts.token },
  });
  if (head?.ok) offset = offsetFrom(head.headers, 0, opts.file.size);
  let attempt = 0;
  while (offset < opts.file.size) {
    const end = Math.min(opts.file.size, offset + TUS_CHUNK_BYTES);
    const chunk = opts.file.slice(offset, end);
    const patched = await tusFetch(fetchImpl, location, {
      method: "PATCH",
      headers: {
        "Tus-Resumable": TUS_VERSION,
        "Upload-Offset": String(offset),
        "Content-Type": "application/offset+octet-stream",
        "x-signature": opts.token,
      },
      body: chunk,
    });
    if (!patched || !patched.ok) {
      const status = patched?.status ?? 0;
      const kind = patched ? classifyTusStatus(status) : "interrupted";
      if (kind === "rejected") return { ok: false, status, kind };
      attempt += 1;
      if (attempt >= TUS_ATTEMPTS) return { ok: false, status, kind: "interrupted" };
      const again = await tusFetch(fetchImpl, location, {
        method: "HEAD",
        headers: { "Tus-Resumable": TUS_VERSION, "x-signature": opts.token },
      });
      if (again?.ok) offset = offsetFrom(again.headers, offset, opts.file.size);
      continue;
    }
    attempt = 0;
    const next = offsetFrom(patched.headers, end, opts.file.size);
    offset = next > offset ? next : end;
    opts.onProgress?.({ uploaded: offset, total: opts.file.size });
  }
  return { ok: true };
}
