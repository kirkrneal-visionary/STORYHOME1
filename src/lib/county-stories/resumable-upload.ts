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

/**
 * Uploads one object. A dropped connection can continue from the server offset
 * while this page is still open. A closed or suspended browser cannot continue it.
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
}): Promise<{ ok: true } | { ok: false; status: number }> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const created = await fetchImpl(opts.endpoint, {
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
  if (!created.ok && created.status !== 201) {
    return { ok: false, status: created.status };
  }
  const location = created.headers.get("Location");
  if (!location) return { ok: false, status: created.status || 502 };
  let offset = 0;
  const head = await fetchImpl(location, {
    method: "HEAD",
    headers: { "Tus-Resumable": TUS_VERSION, "x-signature": opts.token },
  });
  if (head.ok) {
    const reported = Number(head.headers.get("Upload-Offset") ?? "0");
    if (Number.isFinite(reported) && reported >= 0 && reported <= opts.file.size) offset = reported;
  }
  while (offset < opts.file.size) {
    const end = Math.min(opts.file.size, offset + TUS_CHUNK_BYTES);
    const chunk = opts.file.slice(offset, end);
    const patched = await fetchImpl(location, {
      method: "PATCH",
      headers: {
        "Tus-Resumable": TUS_VERSION,
        "Upload-Offset": String(offset),
        "Content-Type": "application/offset+octet-stream",
        "x-signature": opts.token,
      },
      body: chunk,
    });
    if (!patched.ok) return { ok: false, status: patched.status };
    const next = Number(patched.headers.get("Upload-Offset") ?? end);
    offset = Number.isFinite(next) && next > offset ? next : end;
    opts.onProgress?.({ uploaded: offset, total: opts.file.size });
  }
  return { ok: true };
}
